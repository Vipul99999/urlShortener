# UrlShortener

Multi-tenant URL shortener SaaS built with Next.js, Fastify, PostgreSQL, Prisma, Redis, and a dedicated worker process.

It is designed as a real product foundation rather than a tutorial toy:

- branded short links
- workspaces and team access
- invitations and audit logs
- custom domains with verification and diagnostics
- async click processing and analytics
- exports, QR codes, API keys, abuse protection, monitoring hooks, and deployment-ready structure

## Monorepo Overview

### Root

- `apps/api`: Fastify API and redirect server
- `apps/web`: Next.js App Router frontend
- `apps/worker`: background job worker
- `packages/db`: Prisma schema, client, migrations, queue helpers, object storage helpers
- `packages/shared`: shared constants, job kinds, API-key scopes, and payload types
- `packages/validation`: shared validation package placeholder
- `tests`: runtime and browser tests
- `scripts`: runtime validation harnesses

### Important root files

- `package.json`: workspace scripts
- `pnpm-workspace.yaml`: workspace definition
- `turbo.json`: Turborepo pipeline
- `playwright.config.ts`: browser E2E configuration
- `.env.examples`: environment reference
- `README.md`: project guide
- `docs/SRS.md`: detailed software requirements specification

## Main Product Capabilities

- User registration, login, refresh, logout, password reset, email verification
- Workspace creation and multi-member collaboration
- Invitation creation, preview, accept, and revoke
- Link CRUD with slug generation, validation, tags, QR generation, export, and analytics
- Redirect resolution with Redis-backed caching and abuse protection
- Async worker for emails, click processing, and exports
- Custom domain onboarding, verification, diagnostics, enable/disable, and assignment
- API keys with scopes and per-key usage analytics
- Audit logs, ops overview, email delivery events, and abuse signals
- Sentry-ready monitoring and alert-webhook hooks

## Architecture

### Runtime shape

- `apps/web` serves the user-facing frontend
- `apps/api` serves the REST API and redirect endpoints
- `apps/worker` processes queued jobs from the database
- PostgreSQL stores core transactional data
- Redis accelerates redirect lookups and can fall back safely when unavailable
- Object storage stores exported CSV files

### High-level request flow

1. User interacts with the Next.js dashboard.
2. The frontend calls Fastify REST endpoints.
3. Fastify reads and writes PostgreSQL through Prisma.
4. Redirects use Redis cache first, then database fallback.
5. Heavy work is queued into the `jobs` table.
6. The worker claims and processes jobs asynchronously.

## File-Level Map

### `apps/api/src`

- `app.ts`: registers plugins, routes, cache verification, mail readiness, and error handling
- `server.ts`: boots the API service
- `config/env.ts`: env validation
- `plugins/`
  - `auth.ts`: JWT auth, API-key auth, request usage logging
  - `jwt.ts`: Fastify JWT setup
  - `prisma.ts`: Prisma injection
- `common/utils/`
  - `abuse-guard.ts`: in-memory rate and block tracking
  - `abuse-monitor.ts`: persistence for abuse signals
  - `alerts.ts`: outbound operational alert webhook
  - `api-key-scopes.ts`: API-key route scope guard
  - `custom-domains.ts`: custom-domain helpers
  - `link-cache.ts`: Redis + in-memory redirect cache
  - `mailer.ts`: SMTP or Resend email sender
  - `monitoring.ts`: Sentry integration
  - `reserved-slugs.ts`: reserved path protection
  - `workspace-roles.ts`: public/internal workspace role normalization
- `modules/`
  - `auth`: auth flows
  - `workspaces`: workspace CRUD and membership-aware access
  - `links`: link CRUD and validation
  - `redirects`: redirect resolution
  - `analytics`: workspace and link analytics
  - `tags`: tag CRUD and tag assignment
  - `qr`: QR generation
  - `exports`: export job creation, listing, and download
  - `users`: current user profile and workspace members
  - `api-keys`: API key creation, revoke, usage summary
  - `audit`: workspace audit logs
  - `invitations`: invite workflows
  - `domains`: custom-domain lifecycle
  - `email`: Resend webhook ingestion
  - `ops`: workspace operations overview
  - `health`: health and readiness endpoints

