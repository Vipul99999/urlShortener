# Software Requirements Specification

## Project

- Name: `UrlShortener`
- Type: Multi-tenant URL shortener SaaS
- Repo type: pnpm + Turborepo monorepo
- Primary stack:
  - Frontend: Next.js App Router, React, React Query, Zustand
  - API: Fastify, Prisma, PostgreSQL
  - Worker: Node.js background processor with database-backed queue
  - Cache: Redis with in-memory fallback
  - Storage: local filesystem or Cloudflare R2
  - Monitoring: Sentry-ready + alert webhook integration

## 1. Purpose

This system provides a branded URL-shortening platform where individuals, teams, and businesses can:

- create and manage short links
- track redirects and engagement
- organize links with tags and campaigns
- collaborate through workspaces
- invite team members
- operate branded custom domains
- manage API keys for machine access
- export link data
- monitor operational and abuse-related events

The product is intended to serve as both:

- a deployable MVP for real users
- a scalable foundation for future monetization and enterprise features

## 2. Scope

The current scope includes:

- account lifecycle
- workspace lifecycle
- link lifecycle
- redirect and analytics lifecycle
- invitation lifecycle
- custom-domain lifecycle
- API-key lifecycle
- export lifecycle
- asynchronous job processing
- abuse detection and monitoring
- operational observability

The current scope does not include:

- billing integration
- SSO
- 2FA
- mobile apps
- advanced attribution modeling
- automated certificate provisioning inside the product

## 3. Product Goals

### 3.1 Functional goals

- provide short-link creation and redirect handling
- allow team collaboration through workspaces
- provide analytics visibility for campaigns
- support custom branded domains
- expose safe machine access through scoped API keys
- support asynchronous processing for non-request-critical tasks

### 3.2 Non-functional goals

- maintain fast redirect resolution
- support recovery from worker interruptions
- preserve correctness for unique-click counts
- remain operational when Redis is unavailable
- separate dashboard and machine auth boundaries
- provide observability for production incidents

## 4. Stakeholders

- product owner / startup operator
- workspace owner / admin
- workspace member
- marketer / campaign manager
- developer integrating via API keys
- operations / infrastructure maintainer

## 5. User Roles

### 5.1 Platform user roles

- unauthenticated visitor
- authenticated user
- workspace owner
- workspace admin
- workspace editor
- workspace viewer

### 5.2 Auth actor roles

- `USER`
- `API_KEY`
- `SYSTEM`

### 5.3 API-key scopes

- `links:read`
- `links:write`
- `analytics:read`
- `tags:read`
- `tags:write`
- `exports:read`
- `exports:write`

## 6. Assumptions

- PostgreSQL is available and reachable by the API and worker
- Redis may be available but should not be treated as required for correctness
- worker process runs separately from the API process
- object storage is configurable and may be local or R2
- HTTPS is terminated at deployment edge or hosting layer
- custom domains use subdomains rather than apex/root domains

## 7. Constraints

- Prisma is the source of truth for schema management
- monorepo structure is retained
- auth model is JWT for dashboard users and `X-API-Key` for machine clients
- queue is database-backed rather than Kafka/BullMQ at this stage
- analytics are relational, not yet moved into a dedicated analytics warehouse

## 8. System Overview

## 8.1 Runtime components

### Frontend

- serves authentication, dashboard, links, analytics, settings, domains, API keys, exports
- communicates with API via `apiFetch`
- stores session tokens in Zustand + local storage

### API

- validates requests
- applies auth and scope guards
- performs CRUD and domain logic
- enqueues asynchronous work
- serves redirect traffic

### Worker

- polls the `jobs` table
- reclaims stale locked jobs
- processes email, click, and export jobs
- exposes worker health endpoints

### Database

- stores all transactional data
- stores analytics aggregates and raw click records
- stores queue jobs, audit events, abuse events, email delivery events, and API-key usage events

### Redis

- caches redirect lookups
- reconnects when available again
- falls back to in-memory cache behavior if unavailable

### Object storage

- stores completed export files
- supports local filesystem or Cloudflare R2

## 8.2 Data flow summary

### Link create flow

1. frontend submits link form
2. API validates input and workspace/domain access
3. API normalizes destination URL and selects slug
4. API persists link in PostgreSQL
5. API warms redirect cache
6. API writes audit log

### Redirect flow

1. request arrives at API
2. API resolves default or custom domain
3. abuse checks execute
4. Redis cache lookup runs
5. DB lookup runs if cache miss
6. redirect response is returned
7. click-processing job is queued asynchronously
8. worker aggregates analytics later

