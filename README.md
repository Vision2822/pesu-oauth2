# PESU Auth

OAuth2 provider for PES University. Authenticates students against PESU Academy and lets third-party apps request profile data with granular consent.

## Overview

PESU Auth implements the OAuth 2.0 Authorization Code flow with PKCE. Applications redirect users here to authenticate, receive an authorization code, exchange it for tokens, and fetch user profile data. Users choose exactly which fields to share.

No passwords are stored. Credentials are forwarded to PESU Academy for verification and discarded immediately.

## Stack

- Next.js 15 (App Router)
- PostgreSQL via Neon
- Drizzle ORM
- Upstash Redis (rate limiting)
- iron-session (session management)
- Vercel (deployment)

## Setup

### Prerequisites

- Node.js 18+
- Neon database
- Upstash Redis instance

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxx
SESSION_SECRET=generate-a-64-char-random-string-here
ADMIN_USERS=PES1202504001,PES1202504002
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SESSION_SECRET` should be a random 64-character string. `ADMIN_USERS` is a comma-separated list of PRNs that can create and manage OAuth clients.

### Install and Run

```bash
npm install
npm run db:push
npm run dev
```

The app runs at `http://localhost:3000`.

### Database

```bash
npm run db:generate   # generate migrations
npm run db:migrate    # run migrations
npm run db:push       # push schema directly (development)
npm run db:studio     # open Drizzle Studio
```

## API Endpoints

### Authorization

```
GET /oauth2/authorize
```

Starts the OAuth flow. Requires `response_type=code`, `client_id`, `redirect_uri`, `scope`, `code_challenge`, and `code_challenge_method=S256`.

### Token Exchange

```
POST /api/oauth2/token
```

Exchanges an authorization code for tokens. Accepts `application/x-www-form-urlencoded` or `application/json`.

Grant types: `authorization_code`, `refresh_token`.

### User Info

```
GET /api/v1/user
```

Returns profile data for the authenticated user. Requires `Authorization: Bearer <access_token>`. Only returns fields the user consented to.

### Health Check

```
GET /api/health
```

Returns database connectivity status.

## Scopes

| Scope              | Fields                                                  |
| ------------------ | ------------------------------------------------------- |
| `profile:basic`    | name, prn, srn                                          |
| `profile:academic` | program, branch, semester, section, campus, campus_code |
| `profile:photo`    | photo_base64                                            |
| `profile:contact`  | email, phone                                            |

## Project Structure

```
src/
  app/
    admin/          # client management (create, delete)
    api/
      health/       # health check
      oauth2/token/ # token endpoint
      v1/user/      # user info endpoint
    docs/           # integration documentation
    login/          # PESU Academy authentication
    logout/         # session termination
    oauth2/
      authorize/    # consent screen
    tester/         # interactive OAuth flow tester
    about/          # about page
    transparency/   # transparency page
  components/       # shared UI components
  lib/
    db/             # database schema and connection
    oauth2/         # grants, PKCE, token management
    auth.ts         # session-based authentication
    constants.ts    # scopes, fields, admin config
    cors.ts         # CORS headers
    pesu-api.ts     # PESU Academy API client
    pesu-auth.ts    # profile parsing
    rate-limit.ts   # rate limiting configuration
    redis.ts        # Redis client
    session.ts      # iron-session configuration
```

## Deployment

Configured for Vercel. Push to the connected repository and it deploys automatically. Set all environment variables in the Vercel dashboard.

## License

Open source. Not affiliated with PES University.
