# API Reference

## Overview

This document describes the current HTTP API exposed by `apps/api`.

Base URL examples:

- local API: `http://localhost:4000`
- production API: `https://api.yourdomain.com`

Response format:

- success responses return JSON unless the route is a redirect
- error responses return:

```json
{
  "message": "Human readable error"
}
```

## Authentication

### JWT user authentication

Send:

```http
Authorization: Bearer <access-token>
```

Used for:

- dashboard routes
- workspace management
- user profile actions
- invitations
- custom domains
- audit logs
- API-key administration

### API-key machine authentication

Send:

```http
X-API-Key: usk_xxxxxxxxxxxxxxxxx
```

Used only on machine-enabled routes. API keys are scope-limited.

Supported scopes:

- `links:read`
- `links:write`
- `analytics:read`
- `tags:read`
- `tags:write`
- `exports:read`
- `exports:write`

## Public Endpoints

### `GET /health`

Purpose:

- liveness check

Response:

```json
{
  "ok": true,
  "objectStorage": {
    "provider": "local"
  }
}
```

### `GET /ready`

Purpose:

- readiness check with DB connectivity

Response:

```json
{
  "ok": true,
  "objectStorage": {
    "provider": "r2"
  }
}
```

### `GET /:slug`

Purpose:

- resolve redirect on the default short domain

Behavior:

- returns `302` redirect when link is active
- returns `404` if not found
- returns `410` if expired

### `GET /r/:domain/:slug`

Purpose:

- resolve redirect using path-based domain routing

Behavior:

- similar to default redirect flow

### `GET /.well-known/url-shortener-domain-verification`

Purpose:

- verify a custom domain by token

Query params:

- `token`

Behavior:

- hostname must match configured custom domain
- marks domain verified when token is valid

## Auth Endpoints

Prefix:

- `/auth`

### `POST /auth/register`

Purpose:

- create user account, default workspace, session, and verification email job

