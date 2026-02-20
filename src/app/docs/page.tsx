import { AVAILABLE_SCOPES } from "@/lib/constants";
import { CodeTabs } from "./code-tabs";

export default function DocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-domain.com";

  return (
    <div className="container" style={{ paddingTop: "6rem", maxWidth: "780px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Documentation</h1>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "2.5rem" }}>
        Integrate PESU Auth into your app.
      </p>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">Overview</h2>
        <p className="docs-text">
          PESU Auth implements OAuth 2.0 Authorization Code flow with PKCE. Your app
          redirects users here to authenticate, receives an authorization code,
          exchanges it for tokens, then fetches user data.
        </p>
        <div className="docs-flow">
          <div className="docs-flow-step">
            <span className="docs-flow-num">1</span>
            <span>Create Client</span>
          </div>
          <div className="docs-flow-arrow">→</div>
          <div className="docs-flow-step">
            <span className="docs-flow-num">2</span>
            <span>Generate PKCE</span>
          </div>
          <div className="docs-flow-arrow">→</div>
          <div className="docs-flow-step">
            <span className="docs-flow-num">3</span>
            <span>Redirect User</span>
          </div>
          <div className="docs-flow-arrow">→</div>
          <div className="docs-flow-step">
            <span className="docs-flow-num">4</span>
            <span>Exchange Code</span>
          </div>
          <div className="docs-flow-arrow">→</div>
          <div className="docs-flow-step">
            <span className="docs-flow-num">5</span>
            <span>Fetch User</span>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">1. Create a Client</h2>
        <p className="docs-text">
          Go to <a href="/admin" className="docs-link">/admin</a> and
          create an OAuth client. You&apos;ll receive a <code>client_id</code>.
          For public clients (SPAs, mobile apps), no secret is needed — PKCE handles security.
        </p>
        <div className="docs-card">
          <div className="docs-card-header">Client Types</div>
          <div className="docs-card-body">
            <div className="docs-grid">
              <div>
                <strong style={{ color: "var(--g18)" }}>Public</strong>
                <p style={{ fontSize: "0.8rem", color: "var(--g11)", marginTop: "0.25rem" }}>
                  SPAs, mobile apps, CLIs. No secret, PKCE required.
                </p>
              </div>
              <div>
                <strong style={{ color: "var(--g18)" }}>Confidential</strong>
                <p style={{ fontSize: "0.8rem", color: "var(--g11)", marginTop: "0.25rem" }}>
                  Backend servers. Has secret + PKCE for extra security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">2. Generate PKCE</h2>
        <p className="docs-text">
          PKCE prevents authorization code interception attacks. Generate a random
          <code>code_verifier</code>, then create a <code>code_challenge</code> by
          SHA-256 hashing it.
        </p>
        <CodeTabs
          tabs={[
            {
              lang: "JavaScript",
              code: `// Generate code_verifier (random string)
const codeVerifier = crypto.randomUUID() + crypto.randomUUID();

// Generate code_challenge (SHA-256 hash, base64url encoded)
async function generateChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=+$/, '');
}

const codeChallenge = await generateChallenge(codeVerifier);

// Store verifier for later (you'll need it for token exchange)
sessionStorage.setItem('code_verifier', codeVerifier);`,
            },
            {
              lang: "Python",
              code: `import hashlib
import base64
import secrets

# Generate code_verifier (random string)
code_verifier = secrets.token_urlsafe(64)

# Generate code_challenge (SHA-256 hash, base64url encoded)
digest = hashlib.sha256(code_verifier.encode()).digest()
code_challenge = base64.urlsafe_b64encode(digest).rstrip(b'=').decode()

# Store verifier in session for later
session['code_verifier'] = code_verifier`,
            },
            {
              lang: "Go",
              code: `import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
)

// Generate code_verifier (random string)
verifierBytes := make([]byte, 64)
rand.Read(verifierBytes)
codeVerifier := base64.RawURLEncoding.EncodeToString(verifierBytes)

// Generate code_challenge (SHA-256 hash, base64url encoded)
hash := sha256.Sum256([]byte(codeVerifier))
codeChallenge := base64.RawURLEncoding.EncodeToString(hash[:])

// Store verifier for later use`,
            },
          ]}
        />
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">3. Redirect to Authorize</h2>
        <p className="docs-text">
          Send users to the authorization endpoint with your client details and PKCE challenge.
        </p>
        <CodeTabs
          tabs={[
            {
              lang: "JavaScript",
              code: `const authUrl = new URL('${baseUrl}/oauth2/authorize');

authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', 'YOUR_CLIENT_ID');
authUrl.searchParams.set('redirect_uri', 'https://yourapp.com/callback');
authUrl.searchParams.set('scope', 'profile:basic profile:contact');
authUrl.searchParams.set('state', crypto.randomUUID()); // CSRF protection
authUrl.searchParams.set('code_challenge', codeChallenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

// Redirect user
window.location.href = authUrl.toString();`,
            },
            {
              lang: "Python",
              code: `from urllib.parse import urlencode
import secrets

params = {
    'response_type': 'code',
    'client_id': 'YOUR_CLIENT_ID',
    'redirect_uri': 'https://yourapp.com/callback',
    'scope': 'profile:basic profile:contact',
    'state': secrets.token_urlsafe(32),  # CSRF protection
    'code_challenge': code_challenge,
    'code_challenge_method': 'S256',
}

auth_url = f'${baseUrl}/oauth2/authorize?{urlencode(params)}'

# Redirect user (Flask example)
return redirect(auth_url)`,
            },
            {
              lang: "Go",
              code: `import "net/url"

authURL, _ := url.Parse("${baseUrl}/oauth2/authorize")

q := authURL.Query()
q.Set("response_type", "code")
q.Set("client_id", "YOUR_CLIENT_ID")
q.Set("redirect_uri", "https://yourapp.com/callback")
q.Set("scope", "profile:basic profile:contact")
q.Set("state", generateRandomState()) // CSRF protection
q.Set("code_challenge", codeChallenge)
q.Set("code_challenge_method", "S256")

authURL.RawQuery = q.Encode()

// Redirect user
http.Redirect(w, r, authURL.String(), http.StatusFound)`,
            },
          ]}
        />
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">4. Exchange Code for Token</h2>
        <p className="docs-text">
          After user authorizes, they&apos;re redirected back with a <code>code</code>.
          Exchange it for tokens using your stored <code>code_verifier</code>.
        </p>
        <CodeTabs
          tabs={[
            {
              lang: "JavaScript",
              code: `// Get code from URL params
const code = new URLSearchParams(window.location.search).get('code');
const codeVerifier = sessionStorage.getItem('code_verifier');

const response = await fetch('${baseUrl}/api/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: 'https://yourapp.com/callback',
    client_id: 'YOUR_CLIENT_ID',
    code_verifier: codeVerifier,
  }),
});

const tokens = await response.json();
// {
//   access_token: "...",
//   token_type: "Bearer",
//   expires_in: 3600,
//   refresh_token: "...",
//   scope: "profile:basic profile:contact"
// }`,
            },
            {
              lang: "Python",
              code: `import requests

code = request.args.get('code')
code_verifier = session.get('code_verifier')

response = requests.post(
    '${baseUrl}/api/oauth2/token',
    data={
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': 'https://yourapp.com/callback',
        'client_id': 'YOUR_CLIENT_ID',
        'code_verifier': code_verifier,
    }
)

tokens = response.json()
access_token = tokens['access_token']
refresh_token = tokens['refresh_token']`,
            },
            {
              lang: "Go",
              code: `import (
    "net/http"
    "net/url"
    "encoding/json"
)

code := r.URL.Query().Get("code")
codeVerifier := getFromSession("code_verifier")

resp, _ := http.PostForm("${baseUrl}/api/oauth2/token",
    url.Values{
        "grant_type":    {"authorization_code"},
        "code":          {code},
        "redirect_uri":  {"https://yourapp.com/callback"},
        "client_id":     {"YOUR_CLIENT_ID"},
        "code_verifier": {codeVerifier},
    },
)

var tokens struct {
    AccessToken  string \`json:"access_token"\`
    RefreshToken string \`json:"refresh_token"\`
    ExpiresIn    int    \`json:"expires_in"\`
}
json.NewDecoder(resp.Body).Decode(&tokens)`,
            },
          ]}
        />
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">5. Fetch User Info</h2>
        <p className="docs-text">
          Use the access token to retrieve user data. Only fields the user consented to will be returned.
        </p>
        <CodeTabs
          tabs={[
            {
              lang: "JavaScript",
              code: `const response = await fetch('${baseUrl}/api/v1/user', {
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
  },
});

const user = await response.json();
// {
//   name: "John Doe",
//   prn: "PES1202504001",
//   srn: "PES1UG25CS001",
//   email: "john@example.com",
//   phone: "9876543210"
// }

console.log(\`Welcome, \${user.name}!\`);`,
            },
            {
              lang: "Python",
              code: `response = requests.get(
    '${baseUrl}/api/v1/user',
    headers={
        'Authorization': f'Bearer {access_token}',
    }
)

user = response.json()
# {
#   "name": "John Doe",
#   "prn": "PES1202504001",
#   "srn": "PES1UG25CS001",
#   "email": "john@example.com",
#   "phone": "9876543210"
# }

print(f"Welcome, {user['name']}!")`,
            },
            {
              lang: "Go",
              code: `req, _ := http.NewRequest("GET", "${baseUrl}/api/v1/user", nil)
req.Header.Set("Authorization", "Bearer "+accessToken)

client := &http.Client{}
resp, _ := client.Do(req)

var user struct {
    Name  string \`json:"name"\`
    PRN   string \`json:"prn"\`
    SRN   string \`json:"srn"\`
    Email string \`json:"email"\`
    Phone string \`json:"phone"\`
}
json.NewDecoder(resp.Body).Decode(&user)

fmt.Printf("Welcome, %s!\\n", user.Name)`,
            },
          ]}
        />
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">Available Scopes</h2>
        <p className="docs-text">
          Request only what you need. Users see exactly what you&apos;re asking for.
        </p>
        <div className="docs-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Fields</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(AVAILABLE_SCOPES).map(([scope, desc]) => (
                <tr key={scope}>
                  <td>
                    <code>{scope}</code>
                  </td>
                  <td style={{ color: "var(--g13)" }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">Error Handling</h2>
        <div className="docs-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Error</th>
                <th>Cause</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>invalid_client</code></td>
                <td style={{ color: "var(--g13)" }}>Unknown client_id or wrong secret</td>
              </tr>
              <tr>
                <td><code>invalid_grant</code></td>
                <td style={{ color: "var(--g13)" }}>Code expired, already used, or PKCE mismatch</td>
              </tr>
              <tr>
                <td><code>invalid_token</code></td>
                <td style={{ color: "var(--g13)" }}>Access token expired or revoked</td>
              </tr>
              <tr>
                <td><code>insufficient_scope</code></td>
                <td style={{ color: "var(--g13)" }}>User didn&apos;t consent to any fields</td>
              </tr>
              <tr>
                <td><code>access_denied</code></td>
                <td style={{ color: "var(--g13)" }}>User clicked &quot;Deny&quot; on consent screen</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 className="docs-heading">Try It</h2>
        <p className="docs-text">
          Test the full flow interactively without writing code.
        </p>
        <a href="/tester" className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
          Open OAuth Tester →
        </a>
      </section>
    </div>
  );
}