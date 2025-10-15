import os
from flask import Flask, jsonify
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'a-default-secret-key-for-dev')

@app.route('/')
def index():
    return "<h1>🎓 PESU OAuth2 Provider</h1><p>The service is running. Visit the /transparency endpoint for deployment details.</p>"

@app.route('/transparency')
def transparency():
    commit_sha = os.getenv('VERCEL_GIT_COMMIT_SHA')
    repo_url = os.getenv('VERCEL_GIT_REPO_SLUG')
    owner = os.getenv('VERCEL_GIT_REPO_OWNER')

    if commit_sha and repo_url and owner:
        github_url = f"https://github.com/{owner}/{repo_url}/commit/{commit_sha}"
        return jsonify({
            "status": "ok",
            "message": "This deployment is transparently linked to its source code.",
            "deployment_source": {
                "commit_hash": commit_sha,
                "github_commit_url": github_url
            }
        })
    else:
        return jsonify({
            "status": "dev",
            "message": "This is a local development server. Transparency info is available on Vercel deployments."
        }), 200 # Return 200 OK for dev as well
