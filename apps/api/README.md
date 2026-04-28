# URL Shortener Backend

Backend API for a scalable URL shortener business tool built with **Fastify**, **Prisma**, and **PostgreSQL**.

It supports:

* JWT auth
* workspaces
* short links
* redirects
* analytics
* tags
* QR generation
* CSV exports
* API keys
* audit logs

---

## Tech stack

* Fastify
* Prisma
* PostgreSQL
* Zod
* TypeScript
* pnpm workspace monorepo

---

## Project structure

```text
url-shortener/
  apps/
    api/
      src/
        app.ts
        server.ts
        config/
        plugins/
        common/
        modules/
  packages/
    db/
      prisma/
      src/
    shared/
    validation/
```

### Main backend modules

```text
modules/
  health/
  auth/
  users/
  workspaces/
  links/
  redirects/
  analytics/
  tags/
  qr/
  exports/
  api-keys/
  audit/
```

---

## Features

### Auth

* register
* login
* refresh token
* logout
* current user

### Users

* get current profile
* update profile
* list workspace members

### Workspaces

* create workspace
* list user workspaces
* get workspace
* update workspace branding

### Links

* create short links
* custom slug
* update link
* delete link
* redirect support
* expiration support
* click counting

### Analytics

* workspace summary
* link summary
* daily analytics

### Tags

* create tag
* update tag
* delete tag
* attach tag to link
* remove tag from link

### QR

* generate QR code as SVG

### Exports

* export links CSV
* list export jobs

### API keys

* create API key
* list API keys
* revoke API key

### Audit

* list audit logs
* lightweight audit event support

---

## Requirements

* Node.js 20+
* pnpm
* PostgreSQL

---

## Environment variables

Create this file:

```text
apps/api/.env
```

Example:

```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0

DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/shortener?schema=public

JWT_ACCESS_SECRET=super-secret-access-key-change-this-now-123456
JWT_REFRESH_SECRET=super-secret-refresh-key-change-this-now-123456
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30

APP_URL=http://localhost:3000
API_URL=http://localhost:4000
```

Also keep a root `.env` if Prisma CLI needs it:

```text
url-shortener/.env
```

---

## Database setup

Create a PostgreSQL database:

```sql
CREATE DATABASE shortener;
```

Then enable required extensions inside the `shortener` database:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## Install dependencies

From repo root:

```bash
pnpm install
```

---

## Generate Prisma client

From repo root:

```bash
pnpm --filter @repo/db generate
```

---

## Run migrations

From repo root:

```bash
pnpm --filter @repo/db prisma migrate dev --name init
```

---

## Start backend

From repo root:

```bash
pnpm --filter @repo/api dev
```

Production build:

```bash
pnpm --filter @repo/api build
pnpm --filter @repo/api start
```

---

## Health check

### `GET /health`

Returns basic liveness check.

### `GET /ready`

Returns DB readiness check.

---

## API overview

## Auth

### `POST /auth/register`

Create user and default workspace.

Body:

```json
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}
```

### `POST /auth/login`

### `POST /auth/refresh`

### `POST /auth/logout`

### `GET /auth/me`

---

## Users

### `GET /users/me`

### `PATCH /users/me`

### `GET /workspaces/:workspaceId/members`

---

## Workspaces

### `GET /workspaces`

### `POST /workspaces`

### `GET /workspaces/:workspaceId`

### `PATCH /workspaces/:workspaceId`

---

## Links

### `GET /workspaces/:workspaceId/links`

### `POST /workspaces/:workspaceId/links`

Body:

```json
{
  "title": "Portfolio",
  "destinationUrl": "https://example.com",
  "slug": "portfolio-demo",
  "description": "Main portfolio link",
  "campaign": "launch",
  "redirectType": "TEMPORARY"
}
```

### `GET /workspaces/:workspaceId/links/:linkId`

### `PATCH /workspaces/:workspaceId/links/:linkId`