Body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "token",
  "sessionId": "uuid",
  "workspaceId": "uuid"
}
```

### `POST /auth/login`

Body:

```json
{
  "email": "jane@example.com",
  "password": "strong-password"
}
```

Response:

- same as register

### `POST /auth/refresh`

Body:

```json
{
  "refreshToken": "token"
}
```

Response:

- new access token + new refresh token + session id + workspace id

### `POST /auth/logout`

Body:

```json
{
  "refreshToken": "token"
}
```

Response:

```json
{
  "success": true
}
```

### `POST /auth/forgot-password`

Body:

```json
{
  "email": "jane@example.com"
}
```

Response:

```json
{
  "success": true
}
```

Notes:

- does not reveal whether the email exists

### `POST /auth/reset-password`

Body:

```json
{
  "token": "one-time-token",
  "password": "new-password"
}
```

### `POST /auth/resend-verification`

Body:

```json
{
  "email": "jane@example.com"
}
```

### `GET /auth/verify-email`

Query params:

- `token`

### `GET /auth/me`

Auth:

- JWT required

Response:

- current user profile

### `POST /auth/change-password`

Auth:

- JWT required

Body:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

## Workspace Endpoints

Prefix:

- `/workspaces`

### `GET /workspaces`

Auth:

- JWT required

Response:

- list of memberships and workspace summaries

### `POST /workspaces`

Auth:

- JWT required

Body:

```json
{
  "name": "Growth Team"
}
```

### `GET /workspaces/:workspaceId`

Auth:

- JWT required

### `PATCH /workspaces/:workspaceId`

Auth:

- JWT required

Body:

```json
{
  "name": "Growth Team",
  "brandingTitle": "Growth Links"
}
```

## User and Member Endpoints

### `GET /users/me`

Auth:

- JWT required

### `PATCH /users/me`

Auth:

- JWT required

Body:

```json
{
  "name": "Jane Doe",
  "avatarUrl": "https://example.com/avatar.png"
}
```

### `GET /workspaces/:workspaceId/members`

Auth:

- JWT required

Response:

- list of workspace members with user profiles and roles

## Link Endpoints

Machine auth support:

- yes

Scopes:

- `links:read`
- `links:write`

### `GET /workspaces/:workspaceId/links`

Auth:

- JWT or API key with `links:read`

Response:

- list of links with tags, counts, domain, slug, status

### `POST /workspaces/:workspaceId/links`

Auth:

- JWT or API key with `links:write`

Body:

```json
{
  "title": "Homepage",
  "destinationUrl": "https://example.com",
  "domain": "default",
  "slug": "home",
  "campaign": "spring-launch",
  "redirectType": "TEMPORARY"
}
```

Notes:

- `slug` optional
- `domain` must be `default` or a verified custom domain

### `GET /workspaces/:workspaceId/links/:linkId`

Auth:

- JWT or API key with `links:read`

### `PATCH /workspaces/:workspaceId/links/:linkId`

Auth:

- JWT or API key with `links:write`

Body:

- partial update of editable fields such as title, destination URL, campaign, domain, redirect type, expiry

### `DELETE /workspaces/:workspaceId/links/:linkId`

Auth:

- JWT or API key with `links:write`

Behavior:

- soft-delete

## Analytics Endpoints

Machine auth support:

- yes

Scopes:

- `analytics:read`

### `GET /workspaces/:workspaceId/analytics/summary`

Response:

```json
{
  "totalLinks": 12,
  "totalClicks": 400,
  "uniqueClicks": 250
}
```

### `GET /workspaces/:workspaceId/analytics/overview`

Response includes:

- totals
- top links
- top referrers
- device breakdown
- country breakdown
- recent clicks

### `GET /workspaces/:workspaceId/links/:linkId/analytics/summary`

Response:

- per-link totals

### `GET /workspaces/:workspaceId/links/:linkId/analytics/daily`

Response:

- array of `{ date, clicks, uniqueClicks }`

## Tag Endpoints

Machine auth support:

- yes

Scopes:

- read: `tags:read`
- write: `tags:write`

### `GET /workspaces/:workspaceId/tags`

### `POST /workspaces/:workspaceId/tags`

Body:

```json
{
  "name": "marketing",
  "color": "#22c55e"
}
```

### `PATCH /workspaces/:workspaceId/tags/:tagId`

### `DELETE /workspaces/:workspaceId/tags/:tagId`

### `POST /workspaces/:workspaceId/links/:linkId/tags`

Body:

```json
{
  "tagId": "uuid"
}
```

### `DELETE /workspaces/:workspaceId/links/:linkId/tags/:tagId`

## QR Endpoints

### `POST /workspaces/:workspaceId/links/:linkId/qr`

Auth:

- JWT required

Response:

- SVG payload and short URL metadata

## Export Endpoints

Machine auth support:

- yes

Scopes:

- read: `exports:read`
- write: `exports:write`

### `POST /workspaces/:workspaceId/exports/links`

Purpose:

- queue a CSV export

Response:

```json
{
  "exportId": "uuid",
  "filename": "links-workspace.csv",
  "status": "PENDING",
  "reused": false
}
```

### `GET /workspaces/:workspaceId/exports`

### `GET /workspaces/:workspaceId/exports/:exportId`

### `GET /workspaces/:workspaceId/exports/:exportId/download`

Behavior:

- returns CSV content when export is complete

## Invitation Endpoints

### `GET /workspaces/:workspaceId/invitations`

Auth:

- JWT required

### `POST /workspaces/:workspaceId/invitations`

Auth:

- JWT required

Body:

```json
{
  "email": "teammate@example.com",
  "role": "MEMBER"
}
```

### `DELETE /workspaces/:workspaceId/invitations/:invitationId`

### `GET /invitations/accept`

Purpose:

- preview invitation by token

### `POST /invitations/accept`

Auth:

- JWT required

Body:

```json
{
  "token": "one-time-token"
}
```

## Domain Endpoints

### `GET /workspaces/:workspaceId/domains`

Auth:

- JWT required

### `POST /workspaces/:workspaceId/domains`

Body:

```json
{
  "hostname": "go.example.com"
}
```

### `DELETE /workspaces/:workspaceId/domains/:domainId`

### `GET /workspaces/:workspaceId/domains/:domainId/diagnostics`

### `POST /workspaces/:workspaceId/domains/:domainId/refresh-verification`

### `PATCH /workspaces/:workspaceId/domains/:domainId/status`

Body:

```json
{
  "status": "DISABLED"
}
```

## API Key Endpoints

Admin-only:

- JWT required

### `GET /workspaces/:workspaceId/api-keys`

Response:

- API key metadata including scopes, prefix, status, timestamps

### `POST /workspaces/:workspaceId/api-keys`

Body:

```json
{
  "name": "Backend integration",
  "scopes": [
    "links:read",
    "analytics:read"
  ]
}
```

Response:

- includes the raw API key exactly once

### `GET /workspaces/:workspaceId/api-keys/:apiKeyId/usage`

Response:

```json
{
  "apiKeyId": "uuid",
  "requestsLast7Days": 420,
  "topRoutes": [
    {
      "route": "/workspaces/:workspaceId/links",
      "requests": 300
    }
  ]
}
```

### `DELETE /workspaces/:workspaceId/api-keys/:apiKeyId`

Behavior:

- revokes key

## Audit Endpoints

### `GET /workspaces/:workspaceId/audit-logs`

Auth:

- JWT required

## Ops Endpoints

### `GET /workspaces/:workspaceId/ops/overview`

Auth:

- JWT required

Response includes:

- object storage provider
- export health
- active API keys
- recent email delivery events
- recent abuse signals
- domain health counts

## Email Webhook Endpoint

### `POST /webhooks/resend`

Purpose:

- ingest email provider delivery events

Requirements:

- valid webhook signature
- `RESEND_WEBHOOK_SECRET` configured

## Status Codes

Common status codes:

- `200` success
- `201` created where applicable
- `302` redirect
- `400` invalid request
- `401` unauthenticated
- `403` forbidden or missing required API-key scope
- `404` not found
- `409` conflict
- `410` gone / expired link
- `429` rate-limited
- `500` server error

## Rate Limiting

Several routes define route-specific limits, especially:

- register/login/auth recovery routes
- invitations
- custom-domain creation/verification refresh
- exports
- redirects

Redirect routes also have abuse detection beyond Fastify route rate limiting.

## Operational Notes

- API keys are now intentionally limited to machine-enabled routes only.
- User-facing admin/dashboard routes require JWT auth.
- Export and click processing are asynchronous.
- Email sending is asynchronous.
- Redirect analytics are processed by the worker.

## Related Docs

- project overview: [README.md](D:\Projects_Components\url-shortener\README.md)
- full system specification: [SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md)
- deployment/operator guide: [DEPLOYMENT_RUNBOOK.md](D:\Projects_Components\url-shortener\docs\DEPLOYMENT_RUNBOOK.md)
