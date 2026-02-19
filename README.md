# PESU OAuth2 v2

OAuth2 authentication service for PES University students.

## Stack

- Next.js 15 (App Router)
- NeonDB (PostgreSQL)
- Upstash Redis
- Drizzle ORM
- Vercel

## Setup

```bash
npm install
cp .env.example .env.local
# fill in your env vars
npm run db:push
npm run dev
```

## Status

Work in progress — migrating from Flask.

````

---

## Commands to Run

```bash
# 1. initialize the next.js project and install deps
npm install

# 2. push schema to your neon db
npm run db:push

# 3. verify it works
npm run dev

# 4. visit localhost:3000 and /api/health

# 5. once verified, commit
git checkout -b v2-nextjs
git add .
git commit -m "phase 1: nextjs scaffold, db schema, auth core"
git push origin v2-nextjs
````

---

## Your folder structure should look like this

```
pesu-oauth2/
├── .env.example
├── .env.local          (not committed)
├── .gitignore
├── README.md
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    │       └── health/
    │           └── route.ts
    └── lib/
        ├── constants.ts
        ├── db/
        │   ├── index.ts
        │   └── schema.ts
        ├── pesu-api.ts
        ├── pesu-auth.ts
        ├── rate-limit.ts
        ├── redis.ts
        └── session.ts
```