### Export flow

1. user requests export
2. API creates export job row
3. API enqueues background export job
4. worker generates CSV
5. worker writes object to storage
6. worker marks export job complete
7. frontend lists/downloads completed export

### Email flow

1. API enqueues email job
2. worker sends email via SMTP or Resend
3. worker stores initial delivery event
4. Resend webhook can later record delivery-state events

## 9. Repository Structure

## 9.1 Root files

- `package.json`: workspace scripts
- `pnpm-workspace.yaml`: package discovery
- `turbo.json`: task graph
- `playwright.config.ts`: E2E configuration
- `.env.examples`: environment specification
- `README.md`: project guide
- `docs/SRS.md`: this document

## 9.2 Root directories

### `apps/api`

Fastify API application.

### `apps/web`

Next.js web application.

### `apps/worker`

Background worker.

### `packages/db`

Prisma schema, client, queue, object storage.

### `packages/shared`

Shared constants and types.

### `packages/validation`

Validation package placeholder / shared schemas area.

### `tests`

Runtime and browser tests.

### `scripts`

Runtime simulation and validation helpers.

## 10. Backend Module Specifications

## 10.1 Auth module

Files:

- `auth.controller.ts`
- `auth.repository.ts`
- `auth.routes.ts`
- `auth.schemas.ts`
- `auth.service.ts`

Responsibilities:

- register
- login
- refresh
- logout
- me
- forgot password
- reset password
- resend verification
- verify email
- change password

Key behaviors:

- password hashing with `argon2`
- refresh token hashing and rotation
- email verification token creation
- password reset token creation
- initial workspace creation on register
- audit logging
- async email queueing

## 10.2 Workspaces module

Responsibilities:

- list workspaces for current user
- create workspaces
- get workspace
- update workspace name and branding title

Access:

- JWT-authenticated users only

## 10.3 Links module

Responsibilities:

- list links
- create links
- fetch link by id
- update link
- soft-delete link

Key behaviors:

- reserved slug protection
- URL normalization
- verified-domain enforcement
- redirect cache warming and invalidation
- audit logging

## 10.4 Redirects module

Responsibilities:

- resolve default domain redirects
- resolve custom-domain redirects

Key behaviors:

- cache-first link lookup
- custom-domain verification enforcement
- abuse checks
- async click queueing

## 10.5 Analytics module

Responsibilities:

- workspace summary
- workspace overview
- link summary
- link daily analytics

Overview payload includes:

- total links
- total clicks
- unique clicks
- top links
- top referrers
- device breakdown
- country breakdown
- recent clicks

## 10.6 Tags module

Responsibilities:

- create tag
- update tag
- delete tag
- attach tag to link
- detach tag from link

## 10.7 QR module

Responsibilities:

- generate QR for link
- persist QR generation record

## 10.8 Exports module

Responsibilities:

- queue export creation
- list export jobs
- fetch export job
- download completed export

Key behaviors:

- in-flight export reuse
- background CSV generation
- object storage integration

## 10.9 Users module

Responsibilities:

- current user profile fetch
- current user profile update
- workspace member listing

## 10.10 API keys module

Responsibilities:

- list API keys
- create API key with scopes
- revoke API key
- usage summary per key
- runtime raw-key authentication
- per-request usage event creation

Access model:

- UI management requires JWT-authenticated owner/admin
- machine usage requires valid `X-API-Key`
- machine routes must explicitly opt into API-key support and scope checks

## 10.11 Audit module

Responsibilities:

- record audit events
- list workspace audit logs

## 10.12 Invitations module

Responsibilities:

- list pending invitations
- create invitation
- revoke invitation
- preview invitation by token
- accept invitation

## 10.13 Domains module

Responsibilities:

- list custom domains
- create custom domain
- delete custom domain
- refresh verification token
- update domain status
- diagnostics
- verification endpoint handling

Key behaviors:

- subdomain-only expectation
- per-domain verification path
- assignment allowed only after verification

## 10.14 Email webhook module

Responsibilities:

- ingest Resend webhook payloads
- verify Svix-style signatures
- persist email delivery events

## 10.15 Ops module

Responsibilities:

- summarize workspace operational state

Current payload includes:

- storage provider summary
- pending/failed exports
- active API-key count
- recent email events
- recent abuse signals
- domain status summary

## 10.16 Health module

Responsibilities:

- API health
- API readiness

## 11. Frontend Specifications

