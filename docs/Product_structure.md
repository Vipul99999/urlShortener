# Product Structure

## Purpose

This document is the practical overview of how UrlShortener is organized as a product and codebase.

Use it when you want to quickly answer:

- what the product includes
- how the monorepo is structured
- which app is responsible for what
- where major features live

For full specifications, see [SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md).

## Product Summary

UrlShortener is a multi-tenant SaaS product for:

- branded short links
- workspace collaboration
- analytics and exports
- custom domains
- QR generation
- machine integrations through API keys

It is built to be a useful startup-stage product first, with room to grow into a more advanced business platform later.

## Runtime Architecture

The system is split into three main runtime apps:

- `apps/web`
  Next.js frontend for auth, dashboard, settings, analytics, and admin-style product surfaces.

- `apps/api`
  Fastify backend for auth, links, redirects, analytics, exports, invitations, domains, API keys, and operational endpoints.

- `apps/worker`
  Background job processor for emails, exports, and click-event processing.

Supporting infrastructure:

- PostgreSQL for transactional and analytics-support data
- Redis for redirect caching and resilience
- object storage for export files
- email provider for verification/reset/invite delivery
- monitoring/alerting services

## Monorepo Layout

### Root folders

- `apps/`
- `packages/`
- `docs/`
- `tests/`
- `scripts/`

### App folders

- `apps/web`
- `apps/api`
- `apps/worker`

### Shared packages

- `packages/db`
  Prisma schema, client, queue helpers, object storage helpers

- `packages/shared`
  shared constants, enums, job kinds, API-key scopes

- `packages/validation`
  shared validation placeholder package

## Feature Ownership Map

### Authentication

- frontend pages:
  - `apps/web/src/app/login`
  - `apps/web/src/app/register`
  - `apps/web/src/app/forgot-password`
  - `apps/web/src/app/reset-password`
  - `apps/web/src/app/verify-email`
  - `apps/web/src/app/resend-verification`
- backend module:
  - `apps/api/src/modules/auth`

### Workspaces and members

- frontend:
  - `apps/web/src/app/dashboard`
  - `apps/web/src/app/dashboard/settings`
  - `apps/web/src/app/dashboard/members`
- backend:
  - `apps/api/src/modules/workspaces`
  - `apps/api/src/modules/users`
  - `apps/api/src/modules/invitations`

### Links and redirects

- frontend:
  - `apps/web/src/app/dashboard/links`
- backend:
  - `apps/api/src/modules/links`
  - `apps/api/src/modules/redirects`

### Analytics

- frontend:
  - `apps/web/src/app/dashboard/analytics`
  - `apps/web/src/app/dashboard/links/[linkId]`
- backend:
  - `apps/api/src/modules/analytics`
  - `apps/worker/src/processors/click-events.ts`

### Tags

- frontend:
  - `apps/web/src/app/dashboard/links`
- backend:
  - `apps/api/src/modules/tags`

### Exports

- frontend:
  - `apps/web/src/app/dashboard/exports`
  - `apps/web/src/app/dashboard/links`
- backend:
  - `apps/api/src/modules/exports`
  - `apps/worker/src/processors/export-jobs.ts`

### QR

- frontend:
  - `apps/web/src/app/dashboard/links`
- backend:
  - `apps/api/src/modules/qr`

### Custom domains

- frontend:
  - `apps/web/src/app/dashboard/settings`
- backend:
  - `apps/api/src/modules/domains`
  - `apps/api/src/common/utils/custom-domains.ts`

### API keys

- frontend:
  - `apps/web/src/app/dashboard/api-keys`
- backend:
  - `apps/api/src/modules/api-keys`
  - `apps/api/src/plugins/auth.ts`

### Audit and ops

- frontend:
  - `apps/web/src/app/dashboard/audit-logs`
  - `apps/web/src/app/dashboard/settings`
  - `apps/web/src/app/dashboard`
- backend:
  - `apps/api/src/modules/audit`
  - `apps/api/src/modules/ops`
  - monitoring / abuse utilities

## Data Flow Summary

### Link creation flow

1. User submits link form in `web`
2. API validates input and normalizes destination URL
3. API checks domain ownership and slug uniqueness
4. API stores the link in PostgreSQL
5. API warms redirect cache
6. Frontend refreshes workspace link and analytics state

### Redirect flow

1. Request hits API redirect route
2. API evaluates blocklists and abuse conditions
3. API checks Redis-backed cache
4. API falls back to PostgreSQL if needed
5. API returns redirect response
6. API enqueues click-event job
7. Worker enriches and aggregates analytics

### Export flow

1. User requests export in dashboard
2. API creates export job and queue job record
3. Worker generates CSV and uploads artifact
4. Export record is marked completed
5. User downloads from dashboard

## Operational Responsibilities

### `web`

- presentation
- auth/session persistence
- dashboard UX
- user feedback and onboarding

### `api`

- request validation
- auth and authorization
- business logic
- caching
- route-level rate limiting
- public redirects

### `worker`

- background processing
- export creation
- email delivery
- click aggregation
- stale-lock recovery

## Key Product Qualities

The codebase is designed around these priorities:

- useful feature depth for startup-stage customers
- reasonably safe public redirect handling
- clear expansion path toward more advanced SaaS needs
- enough observability and ops structure to run real traffic

## Related Docs

- [api.md](D:\Projects_Components\url-shortener\docs\api.md)
- [database.md](D:\Projects_Components\url-shortener\docs\database.md)
- [deployment.md](D:\Projects_Components\url-shortener\docs\deployment.md)
- [security.md](D:\Projects_Components\url-shortener\docs\security.md)
- [SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md)
