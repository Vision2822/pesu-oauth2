import os
import time
from functools import wraps
from secrets import token_urlsafe
from urllib.parse import urlparse
import logging
from datetime import timedelta

from flask import (
    Flask, Response, jsonify, render_template, request, session, redirect, url_for, flash
)
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import text

# --- SECURITY & PRODUCTION ADDITIONS ---
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
from flask_talisman import Talisman

from authlib.integrations.flask_oauth2 import AuthorizationServer, ResourceProtector, current_token
from authlib.integrations.sqla_oauth2 import (
    OAuth2ClientMixin,
    OAuth2AuthorizationCodeMixin,
    OAuth2TokenMixin,
)
from authlib.oauth2.rfc6750 import BearerTokenValidator
from authlib.oauth2.rfc7636 import CodeChallenge
from authlib.oauth2.rfc6749.grants import (
    AuthorizationCodeGrant as _AuthorizationCodeGrant,
    RefreshTokenGrant as _RefreshTokenGrant,
)
from authlib.oauth2.rfc6749 import InvalidClientError

from pesu_auth_client import login_and_get_profile

# Basic logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- SUPPRESS TLS HANDSHAKE ERRORS IN DEVELOPMENT ---
class NoTLSFilter(logging.Filter):
    """Filter out TLS handshake errors when browsers try HTTPS on HTTP server"""
    def filter(self, record):
        message = record.getMessage()
        if 'code 400' in message and ('Bad HTTP/0.9 request type' in message or
                                       'Bad request version' in message):
            return False
        return True

werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.addFilter(NoTLSFilter())

load_dotenv()
app = Flask(__name__)

# --- ENVIRONMENT DETECTION ---
ENV = os.getenv('FLASK_ENV', 'production')
IS_DEVELOPMENT = ENV == 'development'

# --- CRITICAL FIX: Environment Variable Validation ---
SECRET_KEY = os.getenv('SECRET_KEY')
DATABASE_URL = os.getenv("DATABASE_URL")
if not SECRET_KEY or not DATABASE_URL:
    raise EnvironmentError("FATAL: SECRET_KEY and DATABASE_URL must be set in the environment.")

# --- CRITICAL FIX: Secure Session Cookie Configuration ---
app.config.update(
    SQLALCHEMY_DATABASE_URI=DATABASE_URL,
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SQLALCHEMY_ENGINE_OPTIONS={'pool_pre_ping': True, 'pool_recycle': 300},
    SECRET_KEY=SECRET_KEY,
    SESSION_COOKIE_SECURE=not IS_DEVELOPMENT,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=24),
    WTF_CSRF_TIME_LIMIT=None,
)

# --- SECURITY INITIALIZATIONS ---
db = SQLAlchemy(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)
csrf = CSRFProtect(app)
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

if not IS_DEVELOPMENT:
    Talisman(app, content_security_policy=None, force_https=True)
    logger.info("Running in PRODUCTION mode - HTTPS enforced")
else:
    logger.warning("Running in DEVELOPMENT mode - HTTPS not enforced")

AVAILABLE_SCOPES = {
    'profile:basic': 'Read your basic identity (Name, PRN, SRN).',
    'profile:academic': 'Read your academic details (Program, Branch, Semester, Section, Campus).',
    'profile:photo': 'Read your profile photo.',
    'profile:contact': 'Read your contact information (Email, Phone Number).',
}

# Field-level mapping for granular consent
SCOPE_FIELDS = {
    'profile:basic': {
        'name': 'Full Name',
        'prn': 'PRN (PES Registration Number)',
        'srn': 'SRN (Student Registration Number)',
    },
    'profile:academic': {
        'program': 'Program (e.g., B.Tech, M.Tech)',
        'branch': 'Branch/Department',
        'semester': 'Current Semester',
        'section': 'Section',
        'campus': 'Campus Name',
        'campus_code': 'Campus Code',
    },
    'profile:photo': {
        'photo_base64': 'Profile Photo',
    },
    'profile:contact': {
        'email': 'Email Address',
        'phone': 'Phone Number',
    },
}

# --- Database Models ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pesuprn = db.Column(db.String(80), unique=True, nullable=False, index=True)
    profile_data = db.Column(db.JSON, nullable=True)

    def get_user_id(self):
        return self.id

class OAuth2Client(db.Model, OAuth2ClientMixin):
    __tablename__ = 'oauth2_client'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    user = db.relationship('User')
    client_secret = db.Column(db.String(255), nullable=True)

    def check_client_secret(self, client_secret):
        if self.client_secret is None:
            return False
        return bcrypt.check_password_hash(self.client_secret, client_secret)

