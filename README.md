# PESU OAuth2 Provider (Flask)

[![Vercel Deployment Status](https://pesu-oauth2.vercel.app/api/badge)](https://pesu-oauth2.vercel.app/)

A self-hosted, OAuth2 provider for authenticating PESU students, built with Flask and deployed on Vercel.

## Transparency

This service is transparent by design. The code executing in production is directly deployed from the public GitHub repository. Verify the current deployment by accessing the `/transparency` endpoint.

## OAuth2 Authorization Code Flow

This service implements the standard Authorization Code grant.

1.  **Authorization Request**
    -   Your application redirects the user to `/oauth2/authorize`.
    -   The user logs in using their PESU credentials directly on this service.
    -   The user approves the consent screen, granting permission.

2.  **Authorization Code Returned**
    -   The service redirects back to your application's `redirect_uri` with a temporary `authorization_code` as a query parameter.

3.  **Token Exchange**
    -   Your application's backend makes a `server-to-server` `POST` request to `/oauth2/token` with the `code`, `client_id`, and `client_secret`.
    -   The service verifies the data and returns an `access_token` and a `refresh_token`.

4.  **API Access**
    -   Your application uses the `access_token` to make requests to protected endpoints like `/api/v1/user`.

## API Endpoints

### Authorization Endpoint

```markdown
GET (server-url)/oauth2/authorize
```

User-facing endpoint to initiate the login and consent flow.

**Query Parameters:**
-   `client_id` (required): The public identifier of your application.
-   `redirect_uri` (required): The callback URL where the user will be redirected after authorization.
-   `response_type` (required): Must be set to `code`.
-   `scope` (optional): A space-separated list of requested permissions.
-   `state` (optional): An opaque value used to prevent CSRF attacks.

### Token Endpoint
This endpoint only accepts `application/x-www-form-urlencoded`.

```markdown
POST (server-url)/oauth2/token
```

Used by the client application's backend to exchange an authorization code or refresh token for an access token.

**Body Parameters:**
-   `grant_type` (required): Either `authorization_code` or `refresh_token`.
-   `code` (required when grant_type="authorization_code"): The code received from the authorize endpoint.
-   `refresh_token` (required when grant_type="refresh_token"): The refresh token issued previously.
-   `client_id` (required): Your application's client ID.
-   `client_secret` (required): Your application's client secret.
-   `redirect_uri` (required when grant_type="authorization_code"): Must match the URI used in the initial authorization request.

**Success Response (example):**
```json
{
  "access_token": "some-secure-access-token",
  "refresh_token": "some-secure-refresh-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "profile"
}
```

### User Info Endpoint

```markdown
GET (server-url)/api/v1/user
Authorization: Bearer <access_token>
```

Fetches the profile data of the authenticated user.

**Success Response (example):**
```json
{
  "prn": "PES1201800001",
  "name": "John Doe"
}
```

### Transparency Endpoint

```markdown
GET (server-url)/transparency
```

Returns the GitHub commit SHA of the currently deployed version.

**Success Response (example):**
```json
{
  "deployment_source": {
    "github_commit_url": "https://github.com/vision2822/pesu-oauth2/commit/a5b6c7d8"
  }
}
```

## Local Development

```bash

# PREREQUISITES: Python 3.10+

# 1. Clone and Navigate
git clone https://github.com/vision2822/pesu-oauth2.git && cd pesu-oauth2

# 2. Create Venv and Activate
python3 -m venv venv && source venv/bin/activate

# 3. Install Dependencies
pip install -r requirements.txt

# 4. Configure .env File
# Create a .env file with SECRET_KEY and DATABASE_URL

# 5. Migrate the Database
flask db upgrade

# 6. Run the Development Server
flask run
```

## License

This project is licensed under the MIT License.
