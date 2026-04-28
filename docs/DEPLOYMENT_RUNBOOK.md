# Deployment Runbook

## Purpose

This runbook is for deploying, validating, operating, and recovering the UrlShortener system in production.

It covers:

- infrastructure expectations
- environment setup
- pre-deploy checklist
- deployment order
- post-deploy verification
- rollback strategy
- incident response

## 1. Production Topology

Minimum recommended topology:

- `web`: Next.js frontend
- `api`: Fastify API + redirect service
- `worker`: background processor
- PostgreSQL
- Redis
- object storage
- DNS / CDN / TLS edge

Recommended managed services:

- PostgreSQL: managed provider with backups and PITR
- Redis: managed Redis
- object storage: Cloudflare R2
- edge/CDN: Cloudflare or equivalent
- email: Resend
- error tracking: Sentry

## 2. Required Services

### Application services

- frontend process
- API process
- worker process

### Data services

- PostgreSQL
- Redis
- object storage bucket

### External services

- email provider
- DNS provider
- monitoring / alerting provider

## 3. Environment Variables

Use `.env.examples` as baseline.

### Critical envs

```env
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
APP_URL=
API_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SHORT_URL_BASE=
REDIS_URL=
AUTH_LOGIN_MAX_ATTEMPTS=
AUTH_LOGIN_LOCK_DURATION_MS=
API_KEY_DEFAULT_TTL_DAYS=
ABUSE_SUSPICIOUS_REDIRECT_MAX_PER_MINUTE=
```

### Object storage

```env
OBJECT_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_ENDPOINT=
R2_PUBLIC_BASE_URL=
```

### Email

```env
EMAIL_PROVIDER=resend
MAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=
```

### Monitoring

```env
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
ALERT_WEBHOOK_URL=
ALERT_WEBHOOK_BEARER_TOKEN=
```

### Worker and jobs

```env
JOB_POLL_INTERVAL_MS=1000
JOB_STALE_LOCK_TIMEOUT_MS=300000
WORKER_ERROR_BACKOFF_MS=5000
WORKER_HEALTH_HOST=127.0.0.1
WORKER_HEALTH_PORT=4010
```

### Domain and cache

```env
CUSTOM_DOMAIN_TARGET_HOST=
NEXT_PUBLIC_CUSTOM_DOMAIN_TARGET_HOST=
REDIS_RECONNECT_INTERVAL_MS=30000
```

## 4. Pre-Deploy Checklist

Before deploying:

1. Confirm `pnpm install` succeeds locally or in CI.
2. Confirm API, worker, and web TypeScript checks pass.
3. Confirm `npm run test` passes.
4. Confirm latest Prisma client is generated.
5. Confirm all required secrets are present in deployment environment.
6. Confirm Postgres is reachable.
7. Confirm Redis is reachable.
8. Confirm object storage bucket exists if using R2.
9. Confirm Resend sender domain and webhook secret are configured.
10. Confirm Sentry projects/DSNs are ready.

## 5. Build and Release Order

Recommended order:

1. build artifacts
2. apply DB migrations
3. deploy API
4. deploy worker
5. deploy web
6. run post-deploy checks

### Build commands

```bash
pnpm build:api
pnpm build:worker
pnpm build:web
```

### Migration command

```bash
pnpm db:deploy
```

## 6. Deployment Procedure

### Step 1: Apply schema changes

Run:

```bash
pnpm db:deploy
```

Expected outcome:

- migrations apply successfully
- no pending incompatible schema drift

### Step 2: Deploy API

Run/start:

```bash
pnpm start:api
```

Verify:

- process starts
- `/health` returns `200`
- `/ready` returns `200`

### Step 3: Deploy worker

Run/start:

```bash
pnpm start:worker
```

Verify:

- worker starts
- worker `/health` returns `200`
- worker `/ready` returns `200`

### Step 4: Deploy web

Run/start:

```bash
pnpm start:web
```

Verify:

- home page loads
- login page loads
- dashboard loads after auth

## 7. Post-Deploy Validation

Run these checks in order.

### 7.1 Health checks

- `GET /health`
- `GET /ready`
- worker `/health`
- worker `/ready`

### 7.2 Auth checks

- login works
- refresh works
- logout works
- forgot/reset password path works

### 7.3 Link checks

- create link
- copy short URL
- redirect resolves
- analytics event appears later

### 7.4 Worker checks

- export can be queued
- export finishes
- invitation email job processes

### 7.5 Domain checks

- add custom domain
- verify custom domain on real hostname
- assign domain to link
- redirect works on domain

### 7.6 API-key checks

- create scoped API key
- call machine-enabled route with allowed scope
- confirm forbidden response on insufficient scope

### 7.7 Monitoring checks

- trigger a controlled app error in non-production or staging
- confirm Sentry receives the event
- confirm alert webhook receives critical notifications

## 8. Production Checklist

### Infrastructure

- managed PostgreSQL enabled
- managed Redis enabled
- object storage configured
- HTTPS enabled
- DNS routed correctly
- worker restart policy configured

### Data safety

- Postgres backups enabled
- PITR enabled
- export object retention plan decided

### Security

- strong JWT secrets set
- no localhost URLs in production config
- alert webhook secured
- Resend webhook secret set
- API keys scoped and reviewed

### Observability

- Sentry DSNs configured
- alert webhook configured
- logs collected
- health checks attached to deployment platform

## 9. Custom Domain Runbook

### Setup