class OAuth2AuthorizationCode(db.Model, OAuth2AuthorizationCodeMixin):
    __tablename__ = 'oauth2_authorization_code'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    user = db.relationship('User')
    granted_fields = db.Column(db.JSON, nullable=True)

class OAuth2Token(db.Model, OAuth2TokenMixin):
    __tablename__ = 'oauth2_token'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    user = db.relationship('User')
    granted_fields = db.Column(db.JSON, nullable=True)

    def is_refresh_token_active(self):
        if self.revoked:
            return False
        expires_at = self.issued_at + self.expires_in * 2
        return expires_at >= time.time()

# --- Authlib Helper Functions ---
def get_current_user():
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    return None

def query_client(client_id):
    return OAuth2Client.query.filter_by(client_id=client_id).first()

def save_token(token, request):
    try:
        user_id = request.user.get_user_id() if request.user else request.client.user_id

        # Get granted fields from authorization code
        granted_fields = {}
        if hasattr(request, 'credential') and hasattr(request.credential, 'granted_fields'):
            granted_fields = request.credential.granted_fields or {}

        item = OAuth2Token(
            client_id=request.client.client_id,
            user_id=user_id,
            granted_fields=granted_fields,
            **token
        )
        db.session.add(item)
        db.session.commit()
        logger.info(f"Token issued for user_id={user_id}, client_id={request.client.client_id}")
    except Exception as e:
        logger.error(f"Failed to save token: {e}")
        db.session.rollback()
        raise

server = AuthorizationServer(app, query_client=query_client, save_token=save_token)

# --- Authlib Grant Classes ---
class AuthorizationCodeGrant(_AuthorizationCodeGrant):
    TOKEN_ENDPOINT_AUTH_METHODS = ['client_secret_post', 'none']

    def authenticate_token_endpoint_client(self):
        client_id = self.request.data.get('client_id')

        if not client_id:
            logger.error("Missing client_id in token request")
            raise InvalidClientError('Missing client_id')

        client = query_client(client_id)

        if not client:
            logger.error(f"Client not found: {client_id}")
            raise InvalidClientError('Invalid client_id')

        self.request.client = client
        client_secret = self.request.data.get('client_secret')

        if client.token_endpoint_auth_method == 'none':
            logger.info(f"Public client authenticated: {client.client_id}")
            return client

        if not client_secret:
            logger.warning(f"Missing client_secret for confidential client: {client.client_id}")
            raise InvalidClientError('Missing client_secret')

        if client.check_client_secret(client_secret):
            logger.info(f"Confidential client authenticated: {client.client_id}")
            return client

        logger.warning(f"Invalid client_secret for: {client.client_id}")
        raise InvalidClientError('Invalid client credentials')

    def save_authorization_code(self, code, request):
        try:
            granted_fields = session.get('granted_fields', {})

            auth_code = OAuth2AuthorizationCode(
                code=code,
                client_id=request.client.client_id,
                redirect_uri=request.redirect_uri,
                scope=request.scope,
                user_id=request.user.id,
                code_challenge=request.data.get('code_challenge'),
                code_challenge_method=request.data.get('code_challenge_method'),
                granted_fields=granted_fields,
            )
            db.session.add(auth_code)
            db.session.commit()

            session.pop('granted_fields', None)

            logger.info(f"Authorization code saved for user_id={request.user.id} with granted fields")
            return auth_code
        except Exception as e:
            logger.error(f"Failed to save authorization code: {e}")
            db.session.rollback()
            raise

    def query_authorization_code(self, code, client):
        return OAuth2AuthorizationCode.query.filter_by(
            code=code,
            client_id=client.client_id
        ).first()

    def delete_authorization_code(self, authorization_code):
        try:
            db.session.delete(authorization_code)
            db.session.commit()
        except Exception as e:
            logger.error(f"Failed to delete authorization code: {e}")
            db.session.rollback()
            raise

    def authenticate_user(self, authorization_code):
        self.request.credential = authorization_code
        return User.query.get(authorization_code.user_id)

