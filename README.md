# 🔐 PESU OAuth2 Provider

[![Vercel Deployment](https://pesu-oauth2.vercel.app/api/badge)](https://pesu-oauth2.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A **production-ready**, **privacy-focused** OAuth2 authorization server for PESU student authentication. Built with Flask, secured with industry-standard practices, and deployed on Vercel.

## ✨ Features

- 🔒 **OAuth 2.0 Authorization Code Flow with PKCE** (RFC 7636)
- 🎯 **Granular Field-Level Consent** - Users control exactly what data to share
- 🔓 **Public & Confidential Client Support** - For SPAs, mobile apps, and backend services
- 🛡️ **Production Security** - CSRF protection, rate limiting, HTTPS enforcement
- 🎨 **Interactive API Tester** - Test the full OAuth flow without writing code
- 📊 **Transparent Deployment** - View exact code running in production
- 🔄 **Refresh Token Support** - Long-lived sessions without re-authentication
- 📝 **Comprehensive Logging** - Full audit trail of authentication events

---

## 🚀 Quick Start

### For Application Developers

1. **Register Your Application**
   - Visit the [Admin Panel](https://pesu-oauth2.vercel.app/admin)
   - Login with your PESU credentials
   - Create a new OAuth client (public or confidential)

2. **Choose Your Client Type**
   - **Public Client**: For JavaScript SPAs, mobile apps (no secret, PKCE required)
   - **Confidential Client**: For backend applications (secret + PKCE recommended)

3. **Integrate OAuth Flow**
   - See [Documentation](https://pesu-oauth2.vercel.app/docs) for detailed examples
   - Try the [Interactive Tester](https://pesu-oauth2.vercel.app/tester) to understand the flow

---

## 📚 API Documentation

### Base URL
```
Production: https://pesu-oauth2.vercel.app
Development: http://127.0.0.1:5000
```

### 1️⃣ Authorization Endpoint

Initiates the OAuth flow by redirecting users to login and consent.

```http
GET /oauth2/authorize
```

**Required Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `response_type` | string | Must be `code` |
| `client_id` | string | Your application's client ID |
| `redirect_uri` | string | Whitelisted callback URL |
| `scope` | string | Space-separated scopes (e.g., `profile:basic profile:contact`) |
| `code_challenge` | string | Base64URL-encoded SHA256 hash of code_verifier (PKCE) |
| `code_challenge_method` | string | Must be `S256` |
| `state` | string | Random string for CSRF protection (recommended) |

**Example:**
```javascript
const authUrl = `https://pesu-oauth2.vercel.app/oauth2/authorize?` +
  `response_type=code&` +
  `client_id=YOUR_CLIENT_ID&` +
  `redirect_uri=https://your-app.com/callback&` +
  `scope=profile:basic profile:contact&` +
  `code_challenge=GENERATED_CHALLENGE&` +
  `code_challenge_method=S256&` +
  `state=RANDOM_STATE`;

window.location.href = authUrl;
```

---

### 2️⃣ Token Endpoint

Exchanges authorization code for access token.

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
```

**For Public Clients (JavaScript/Mobile):**
```http
grant_type=authorization_code
&code=AUTHORIZATION_CODE
&redirect_uri=https://your-app.com/callback
&client_id=YOUR_CLIENT_ID
&code_verifier=ORIGINAL_VERIFIER
```

**For Confidential Clients (Backend):**
```http
grant_type=authorization_code
&code=AUTHORIZATION_CODE
&redirect_uri=https://your-app.com/callback
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&code_verifier=ORIGINAL_VERIFIER
```

**Success Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200a1b2c3d4...",
  "scope": "profile:basic profile:contact"
}
```

---

### 3️⃣ Refresh Token

Get a new access token without user interaction.

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=YOUR_REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET (if confidential)
```

---

### 4️⃣ User Info Endpoint

Retrieve authenticated user's profile data.

```http
GET /api/v1/user
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response (varies by granted fields):**
```json
{
  "name": "John Doe",
  "prn": "PES1UG21CS001",
  "srn": "PES1202100001",
  "email": "john.doe@pesu.pes.edu",
  "phone": "9876543210",
  "program": "B.Tech",
  "branch": "Computer Science and Engineering",
  "semester": "5",
  "section": "A",
  "campus": "RR Campus",
  "campus_code": "RR"
}
```

**Note:** Only fields explicitly granted during consent are returned.

---

## 🎯 Available Scopes

| Scope | Fields Included | Description |
|-------|----------------|-------------|
| `profile:basic` | `name`, `prn`, `srn` | Basic identity information |
| `profile:academic` | `program`, `branch`, `semester`, `section`, `campus`, `campus_code` | Academic details |
| `profile:photo` | `photo_base64` | Profile photo (Base64 encoded) |
| `profile:contact` | `email`, `phone` | Contact information |

### Granular Consent

Users can **individually select** which fields to share within each scope:
- ✅ Share email but not phone
- ✅ Share name and PRN but not SRN
- ✅ Complete control over privacy

---

## 🔐 Generating PKCE Codes

### JavaScript (Browser/React/Vue/Angular)
```javascript
// Generate random verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

// Generate challenge from verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(digest);
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Usage
const verifier = generateCodeVerifier();
const challenge = await generateCodeChallenge(verifier);
sessionStorage.setItem('code_verifier', verifier);
```

### Python (Backend)
```python
import hashlib
import base64
import secrets

def generate_pkce_codes():
    # Generate verifier
    code_verifier = base64.urlsafe_b64encode(
        secrets.token_bytes(32)
    ).decode('utf-8').rstrip('=')
    
    # Generate challenge
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode('utf-8').rstrip('=')
    
    return code_verifier, code_challenge
```

---

## 🏗️ Client Types Explained

### 🔓 Public Clients
**Use for:** Single-Page Apps, Mobile Apps, Desktop Apps

**Characteristics:**
- Cannot securely store secrets (runs in user's environment)
- Must use PKCE for security
- No `client_secret` parameter in token exchange

**Example:** React SPA, Flutter mobile app

---

### 🔒 Confidential Clients
**Use for:** Backend Web Apps, Server-to-Server

**Characteristics:**
- Can securely store secrets on server
- Uses `client_secret` + PKCE for maximum security
- Secrets never exposed to end users

**Example:** Django backend, Express.js server

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|---------------|
| **PKCE** | Required for all clients (RFC 7636) |
| **CSRF Protection** | State parameter + CSRF tokens on forms |
| **Rate Limiting** | 10 login attempts/min, 30 token requests/min |
| **HTTPS Enforcement** | Automatic in production via Talisman |
| **Secure Sessions** | HttpOnly, Secure, SameSite cookies |
| **Input Validation** | Redirect URI whitelist, scheme validation |
| **Open Redirect Prevention** | Same-origin validation on redirects |
| **Granular Permissions** | Field-level consent stored in tokens |

---

## 🌐 Additional Endpoints

### Health Check
```http
GET /health
```
Returns server health status and environment.

### Transparency
```http
GET /transparency
```
Shows the exact GitHub commit deployed in production.

### Interactive Tester
```http
GET /tester
```
Web-based OAuth flow tester - no coding required!

---

## 💻 Local Development

### Prerequisites
- Python 3.10+
- SQLite (or PostgreSQL for production)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/vision2822/pesu-oauth2.git
cd pesu-oauth2

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cat > .env << EOF
FLASK_ENV=development
SECRET_KEY=$(python -c 'import secrets; print(secrets.token_urlsafe(32))')
DATABASE_URL=sqlite:///dev.db
ADMIN_USERS=PES1UG21CS001
EOF

# 5. Initialize database
flask db upgrade

# 6. Run development server
flask run
```

Visit `http://127.0.0.1:5000` 🎉

---

## 🚢 Production Deployment

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FLASK_ENV` | Yes | Set to `production` |
| `SECRET_KEY` | Yes | Strong random key (min 32 chars) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_USERS` | Yes | Comma-separated PRNs (e.g., `PES1UG21CS001,PES1UG21CS002`) |
| `TESTER_CLIENT_ID` | No | Pre-configured public client for tester page |

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add environment variables in Vercel Dashboard → Settings → Environment Variables.

---

## 📖 Complete Integration Example

### React SPA (Public Client)

```javascript
// 1. Generate PKCE and redirect
const startOAuth = async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  
  sessionStorage.setItem('code_verifier', verifier);
  
  const authUrl = new URL('https://pesu-oauth2.vercel.app/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', 'YOUR_PUBLIC_CLIENT_ID');
  authUrl.searchParams.set('redirect_uri', window.location.origin + '/callback');
  authUrl.searchParams.set('scope', 'profile:basic profile:contact');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  window.location.href = authUrl.toString();
};

// 2. Handle callback and exchange token
const handleCallback = async () => {
  const code = new URLSearchParams(window.location.search).get('code');
  const verifier = sessionStorage.getItem('code_verifier');
  
  const response = await fetch('https://pesu-oauth2.vercel.app/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: window.location.origin + '/callback',
      client_id: 'YOUR_PUBLIC_CLIENT_ID',
      code_verifier: verifier,
    }),
  });
  
  const { access_token } = await response.json();
  localStorage.setItem('access_token', access_token);
  
  // 3. Fetch user data
  const userResponse = await fetch('https://pesu-oauth2.vercel.app/api/v1/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  
  const userData = await userResponse.json();
  console.log('User:', userData);
};
```

---

## 🔍 Transparency & Trust

This service is **open source** and **transparent by design**:

- ✅ Full source code available on GitHub
- ✅ Production deployment matches repository exactly
- ✅ Verify deployed commit via `/transparency` endpoint
- ✅ No hidden code or modifications
- ✅ Community auditable

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support & Documentation

- 📚 **Full Documentation**: [/docs](https://pesu-oauth2.vercel.app/docs)
- 🧪 **Interactive Tester**: [/tester](https://pesu-oauth2.vercel.app/tester)
- 🔍 **Transparency**: [/transparency](https://pesu-oauth2.vercel.app/transparency)
- 🐛 **Issues**: [GitHub Issues](https://github.com/vision2822/pesu-oauth2/issues)

---

## 🌟 Acknowledgments

Built with:
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [Authlib](https://authlib.org/) - OAuth 2.0 implementation
- [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/) - Database ORM
- [Vercel](https://vercel.com/) - Deployment platform

---

<div align="center">

**Made with ❤️ for the PESU community**