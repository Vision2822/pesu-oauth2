import os
import time
from functools import wraps
from secrets import token_urlsafe
import requests
import re

from flask import (
    Flask, Response, jsonify, render_template, request, session, redirect, url_for, flash
)
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv

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

from pesu_auth_client import login_and_get_profile

load_dotenv()
app = Flask(__name__)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise EnvironmentError("DATABASE_URL is not set in the environment.")

app.config.update(
    SQLALCHEMY_DATABASE_URI=db_url,
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    SECRET_KEY=os.getenv('SECRET_KEY')
)

db = SQLAlchemy(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)

AVAILABLE_SCOPES = {
    'profile:basic': 'Read your basic identity (Name, PRN, SRN).',
    'profile:academic': 'Read your academic details (Program, Branch, Semester, Section, Campus).',
    'profile:photo': 'Read your profile photo.',
    'profile:contact': 'Read your contact information (Email, Phone Number).',
}

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

    def check_client_secret(self, client_secret):
        return bcrypt.check_password_hash(self.client_secret, client_secret)

class OAuth2AuthorizationCode(db.Model, OAuth2AuthorizationCodeMixin):
    __tablename__ = 'oauth2_authorization_code'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    user = db.relationship('User')

class OAuth2Token(db.Model, OAuth2TokenMixin):
    __tablename__ = 'oauth2_token'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'))
    user = db.relationship('User')
    def is_refresh_token_active(self):
        if self.revoked:
            return False
        expires_at = self.issued_at + self.expires_in * 2
        return expires_at >= time.time()

def get_current_user():
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    return None

def query_client(client_id):
    return OAuth2Client.query.filter_by(client_id=client_id).first()

def save_token(token, request):
    user_id = request.user.get_user_id() if request.user else request.client.user_id
    item = OAuth2Token(client_id=request.client.client_id, user_id=user_id, **token)
    db.session.add(item)
    db.session.commit()

server = AuthorizationServer(app, query_client=query_client, save_token=save_token)

class AuthorizationCodeGrant(_AuthorizationCodeGrant):
    def save_authorization_code(self, code, request):
        auth_code = OAuth2AuthorizationCode(
            code=code, client_id=request.client.client_id, redirect_uri=request.redirect_uri,
            scope=request.scope, user_id=request.user.id,
            code_challenge=request.data.get('code_challenge'),
            code_challenge_method=request.data.get('code_challenge_method'),
        )
        db.session.add(auth_code)
        db.session.commit()
        return auth_code

    def query_authorization_code(self, code, client):
        return OAuth2AuthorizationCode.query.filter_by(code=code, client_id=client.client_id).first()
    def delete_authorization_code(self, authorization_code):
        db.session.delete(authorization_code)
        db.session.commit()
    def authenticate_user(self, authorization_code):
        return User.query.get(authorization_code.user_id)

class RefreshTokenGrant(_RefreshTokenGrant):
    def authenticate_refresh_token(self, refresh_token):
        token = OAuth2Token.query.filter_by(refresh_token=refresh_token).first()
        if token and token.is_refresh_token_active():
            return token
    def authenticate_user(self, credential):
        return User.query.get(credential.user_id)
    def revoke_old_credential(self, credential):
        credential.revoked = True
        db.session.add(credential)
        db.session.commit()

server.register_grant(AuthorizationCodeGrant, [CodeChallenge(required=True)])
server.register_grant(RefreshTokenGrant)

class MyTokenValidator(BearerTokenValidator):
    def authenticate_token(self, token_string):
        return OAuth2Token.query.filter_by(access_token=token_string).first()

require_oauth = ResourceProtector()
require_oauth.register_token_validator(MyTokenValidator())

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin_prns = [admin.strip() for admin in os.getenv("ADMIN_USERS", "").split(',') if admin]
        user = get_current_user()
        if not user or user.pesuprn not in admin_prns:
            flash("You do not have permission to access this page.", "warning")
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/docs')
def docs():
    return render_template('docs.html', available_scopes=AVAILABLE_SCOPES)