## 11.1 Frontend architecture

- Next.js App Router
- client-side data fetching via React Query
- session persistence via Zustand
- UI primitives in `src/components/ui`
- protected dashboard shell
- monitoring via Sentry integration files

## 11.2 Public/auth pages

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/resend-verification`
- `/accept-invitation`

## 11.3 Dashboard pages

- `/dashboard`
- `/dashboard/links`
- `/dashboard/links/[linkId]`
- `/dashboard/links/[linkId]/edit`
- `/dashboard/analytics`
- `/dashboard/settings`
- `/dashboard/members`
- `/dashboard/api-keys`
- `/dashboard/audit-logs`
- `/dashboard/exports`
- `/dashboard/change-password`

## 11.4 Frontend state

### Zustand auth store

Stores:

- access token
- refresh token
- workspace id

### React Query

Used for:

- user profile
- workspaces
- links
- analytics
- domains
- exports
- API keys
- operations summary

## 11.5 Frontend UX expectations

- auth pages should feel product-grade, not plain forms
- dashboard surfaces should combine insight and action
- settings should include operational guidance, not just raw fields
- analytics should communicate trends clearly
- links page should support creation and management in one workspace

## 12. Worker Specifications

## 12.1 Worker loop

File: `apps/worker/src/worker.ts`

Responsibilities:

- claim next job
- reclaim stale jobs
- process supported job kinds
- mark complete or fail
- expose health endpoints
- graceful shutdown
- error capture and alerting

## 12.2 Supported job kinds

- `SEND_VERIFICATION_EMAIL`
- `SEND_PASSWORD_RESET_EMAIL`
- `SEND_INVITATION_EMAIL`
- `GENERATE_LINKS_EXPORT`
- `PROCESS_CLICK_EVENT`

## 12.3 Failure handling

- job attempts tracked in DB
- stale processing jobs reclaimable
- export job failure marks `export_jobs` row failed
- worker loop backoff on transient errors
- monitoring capture on failures
- alert webhook for serious incidents

## 13. Database Requirements

## 13.1 Core models

### User

Stores identity, password hash, status, timestamps.

### Session

Stores refresh token hash, jti, expiry, revocation, and session metadata.

### Workspace

Stores workspace identity and branding.

### WorkspaceMember

Stores user membership and role.

### Link

Stores short-link identity, domain, slug, destination, status, redirect type, password hash, expiry, click counters, timestamps.

### Tag / LinkTag

Stores tagging taxonomy and link-tag associations.

### LinkDailyStat

Stores per-day aggregate analytics.

### LinkClickEvent

Stores event-level click telemetry and bot/device/referrer metadata.

### LinkUniqueVisitor / LinkDailyUniqueVisitor

Stores dedupe rows for unique-click correctness.

### WorkspaceDomain

Stores custom-domain state and verification token.

### QrCode

Stores QR generation records.

### ExportJob

Stores export request lifecycle.

### Job

Stores asynchronous work queue.

### ApiKey

Stores API key metadata, prefix, hash, scopes, status, usage timestamp.

### ApiKeyRequestEvent

Stores machine-client request usage analytics per key.

### AuditLog

Stores auditable actions.

### Invitation

Stores workspace invitation lifecycle.

### PasswordResetToken / EmailVerificationToken

Stores one-time token state.

### EmailDeliveryEvent

Stores queued and webhook-derived email lifecycle events.

### AbuseSignal

Stores abuse or suspicious activity findings.

## 13.2 Migration history

Current tracked migrations:

- `20260418185531_init`
- `20260420093000_add_invitations`
- `20260420113000_add_async_jobs`
- `20260420133000_add_unique_visitor_tables`
- `20260421103000_add_custom_domains_and_referrer_host`
- `20260421173000_add_email_delivery_and_abuse_signals`
- `20260421193000_add_api_key_scopes_and_usage_events`

## 14. API Requirements

## 14.1 Auth endpoints

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

## 14.2 Workspace endpoints

- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:workspaceId`
- `PATCH /workspaces/:workspaceId`

## 14.3 Link endpoints

- `GET /workspaces/:workspaceId/links`
- `POST /workspaces/:workspaceId/links`
- `GET /workspaces/:workspaceId/links/:linkId`
- `PATCH /workspaces/:workspaceId/links/:linkId`
- `DELETE /workspaces/:workspaceId/links/:linkId`

## 14.4 Analytics endpoints