class RefreshTokenGrant(_RefreshTokenGrant):
    TOKEN_ENDPOINT_AUTH_METHODS = ['client_secret_post', 'none']

    def authenticate_refresh_token(self, refresh_token):
        token = OAuth2Token.query.filter_by(refresh_token=refresh_token).first()
        if token and token.is_refresh_token_active():
            return token
        return None

    def authenticate_user(self, credential):
        return User.query.get(credential.user_id)

    def revoke_old_credential(self, credential):
        try:
            credential.revoked = True
            db.session.add(credential)
            db.session.commit()
            logger.info(f"Refresh token revoked for token_id={credential.id}")
        except Exception as e:
            logger.error(f"Failed to revoke refresh token: {e}")
            db.session.rollback()
            raise

    def authenticate_token_endpoint_client(self):
        client_id = self.request.data.get('client_id')

        if not client_id:
            raise InvalidClientError('Missing client_id')

        client = query_client(client_id)

        if not client:
            raise InvalidClientError('Invalid client_id')

        self.request.client = client
        client_secret = self.request.data.get('client_secret')

        if client.token_endpoint_auth_method == 'none':
            logger.info(f"Public client refresh: {client.client_id}")
            return client

        if client_secret and client.check_client_secret(client_secret):
            logger.info(f"Confidential client refresh: {client.client_id}")
            return client

        raise InvalidClientError('Invalid client credentials')

server.register_grant(AuthorizationCodeGrant, [CodeChallenge(required=True)])
server.register_grant(RefreshTokenGrant)

class MyTokenValidator(BearerTokenValidator):
    def authenticate_token(self, token_string):
        return OAuth2Token.query.filter_by(access_token=token_string).first()

require_oauth = ResourceProtector()
require_oauth.register_token_validator(MyTokenValidator())

ADMIN_PRNS = set(prn.strip() for prn in os.getenv("ADMIN_USERS", "").split(',') if prn)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user or user.pesuprn not in ADMIN_PRNS:
            flash("You do not have permission to access this page.", "warning")
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# --- Standard Routes ---
@app.route('/')
def index():
    user = get_current_user()
    return render_template('index.html', user=user)

@app.route('/docs')
def docs():
    return render_template('docs.html', available_scopes=AVAILABLE_SCOPES)

@app.route('/tester')
def tester():
    default_client_id = os.getenv('TESTER_CLIENT_ID', '')
    return render_template('tester.html',
                         client_id=default_client_id,
                         available_scopes=AVAILABLE_SCOPES)
@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/transparency')
def transparency():
    commit_sha = os.getenv('VERCEL_GIT_COMMIT_SHA')
    repo_slug = os.getenv('VERCEL_GIT_REPO_SLUG')
    owner = os.getenv('VERCEL_GIT_REPO_OWNER')
    commit_url, repo_url = None, None
    if owner and repo_slug:
        repo_url = f"https://github.com/{owner}/{repo_slug}"
        if commit_sha:
            commit_url = f"{repo_url}/commit/{commit_sha}"
    return render_template('transparency.html',
                         commit_url=commit_url,
                         repo_url=repo_url)

# --- Authentication Routes ---
@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        if not username or not password:
            flash("Username and password are required.", "danger")
            return render_template('login.html')

        try:
            auth_result = login_and_get_profile(username, password)

            if not auth_result.get('success'):
                logger.warning(f"Failed login attempt for user: {username}")
                flash(auth_result.get('error', 'Login failed.'), "danger")
                return render_template('login.html')

            user = User.query.filter_by(pesuprn=username).first()
            profile_data = auth_result.get("profile", {})

            if not user:
                user = User(pesuprn=username, profile_data=profile_data)
                db.session.add(user)
                logger.info(f"New user created: {username}")
            else:
                user.profile_data = {**(user.profile_data or {}), **profile_data}
                flag_modified(user, "profile_data")
                logger.info(f"User profile updated: {username}")

            db.session.commit()

            session.clear()
            session['user_id'] = user.id
            session.permanent = True

            next_url = request.args.get('next')

            if next_url:
                from urllib.parse import urlparse, urljoin

                next_url_absolute = urljoin(request.host_url, next_url)
                next_parsed = urlparse(next_url_absolute)
                current_parsed = urlparse(request.host_url)

                if next_parsed.netloc == current_parsed.netloc:
                    logger.info(f"Redirecting to: {next_url}")
                    return redirect(next_url)
                else:
                    logger.warning(f"Rejected external redirect to: {next_url}")
                    next_url = None

            return redirect(next_url or url_for('index'))

        except Exception as e:
            logger.error(f"Login error for {username}: {e}")
            db.session.rollback()
            flash("An error occurred during login. Please try again.", "danger")
            return render_template('login.html')

    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash("You have been logged out successfully.", "info")
    return redirect(url_for('index'))