1. Add domain in dashboard settings.
2. Create a subdomain such as `go.example.com`.
3. Point CNAME at your configured target host.
4. Wait for DNS propagation.
5. Confirm TLS certificate issuance at platform or CDN edge.
6. Open the verification URL on the custom domain itself.
7. Re-check diagnostics in settings.
8. Assign domain to a test link.

### Success criteria

- diagnostics show expected routing
- verification succeeds
- domain status becomes `VERIFIED`
- links can be assigned to that domain
- redirect works over HTTPS

### Failure checklist

- DNS record missing
- DNS points to wrong target
- certificate not issued
- verification URL opened on wrong host
- `CUSTOM_DOMAIN_TARGET_HOST` mismatch

## 10. Email Delivery Runbook

### Setup

1. Verify sender domain in Resend.
2. Set `MAIL_FROM`.
3. Set `RESEND_API_KEY`.
4. Set `RESEND_WEBHOOK_SECRET`.
5. Register `POST /webhooks/resend`.

### Validation

- register a user
- confirm verification email job is queued
- confirm delivery event row appears
- confirm webhook event appears if provider sends it

### Failure checklist

- missing API key
- sender domain not verified
- webhook secret mismatch
- webhook endpoint blocked by firewall

## 11. Export Storage Runbook

### Local mode

Use only for development or very small self-managed deployments.

Requirements:

- persistent disk shared appropriately with API/worker environment if downloads need consistent access

### R2 mode

Recommended for production.

Requirements:

- bucket exists
- credentials valid
- endpoint configured
- API and worker share the same object storage config

Validation:

1. queue export
2. wait for worker completion
3. download export
4. confirm `export_jobs.fileUrl` is populated

## 12. Rollback Strategy

### Safe rollback rule

Only roll back app code if:

- the new code introduced a regression
- schema changes are backward-compatible with the prior release

### Rollback order

1. stop new deploy traffic
2. revert web
3. revert API
4. revert worker
5. keep DB schema if old app remains compatible

### If schema is not backward-compatible

- do not blindly roll back application binaries
- assess migration impact first
- prefer forward-fix if production data is already using new schema

## 13. Incident Playbook

## 13.1 API down

Symptoms:

- `/health` or `/ready` failing
- 5xx surge

Immediate actions:

1. check deployment logs
2. verify DB connectivity
3. verify env vars
4. inspect latest release diff
5. inspect Sentry
6. rollback if regression is clearly release-specific and schema-compatible

## 13.2 Worker down

Symptoms:

- exports stuck in `PENDING` or `PROCESSING`
- emails not sending
- analytics lagging

Immediate actions:

1. check worker `/health`
2. check worker logs
3. check DB connectivity
4. restart worker
5. inspect `jobs` table for growing queue
6. inspect stale lock behavior

## 13.3 Redis unavailable

Symptoms:

- redirect latency increases
- logs show cache fallback/reconnect

Immediate actions:

1. verify Redis provider health
2. confirm API still serving redirects
3. inspect reconnect logs
4. restore Redis access

Notes:

- redirects should continue via DB fallback

## 13.4 Postgres degraded

Symptoms:

- readiness failures
- API and worker failures

Immediate actions:

1. check database provider status
2. inspect connection limits
3. inspect slow query and lock reports
4. reduce traffic or pause background-heavy actions if needed
5. restore DB health before resuming normal operations

## 13.5 Email delivery failure

Symptoms:

- queued emails but no provider confirmation
- user complaints about missing emails

Immediate actions:

1. inspect `email_delivery_events`
2. inspect worker logs
3. inspect Resend dashboard
4. validate webhook and API key
5. retry affected flow where appropriate

## 13.6 Custom-domain outage

Symptoms:

- branded links fail while default domain works

Immediate actions:

1. check DNS resolution
2. check certificate status
3. check domain diagnostics endpoint
4. if needed, disable the domain in settings/API and move links back to default domain

## 13.7 Abuse spike

Symptoms:

- redirect flood
- invalid slug probing
- bot-heavy analytics

Immediate actions:

1. inspect `abuse_signals`
2. extend `ABUSE_IP_BLOCKLIST`
3. add temporary `ABUSE_USER_AGENT_BLOCK_PATTERNS`
4. tighten edge/CDN rules if available
5. inspect top targeted paths and domains

## 14. Database Recovery Procedure

### Backup expectations

- daily backups enabled
- point-in-time restore enabled

### Restore procedure

1. create recovery target DB from backup
2. run smoke checks against restored instance
3. validate schema and recent data
4. cut over application if needed
5. verify API and worker readiness

## 15. Operational SQL Checks

Examples of useful things to inspect during incidents:

- recent failed jobs
- stuck export jobs
- recent abuse signals
- recent email delivery events
- recent API-key request events

These checks should be turned into saved queries in your DB console or internal runbooks if this system is used heavily.

## 16. Release Readiness Checklist

Before launch or major release:

1. run `pnpm db:deploy`
2. run TypeScript checks
3. run `npm run test`
4. run browser tests where possible
5. confirm Sentry receiving events
6. confirm alert webhook receiving test event
7. confirm worker healthy
8. confirm Redis connectivity
9. confirm email provider healthy
10. confirm export storage healthy

## 17. Related Docs

- project guide: [README.md](D:\Projects_Components\url-shortener\README.md)
- system specification: [SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md)
- API routes and auth model: [API_REFERENCE.md](D:\Projects_Components\url-shortener\docs\API_REFERENCE.md)