- `GET /workspaces/:workspaceId/analytics/summary`
- `GET /workspaces/:workspaceId/analytics/overview`
- `GET /workspaces/:workspaceId/links/:linkId/analytics/summary`
- `GET /workspaces/:workspaceId/links/:linkId/analytics/daily`

## 14.5 Tag endpoints

- `GET /workspaces/:workspaceId/tags`
- `POST /workspaces/:workspaceId/tags`
- `PATCH /workspaces/:workspaceId/tags/:tagId`
- `DELETE /workspaces/:workspaceId/tags/:tagId`
- `POST /workspaces/:workspaceId/links/:linkId/tags`
- `DELETE /workspaces/:workspaceId/links/:linkId/tags/:tagId`

## 14.6 QR endpoints

- `POST /workspaces/:workspaceId/links/:linkId/qr`

## 14.7 Export endpoints

- `POST /workspaces/:workspaceId/exports/links`
- `GET /workspaces/:workspaceId/exports`
- `GET /workspaces/:workspaceId/exports/:exportId`
- `GET /workspaces/:workspaceId/exports/:exportId/download`

## 14.8 User/member endpoints

- `GET /users/me`
- `PATCH /users/me`
- `GET /workspaces/:workspaceId/members`

## 14.9 API-key endpoints

- `GET /workspaces/:workspaceId/api-keys`
- `POST /workspaces/:workspaceId/api-keys`
- `GET /workspaces/:workspaceId/api-keys/:apiKeyId/usage`
- `DELETE /workspaces/:workspaceId/api-keys/:apiKeyId`

## 14.10 Audit endpoints

- `GET /workspaces/:workspaceId/audit-logs`

## 14.11 Invitation endpoints

- `GET /workspaces/:workspaceId/invitations`
- `POST /workspaces/:workspaceId/invitations`
- `DELETE /workspaces/:workspaceId/invitations/:invitationId`
- `GET /invitations/preview`
- `POST /invitations/accept`

## 14.12 Domain endpoints

- `GET /workspaces/:workspaceId/domains`
- `POST /workspaces/:workspaceId/domains`
- `DELETE /workspaces/:workspaceId/domains/:domainId`
- `GET /workspaces/:workspaceId/domains/:domainId/diagnostics`
- `POST /workspaces/:workspaceId/domains/:domainId/refresh-verification`
- `PATCH /workspaces/:workspaceId/domains/:domainId/status`
- `GET /.well-known/url-shortener-domain-verification`

## 14.13 Ops endpoints

- `GET /workspaces/:workspaceId/ops/overview`

## 14.14 Health endpoints

- `GET /health`
- `GET /ready`

## 14.15 Redirect endpoints

- `GET /:slug`
- `GET /r/:domain/:slug` if applicable in routing layer

## 14.16 Email webhook endpoint

- `POST /webhooks/resend`

## 15. Authentication and Authorization

## 15.1 Dashboard auth

- JWT bearer token
- refresh token workflow
- workspace id included in access token payload

## 15.2 Machine auth

- raw API key in `X-API-Key`
- key hash comparison with timing-safe equality
- scope checks per route
- request usage event logging

## 15.3 Workspace authorization

- workspace membership checks on protected resources
- admin/owner checks where necessary
- domain assignment limited to verified domains

## 16. Security Requirements

Implemented:

- password hashing with `argon2`
- refresh token hashing
- email verification
- password reset tokens
- reserved slug protection
- local/private destination URL blocking
- abuse rate limiting and signal persistence
- custom-domain verification
- API-key hashing
- scoped API-key auth
- audit logs
- worker stale-lock recovery

Operational expectations:

- use HTTPS in production
- terminate SSL for custom domains before enabling campaigns
- set strong JWT secrets
- configure Sentry and alert hooks
- use managed PostgreSQL and Redis

## 17. Abuse Protection Requirements

Current safeguards:

- redirect-per-minute limit
- invalid-slug lookup tracking
- IP blocklist support
- user-agent block pattern support
- abuse signal persistence
- bot classification in click analytics

Future candidates:

- IP reputation feeds
- per-workspace anomaly scoring
- admin unblock/block management UI
- WAF rules integration

## 18. Monitoring Requirements

### API

- Sentry exception capture
- startup failure alerts
- health/readiness endpoints

### Worker

- Sentry exception capture
- loop/job failure alerts
- worker health/readiness endpoints

### Frontend

- Next.js Sentry client and server hooks
- global error boundary

### Workspace ops

- recent abuse signals
- recent email delivery events
- export backlog/failures
- domain health counts
- storage provider summary

## 19. Storage Requirements