### `DELETE /workspaces/:workspaceId/links/:linkId`

---

## Redirects

### `GET /:slug`

### `GET /r/:domain/:slug`

---

## Analytics

### `GET /workspaces/:workspaceId/analytics/summary`

### `GET /workspaces/:workspaceId/links/:linkId/analytics/summary`

### `GET /workspaces/:workspaceId/links/:linkId/analytics/daily`

---

## Tags

### `GET /workspaces/:workspaceId/tags`

### `POST /workspaces/:workspaceId/tags`

### `PATCH /workspaces/:workspaceId/tags/:tagId`

### `DELETE /workspaces/:workspaceId/tags/:tagId`

### `POST /workspaces/:workspaceId/links/:linkId/tags`

### `DELETE /workspaces/:workspaceId/links/:linkId/tags/:tagId`

---

## QR

### `POST /workspaces/:workspaceId/links/:linkId/qr`

Returns QR SVG.

---

## Exports

### `POST /workspaces/:workspaceId/exports/links`

### `GET /workspaces/:workspaceId/exports`

### `GET /workspaces/:workspaceId/exports/:exportId`

---

## API keys

### `GET /workspaces/:workspaceId/api-keys`

### `POST /workspaces/:workspaceId/api-keys`

### `DELETE /workspaces/:workspaceId/api-keys/:apiKeyId`

---

## Audit

### `GET /workspaces/:workspaceId/audit-logs`

---

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <access_token>
```

### Token model

* short-lived access token
* refresh token for renewal
* hashed refresh token stored in DB

---

## Security notes

* only `http` and `https` destination URLs should be allowed
* reserved slugs should be blocked
* API keys must be hashed before storage
* never expose hashed tokens or hashed API keys
* keep JWT secrets strong in production
* use HTTPS in production
* rotate secrets if leaked

---

## Recommended reserved slugs

Examples:

* `api`
* `auth`
* `health`
* `ready`
* `users`
* `workspaces`
* `analytics`
* `login`
* `register`
* `logout`

---

## Testing flow

Recommended manual API test order:

1. `GET /health`
2. `POST /auth/register`
3. `POST /auth/login`
4. `GET /auth/me`
5. `GET /workspaces`
6. `POST /workspaces/:workspaceId/tags`
7. `POST /workspaces/:workspaceId/links`
8. `GET /:slug`
9. `GET /workspaces/:workspaceId/analytics/summary`
10. `POST /workspaces/:workspaceId/links/:linkId/qr`
11. `POST /workspaces/:workspaceId/exports/links`

---

## Deployment notes

### Monorepo deployment

You can deploy frontend and backend separately from the same repo.

Example:

* frontend on Vercel from `apps/web`
* backend on Render from `apps/api`

### Important

Shared packages still work because both apps install workspace dependencies from the monorepo.

---

## Future improvements

Not required for MVP, but good later:

* Redis caching
* BullMQ background jobs
* custom domains
* OAuth login
* email verification
* bot filtering
* S3 storage for QR/export files
* rate limiting with Redis
* audit event hooks on all mutations
* worker service for analytics/export jobs

---

## Development notes

Recommended workflow:

1. finish backend endpoints
2. test all APIs with Postman or Bruno
3. build frontend
4. deploy MVP
5. optimize after real usage

---

## Common commands

From repo root:

```bash
pnpm install
pnpm --filter @repo/db generate
pnpm --filter @repo/db prisma migrate dev --name init
pnpm --filter @repo/api dev
```

---

## Troubleshooting

### Prisma auth failure

Check:

* database exists
* username/password are correct
* `DATABASE_URL` is correct
* Prisma is reading the expected `.env`

### `citext` does not exist

Run:

```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Fastify plugin version mismatch

Make sure Fastify and `@fastify/*` plugin versions are compatible.

### Missing env variables

Ensure `apps/api/.env` contains all required variables.

---

## License

Private project / internal MVP.