# --- Admin Routes ---
@app.route('/admin', methods=['GET', 'POST'])
@admin_required
def admin():
    if request.method == 'POST':
        try:
            client_name = request.form.get('client_name', '').strip()
            is_public = request.form.get('is_public') == 'true'

            if not client_name:
                flash("Client name is required.", "danger")
                return redirect(url_for('admin'))

            redirect_uris_raw = request.form.get('redirect_uris', '').split()
            valid_uris = []
            for uri in redirect_uris_raw:
                parsed = urlparse(uri)
                if parsed.scheme in ['http', 'https']:
                    valid_uris.append(uri)
                else:
                    flash(f"Invalid redirect URI skipped: {uri}", "warning")

            if not valid_uris:
                flash("You must provide at least one valid HTTP/HTTPS redirect URI.", "danger")
                return redirect(url_for('admin'))

            client_id = token_urlsafe(24)

            if is_public:
                client = OAuth2Client(
                    client_id=client_id,
                    client_secret=None,
                    user_id=get_current_user().id
                )
                client_metadata = {
                    "client_name": client_name,
                    "redirect_uris": valid_uris,
                    "scope": ' '.join(request.form.getlist('scope')),
                    "token_endpoint_auth_method": 'none',
                    "grant_types": ["authorization_code", "refresh_token"],
                    "response_types": ["code"],
                }
                flash("Public Client Created Successfully!", "success")
                flash(f"Client ID: {client_id}", "info")
                flash("This is a public client (no secret). PKCE is required.", "info")
                logger.info(f"Public client created: {client_id}")
            else:
                client_secret_plain = token_urlsafe(48)
                hashed_secret = bcrypt.generate_password_hash(client_secret_plain).decode('utf-8')
                client = OAuth2Client(
                    client_id=client_id,
                    client_secret=hashed_secret,
                    user_id=get_current_user().id
                )
                client_metadata = {
                    "client_name": client_name,
                    "redirect_uris": valid_uris,
                    "scope": ' '.join(request.form.getlist('scope')),
                    "token_endpoint_auth_method": 'client_secret_post',
                    "grant_types": ["authorization_code", "refresh_token"],
                    "response_types": ["code"],
                }
                flash("Confidential Client Created Successfully!", "success")
                flash(f"Client ID: {client_id}", "info")
                flash(f"Client Secret: {client_secret_plain} (Copy this now, it will not be shown again)", "warning")
                logger.info(f"Confidential client created: {client_id}")

            client.set_client_metadata(client_metadata)
            db.session.add(client)
            db.session.commit()

            return redirect(url_for('admin'))

        except Exception as e:
            logger.error(f"Error creating client: {e}")
            db.session.rollback()
            flash("An error occurred while creating the client.", "danger")
            return redirect(url_for('admin'))

    clients = OAuth2Client.query.filter_by(user_id=get_current_user().id).all()
    return render_template('admin.html', clients=clients, available_scopes=AVAILABLE_SCOPES)

@app.route('/admin/delete/<int:client_id>', methods=['POST'])
@admin_required
def delete_client(client_id):
    try:
        client = OAuth2Client.query.filter_by(
            id=client_id,
            user_id=get_current_user().id
        ).first_or_404()

        client_name = client.client_name
        db.session.delete(client)
        db.session.commit()

        flash(f"Client '{client_name}' has been deleted.", "success")
        logger.info(f"Client deleted: {client_name} (id={client_id})")
    except Exception as e:
        logger.error(f"Error deleting client {client_id}: {e}")
        db.session.rollback()
        flash("An error occurred while deleting the client.", "danger")

    return redirect(url_for('admin'))

# --- OAuth2 Routes ---
@app.route('/oauth2/authorize', methods=['GET', 'POST'])
def authorize():
    user = get_current_user()
    if not user:
        return redirect(url_for('login', next=request.url))

    if request.method == 'GET':
        try:
            grant = server.get_consent_grant(end_user=user)
            return render_template('consent.html',
                                 grant=grant,
                                 user=user,
                                 available_scopes=AVAILABLE_SCOPES,
                                 scope_fields=SCOPE_FIELDS)
        except Exception as e:
            logger.error(f"Authorization error: {e}")
            flash(f"Authorization Error: {e}", "danger")
            return render_template('error.html', error=e), 400

    if request.form.get('confirm'):
        grant_user = user

        granted_fields_list = request.form.getlist('granted_fields')
        granted_fields = {}

        logger.info(f"Raw granted_fields from form: {granted_fields_list}")

        # NEW: Get the originally requested scopes to validate against
        try:
            grant = server.get_consent_grant(end_user=user)
            requested_scopes = grant.request.scope.split()
        except:
            requested_scopes = []

        for field_entry in granted_fields_list:
            if ':' in field_entry:
                scope_parts = field_entry.rsplit(':', 1)
                if len(scope_parts) == 2:
                    full_scope = scope_parts[0]
                    field_name = scope_parts[1]

                    # NEW: Only add if the scope was actually requested
                    if full_scope in requested_scopes:
                        if full_scope not in granted_fields:
                            granted_fields[full_scope] = []
                        granted_fields[full_scope].append(field_name)
                    else:
                        logger.warning(f"Ignoring field for non-requested scope: {full_scope}:{field_name}")

        logger.info(f"Processed granted_fields: {granted_fields}")
        logger.info(f"User {user.pesuprn} authorized client with fields: {granted_fields}")

        session['granted_fields'] = granted_fields

    else:
        grant_user = None
        logger.info(f"User {user.pesuprn} denied authorization")

    return server.create_authorization_response(grant_user=grant_user)