### Database

- PostgreSQL is authoritative for transactional state

### Cache

- Redis preferred
- local fallback required

### Export files

- local filesystem supported for development
- Cloudflare R2 recommended for production

## 20. Performance Requirements

### Redirects

- cache-first resolution
- request path should not synchronously write analytics aggregates
- analytics should be queued

### Worker

- polling interval configurable
- stale job reclamation required

### Frontend

- auth/session hydration on client startup
- React Query stale time tuning

## 21. Reliability Requirements

- app must continue when Redis is unavailable
- mail misconfiguration must not crash unrelated features
- worker crash must not strand jobs forever
- unique-click counting must remain concurrency-safe

## 22. Deployment Requirements

### Minimum production topology

- web process
- API process
- worker process
- PostgreSQL
- Redis
- object storage

### Required deployment actions

1. set env vars
2. apply Prisma migrations
3. start API
4. start worker
5. start web
6. verify health endpoints
7. test custom domain verification
8. test email and export processing

## 23. Backup and Recovery Requirements

### PostgreSQL

- daily backups
- point-in-time recovery
- restore test in staging

### Exported files

- persistent volume if local
- bucket policies/versioning if R2

### Recovery procedures

- inspect `jobs`, `export_jobs`, `email_delivery_events`, `abuse_signals`
- restart worker if needed
- requeue or recreate exports if a failure occurred before completion

## 24. Testing Requirements

## 24.1 Runtime tests

Existing runtime suite validates:

- Redis recovery
- stale job recovery
- custom-domain verification + redirect + analytics
- export storage behavior

## 24.2 Browser tests

Existing Playwright suite validates:

- login
- dashboard loads
- links page loads
- settings page loads with custom-domain/security sections

## 24.3 Recommended future tests

- invitation accept full flow
- resend webhook signature and event persistence
- API-key scoped access acceptance/rejection
- export download in R2 mode
- link edit/domain reassignment UX

## 25. Known Limitations

- `packages/validation` is still lightly used
- no billing
- no SSO
- no in-product SSL certificate automation
- no advanced role matrix beyond current workspace roles
- no dedicated analytics warehouse
- browser E2E tests require configured credentials

## 26. Recommended Future Work

- billing and plan enforcement
- custom-domain health polling
- 2FA
- admin abuse review console with unblock actions
- advanced analytics warehouse
- richer API documentation
- CI pipeline for browser and runtime suites

## 27. Acceptance Criteria Snapshot

The system is considered functionally complete for the current scope if:

- a user can register, verify, login, and use the dashboard
- a workspace owner can invite and manage members
- a user can create, edit, and delete links
- a visitor can hit a short URL and be redirected correctly
- click data appears in analytics
- a custom domain can be added, verified, and used
- exports can be requested and downloaded after worker completion
- API keys can be created with scopes and used only on allowed routes
- abuse signals and email events are visible in ops surfaces
- runtime tests pass

## 28. File Overview Appendix

This appendix intentionally focuses on meaningful source files and excludes generated/vendor directories such as:

- `node_modules`
- `.next`
- `.runtime` process artifacts

### Root source and config

- `package.json`
- `playwright.config.ts`
- `.env.examples`
- `README.md`
- `docs/SRS.md`

### API source

- `apps/api/src/app.ts`
- `apps/api/src/server.ts`
- `apps/api/src/config/env.ts`
- `apps/api/src/plugins/*`
- `apps/api/src/common/utils/*`
- `apps/api/src/modules/**`

### Web source

- `apps/web/src/app/**`
- `apps/web/src/components/**`
- `apps/web/src/features/**`
- `apps/web/src/lib/**`
- `apps/web/instrumentation*.ts`
- `apps/web/sentry.*.ts`
- `apps/web/next.config.ts`

### Worker source

- `apps/worker/src/worker.ts`
- `apps/worker/src/config/env.ts`
- `apps/worker/src/processors/*`
- `apps/worker/src/utils/*`

### Shared packages

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/**`
- `packages/db/src/*`
- `packages/shared/src/index.ts`
- `packages/validation/src/*`

### Tests and scripts

- `tests/recovery.test.ts`
- `tests/dashboard.e2e.spec.ts`
- `scripts/runtime-checks.ts`

## 29. Final Notes

This SRS is written against the current codebase, not an aspirational future-only architecture. It should be updated whenever one of the following changes:

- schema models or migrations
- route contracts
- auth model
- worker job types
- deployment topology
- monitoring strategy
- custom-domain behavior