@app.route('/tester')
def tester():
    default_client_id = os.getenv('TESTER_CLIENT_ID', '')
    default_client_secret = os.getenv('TESTER_CLIENT_SECRET', '')
    return render_template('tester.html', client_id=default_client_id, client_secret=default_client_secret)

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
    return render_template('transparency.html', commit_url=commit_url, repo_url=repo_url)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session: return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        auth_result = login_and_get_profile(username, password)
        if not auth_result.get('success'):
            flash(auth_result.get('error', 'Login failed.'), "danger")
            return render_template('login.html')
        user = User.query.filter_by(pesuprn=username).first()
        profile_data = auth_result.get("profile", {})
        if not user:
            user = User(pesuprn=username, profile_data=profile_data)
            db.session.add(user)
        else:
            user.profile_data.update(profile_data)
        db.session.commit()
        session['user_id'] = user.id
        return redirect(request.args.get('next') or url_for('index'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

@app.route('/admin', methods=['GET', 'POST'])
@admin_required
def admin():
    if request.method == 'POST':
        client_id = token_urlsafe(24)
        client_secret_plain = token_urlsafe(48)
        hashed_secret = bcrypt.generate_password_hash(client_secret_plain).decode('utf-8')
        client = OAuth2Client(client_id=client_id, client_secret=hashed_secret)
        client_metadata = {
            "client_name": request.form.get('client_name'),
            "redirect_uris": request.form.get('redirect_uris').split(),
            "scope": ' '.join(request.form.getlist('scope')),
            "token_endpoint_auth_method": 'client_secret_post',
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code"],
        }
        client.set_client_metadata(client_metadata)
        db.session.add(client)
        db.session.commit()
        flash("Client Created Successfully!", "success")
        flash(f"Client ID: {client_id}", "info")
        flash(f"Client Secret: {client_secret_plain} (Copy this now, it will not be shown again)", "warning")
        return redirect(url_for('admin'))
    clients = OAuth2Client.query.all()
    return render_template('admin.html', clients=clients, available_scopes=AVAILABLE_SCOPES)

@app.route('/admin/delete/<int:client_id>', methods=['POST'])
@admin_required
def delete_client(client_id):
    client = OAuth2Client.query.get_or_404(client_id)
    db.session.delete(client)
    db.session.commit()
    flash(f"Client '{client.client_name}' has been deleted.", "success")
    return redirect(url_for('admin'))

@app.route('/oauth2/authorize', methods=['GET', 'POST'])
def authorize():
    user = get_current_user()
    if not user:
        return redirect(url_for('login', next=request.url))
    if request.method == 'GET':
        try:
            grant = server.get_consent_grant(end_user=user)
            return render_template('consent.html', grant=grant, user=user, available_scopes=AVAILABLE_SCOPES)
        except Exception as e:
            flash(f"Authorization Error: {e}", "danger")
            return render_template('error.html', error=e)
    if request.form.get('confirm'):
        grant_user = user
    else:
        grant_user = None
    return server.create_authorization_response(grant_user=grant_user)

@app.route('/oauth2/token', methods=['POST'])
def issue_token():
    return server.create_token_response()

@app.route('/proxy/token', methods=['POST'])
def proxy_token():
    try:
        data = request.json
        token_url = url_for('issue_token', _external=True)
        payload = {
            'grant_type': 'authorization_code',
            'code': data.get('code'),
            'redirect_uri': data.get('redirect_uri'),
            'code_verifier': data.get('code_verifier'),
            'client_id': data.get('client_id'),
            'client_secret': data.get('client_secret'),
        }
        response = requests.post(token_url, data=payload)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.HTTPError as e:
        return jsonify(e.response.json()), e.response.status_code
    except Exception as e:
        return jsonify(error="An unexpected error occurred", details=str(e)), 500

@app.route('/api/v1/user')
@require_oauth()
def user_info():
    user = current_token.user
    token_scopes = current_token.get_scope().split()
    profile = user.profile_data or {}
    response_data = {}

    if 'profile:basic' in token_scopes:
        response_data.update({
            'name': profile.get('name'),
            'prn': profile.get('prn'),
            'srn': profile.get('srn'),
        })

    if 'profile:academic' in token_scopes:
        response_data.update({
            'program': profile.get('program'),
            'branch': profile.get('branch'),
            'semester': profile.get('semester'),
            'section': profile.get('section'),
            'campus': profile.get('campus'),
            'campus_code': profile.get('campus_code'),
        })

    if 'profile:photo' in token_scopes:
        response_data.update({'photo_base64': profile.get('photo_base64')})

    if 'profile:contact' in token_scopes:
        response_data.update({
            'email': profile.get('email'),
            'phone': profile.get('phone'),
        })

    if not response_data:
        return jsonify(error="insufficient_scope", message="The access token does not have the required scopes to access any data."), 403

    return jsonify(response_data)

@app.route('/api/badge')
def vercel_badge():
    svg = '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20" role="img"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="90" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="37" height="20" fill="#555"/><rect x="37" width="53" height="20" fill="#0070f3"/><rect width="90" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" text-rendering="geometricPrecision" font-size="110"><text x="185" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="270">vercel</text><text x="185" y="140" transform="scale(.1)" fill="#fff" textLength="270">vercel</text><text x="625" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">deployed</text><text x="625" y="140" transform="scale(.1)" fill="#fff" textLength="430">deployed</text></g></svg>'
    return Response(svg, mimetype='image/svg+xml', headers={'Cache-Control': 'no-cache'})