### `apps/web/src/app`

- `page.tsx`: marketing/landing page
- `login`, `register`, `forgot-password`, `reset-password`, `verify-email`, `resend-verification`, `accept-invitation`: auth and onboarding pages
- `dashboard/layout.tsx`: authenticated dashboard shell
- `dashboard/page.tsx`: workspace summary and ops pulse
- `dashboard/links/page.tsx`: create links, create tags, search/manage links, export, QR
- `dashboard/links/[linkId]/page.tsx`: link detail and analytics
- `dashboard/links/[linkId]/edit/page.tsx`: edit link
- `dashboard/analytics/page.tsx`: analytics overview
- `dashboard/settings/page.tsx`: profile, workspace, members, custom domains, security/ops guidance
- `dashboard/members/page.tsx`: invitation/member surface
- `dashboard/api-keys/page.tsx`: scoped API-key management and usage visibility
- `dashboard/audit-logs/page.tsx`: audit history
- `dashboard/exports/page.tsx`: export history and downloads
- `dashboard/change-password/page.tsx`: password change

### `apps/worker/src`

- `worker.ts`: polling loop, health server, graceful shutdown, stale-lock recovery
- `processors/click-events.ts`: analytics click aggregation
- `processors/email-jobs.ts`: queued email delivery + event persistence
- `processors/export-jobs.ts`: CSV generation and object storage upload
- `utils/mailer.ts`: SMTP or Resend sender
- `utils/click-metadata.ts`: bot/device/browser/referrer enrichment
- `utils/monitoring.ts`: Sentry integration
- `utils/alerts.ts`: operational alert webhook

### `packages/db/src`

- `client.ts`: Prisma client export
- `job-queue.ts`: enqueue, claim, complete, fail jobs
- `object-storage.ts`: local or Cloudflare R2 object storage abstraction
- `index.ts`: package export surface

### `packages/db/prisma`

- `schema.prisma`: complete data model
- `migrations/`: schema history
- `seed.ts`: demo user/workspace/link seed

## Data Model Summary

Core entities:

- `users`
- `sessions`
- `workspaces`
- `workspace_members`
- `links`
- `tags`
- `link_tags`
- `link_daily_stats`
- `link_click_events`
- `link_unique_visitors`
- `link_daily_unique_visitors`
- `workspace_domains`
- `qr_codes`
- `export_jobs`
- `jobs`
- `api_keys`
- `api_key_request_events`
- `audit_logs`
- `invitations`
- `password_reset_tokens`
- `email_verification_tokens`
- `email_delivery_events`
- `abuse_signals`

See [docs/SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md) for the full table-by-table specification.

## API Summary

### Public