@app.route('/oauth2/token', methods=['POST'])
@limiter.exempt
@csrf.exempt
def issue_token():
    try:
        return server.create_token_response()
    except Exception as e:
        logger.error(f"Token issuance error: {e}")
        return jsonify(error="server_error", error_description=str(e)), 500

# --- API Routes ---
@app.route('/api/v1/user')
@require_oauth()
def user_info():
    user = current_token.user
    token_scopes = current_token.get_scope().split()
    granted_fields = current_token.granted_fields or {}
    profile = user.profile_data or {}
    response_data = {}

    logger.info(f"Token scopes: {token_scopes}")
    logger.info(f"Granted fields: {granted_fields}")

    def is_field_granted(scope, field):
        if granted_fields is None or not isinstance(granted_fields, dict):
            logger.warning(f"No granted_fields in token, denying access to {scope}:{field}")
            return False

        if scope not in granted_fields:
            return False

        return field in granted_fields.get(scope, [])

    if 'profile:basic' in token_scopes:
        if is_field_granted('profile:basic', 'name'):
            response_data['name'] = profile.get('name')
        if is_field_granted('profile:basic', 'prn'):
            response_data['prn'] = profile.get('prn')
        if is_field_granted('profile:basic', 'srn'):
            response_data['srn'] = profile.get('srn')

    if 'profile:academic' in token_scopes:
        if is_field_granted('profile:academic', 'program'):
            response_data['program'] = profile.get('program')
        if is_field_granted('profile:academic', 'branch'):
            response_data['branch'] = profile.get('branch')
        if is_field_granted('profile:academic', 'semester'):
            response_data['semester'] = profile.get('semester')
        if is_field_granted('profile:academic', 'section'):
            response_data['section'] = profile.get('section')
        if is_field_granted('profile:academic', 'campus'):
            response_data['campus'] = profile.get('campus')
        if is_field_granted('profile:academic', 'campus_code'):
            response_data['campus_code'] = profile.get('campus_code')

    if 'profile:photo' in token_scopes:
        if is_field_granted('profile:photo', 'photo_base64'):
            response_data['photo_base64'] = profile.get('photo_base64')
        else:
            logger.info("Photo not granted, skipping")

    if 'profile:contact' in token_scopes:
        if is_field_granted('profile:contact', 'email'):
            response_data['email'] = profile.get('email')
        if is_field_granted('profile:contact', 'phone'):
            response_data['phone'] = profile.get('phone')

    logger.info(f"Response data keys: {list(response_data.keys())}")

    if not response_data:
        return jsonify(
            error="insufficient_scope",
            message="No data available with the granted permissions."
        ), 403

    return jsonify(response_data)

# --- Utility Routes ---
@app.route('/api/badge')
def vercel_badge():
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20" role="img"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="90" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="37" height="20" fill="#555"/><rect x="37" width="53" height="20" fill="#0070f3"/><rect width="90" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" text-rendering="geometricPrecision" font-size="110"><text x="185" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="270">vercel</text><text x="185" y="140" transform="scale(.1)" fill="#fff" textLength="270">vercel</text><text x="625" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">deployed</text><text x="625" y="140" transform="scale(.1)" fill="#fff" textLength="430">deployed</text></g></svg>'
    return Response(svg, mimetype='image/svg+xml', headers={'Cache-Control': 'no-cache'})

@app.route('/health')
def health():
    try:
        db.session.execute(text('SELECT 1'))  # Wrap in text()
        return jsonify(status='healthy', environment=ENV), 200
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify(status='unhealthy', error=str(e)), 503

@app.errorhandler(404)
def not_found(e):
    return render_template('error.html', error="Page not found"), 404

@app.errorhandler(500)
def server_error(e):
    logger.error(f"Server error: {e}")
    return render_template('error.html', error="Internal server error"), 500

if __name__ == '__main__':
    app.run(debug=IS_DEVELOPMENT)
