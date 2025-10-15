import os
from flask import Flask, jsonify, render_template, request, session, redirect, url_for, flash
from flask import Response
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import io

from pesu_auth_client import login_and_get_profile

load_dotenv()
app = Flask(__name__)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise EnvironmentError("DATABASE_URL is not set in the environment.")

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    pesuprn = db.Column(db.String(80), unique=True, nullable=False, index=True)
    srn = db.Column(db.String(80), unique=True, nullable=True)
    profile_data = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def __repr__(self):
        return f'<User {self.pesuprn}>'


@app.route('/')
def index():
    return "<h1>🎓 PESU OAuth2 Provider</h1><p>The service is running.</p>"


@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if not username or not password:
            flash("Username and password are required.", "danger")
            return render_template('login.html')

        auth_result = login_and_get_profile(username, password)

        if not auth_result.get('success'):
            flash(auth_result.get('error', 'An unknown login error occurred.'), "danger")
            return render_template('login.html')

        user = User.query.filter_by(pesuprn=username).first()
        student_name = auth_result.get('student_name')

        if not user:
            user = User(pesuprn=username, profile_data={'name': student_name})
            db.session.add(user)
        else:
            user.profile_data['name'] = student_name

        db.session.commit()

        session['user_id'] = user.id

        next_url = request.args.get('next') or url_for('index')
        return redirect(next_url)

    return render_template('login.html')


@app.route('/oauth2/authorize')
def authorize():
    if 'user_id' not in session:
        return redirect(url_for('login', next=request.url))

    user = User.query.get(session['user_id'])
    return f"<h1>Consent Screen</h1><p>Hello, {user.profile_data.get('name')}!</p><p>A client app wants to access your data. Do you approve?</p>"


@app.route('/transparency')
def transparency():
    commit_sha = os.getenv('VERCEL_GIT_COMMIT_SHA')
    repo_url = os.getenv('VERCEL_GIT_REPO_SLUG')
    owner = os.getenv('VERCEL_GIT_REPO_OWNER')

    if commit_sha and repo_url and owner:
        github_url = f"https://github.com/{owner}/{repo_url}/commit/{commit_sha}"
        return jsonify({"deployment_source": {"github_commit_url": github_url}})
    else:
        return jsonify({"status": "dev"})

@app.route('/api/badge')
def vercel_badge():
    """Generates a dynamic 'Deployed on Vercel' SVG badge with robust headers."""
    # This is a standard, known-good SVG badge template
    badge_svg_string = '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20" role="img"><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="90" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="37" height="20" fill="#555"/><rect x="37" width="53" height="20" fill="#0070f3"/><rect width="90" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="185" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="270">vercel</text><text x="185" y="140" transform="scale(.1)" fill="#fff" textLength="270">vercel</text><text aria-hidden="true" x="625" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="430">deployed</text><text x="625" y="140" transform="scale(.1)" fill="#fff" textLength="430">deployed</text></g></svg>'

    # Encode the string to bytes to calculate the content length
    svg_bytes = badge_svg_string.encode('utf-8')

    # Create the response object
    response = Response(svg_bytes, mimetype='image/svg+xml')

    # Set explicit, robust headers that proxies respect
    response.headers['Content-Length'] = len(svg_bytes)
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'

    return response