- `GET /health`
- `GET /ready`
- `GET /:slug`
- `GET /.well-known/url-shortener-domain-verification`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/resend-verification`
- `POST /auth/verify-email`
- `POST /auth/change-password`

### Workspace-scoped

- workspaces
- links
- analytics
- tags
- QR
- exports
- users/members
- invitations
- custom domains
- API keys
- audit logs
- ops overview

The full route breakdown is documented in [docs/SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md).

## Environment Variables

See `.env.examples` for the canonical list.

Most important:

```env
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
APP_URL=
API_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SHORT_URL_BASE=
REDIS_URL=
OBJECT_STORAGE_PROVIDER=local
EXPORT_STORAGE_DIR=.data/exports
EMAIL_PROVIDER=smtp
MAIL_FROM=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
ALERT_WEBHOOK_URL=
```

## Object Storage

Recommended production choice: Cloudflare R2.

Why:

- S3-compatible integration
- simple switch from local storage
- low-cost practical option for early-stage SaaS
- no egress-charge pressure compared with more traditional object-storage setups

R2 envs:

```env
OBJECT_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
R2_PUBLIC_BASE_URL=
```

## Email

Supported providers:

- `smtp`
- `resend`

Recommended production provider:

- `resend`

Webhook endpoint:

- `POST /webhooks/resend`

## Monitoring and Operations

Built-in operational surfaces:

- API `/health`
- API `/ready`
- Worker `/health`
- Worker `/ready`
- Workspace `ops/overview`

Monitoring hooks:

- Sentry-ready for API
- Sentry-ready for worker
- Sentry-ready for frontend
- outbound alert webhook for critical incidents

## API Keys

API keys are now scoped, not all-powerful.

Supported scopes:

- `links:read`
- `links:write`
- `analytics:read`
- `tags:read`
- `tags:write`
- `exports:read`
- `exports:write`

Machine-enabled routes accept:

```http
X-API-Key: usk_xxxxxxxxxxxxx
```

User/admin dashboard routes still require JWT auth.

## Testing

### Runtime tests

```bash
npm run test
```

Current runtime validation covers:

- Redis outage fallback and reconnect
- stale job reclaim
- custom domain verification + redirect + analytics path
- export storage behavior

### Browser tests

```bash
pnpm test:e2e
```

Set:

```env
E2E_BASE_URL=
E2E_USER_EMAIL=
E2E_USER_PASSWORD=
```

## Local Development

Install:

```bash
pnpm install
```

Generate Prisma client if needed:

```bash
pnpm db:generate
```

Apply migrations:

```bash
pnpm db:deploy
```

Run services:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## Deployment Checklist

1. Provision managed PostgreSQL.
2. Provision Redis.
3. Set real JWT secrets.
4. Set `APP_URL`, `API_URL`, and frontend public URLs.
5. Put public traffic behind a CDN/WAF such as Cloudflare.
6. Switch object storage to R2 for production.
7. Configure email provider and webhook.
8. Configure Sentry DSNs.
9. Configure alert webhook.
10. Enable backups and point-in-time recovery for Postgres and export storage.
11. Deploy API and worker as separate services.
12. Apply migrations.
13. Validate health and readiness endpoints.
14. Test custom-domain verification on real DNS and HTTPS.

## Documentation

- docs index: [docs/DOCS_INDEX.md](D:\Projects_Components\url-shortener\docs\DOCS_INDEX.md)
- product structure: [docs/Product_structure.md](D:\Projects_Components\url-shortener\docs\Product_structure.md)
- practical API guide: [docs/api.md](D:\Projects_Components\url-shortener\docs\api.md)
- practical database guide: [docs/database.md](D:\Projects_Components\url-shortener\docs\database.md)
- practical deployment guide: [docs/deployment.md](D:\Projects_Components\url-shortener\docs\deployment.md)
- security guide: [docs/security.md](D:\Projects_Components\url-shortener\docs\security.md)
- testing guide: [docs/testing.md](D:\Projects_Components\url-shortener\docs\testing.md)
- short roadmap: [docs/roadmap.md](D:\Projects_Components\url-shortener\docs\roadmap.md)
- architecture guide: [docs/architecture.md](D:\Projects_Components\url-shortener\docs\architecture.md)
- contributing guide: [docs/contributing.md](D:\Projects_Components\url-shortener\docs\contributing.md)
- changelog: [docs/changelog.md](D:\Projects_Components\url-shortener\docs\changelog.md)
- Main system specification: [docs/SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md)
- API reference: [docs/API_REFERENCE.md](D:\Projects_Components\url-shortener\docs\API_REFERENCE.md)
- OpenAPI-style spec: [docs/openapi.yaml](D:\Projects_Components\url-shortener\docs\openapi.yaml)
- Postman collection: [docs/POSTMAN_COLLECTION.json](D:\Projects_Components\url-shortener\docs\POSTMAN_COLLECTION.json)
- DB schema reference: [docs/DB_SCHEMA_REFERENCE.md](D:\Projects_Components\url-shortener\docs\DB_SCHEMA_REFERENCE.md)
- Product PRD and roadmap: [docs/PRODUCT_PRD_ROADMAP.md](D:\Projects_Components\url-shortener\docs\PRODUCT_PRD_ROADMAP.md)
- deployment and incident runbook: [docs/DEPLOYMENT_RUNBOOK.md](D:\Projects_Components\url-shortener\docs\DEPLOYMENT_RUNBOOK.md)
