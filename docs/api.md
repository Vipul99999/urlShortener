# API

This is the practical API document for day-to-day development.

For the full endpoint catalog and examples, use:

- [API_REFERENCE.md](D:\Projects_Components\url-shortener\docs\API_REFERENCE.md)
- [openapi.yaml](D:\Projects_Components\url-shortener\docs\openapi.yaml)
- [POSTMAN_COLLECTION.json](D:\Projects_Components\url-shortener\docs\POSTMAN_COLLECTION.json)

## Base URLs

- local: `http://localhost:4000`
- production: `https://api.yourdomain.com`

## Authentication Modes

### User JWT

Used for:

- dashboard access
- settings
- members
- custom domains
- audit logs
- API-key management

Header:

```http
Authorization: Bearer <access-token>
```

### API key

Used for machine-enabled routes only.

Header:

```http
X-API-Key: usk_xxxxxxxxxxxxxxxxx
```

Notes:

- API keys are scoped
- API keys are rate-limited
- API keys now have safer default expiry windows
- do not send `Authorization` and `X-API-Key` together

## Main Route Groups

### Health

- `GET /health`
- `GET /ready`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/resend-verification`
- `GET /auth/verify-email`
- `POST /auth/change-password`

### Workspaces and users

- `GET /workspaces`
- `POST /workspaces`
- `GET /workspaces/:workspaceId`
- `PATCH /workspaces/:workspaceId`
- `GET /users/me`
- `PATCH /users/me`
- `GET /workspaces/:workspaceId/members`

### Links

- `GET /workspaces/:workspaceId/links`
- `POST /workspaces/:workspaceId/links`
- `GET /workspaces/:workspaceId/links/:linkId`
- `PATCH /workspaces/:workspaceId/links/:linkId`
- `DELETE /workspaces/:workspaceId/links/:linkId`

### Redirects

- `GET /:slug`
- `GET /r/:domain/:slug`

### Analytics

- `GET /workspaces/:workspaceId/analytics/summary`
- `GET /workspaces/:workspaceId/analytics/overview`
- `GET /workspaces/:workspaceId/links/:linkId/analytics/summary`
- `GET /workspaces/:workspaceId/links/:linkId/analytics/daily`

### Tags

- `GET /workspaces/:workspaceId/tags`
- `POST /workspaces/:workspaceId/tags`
- `PATCH /workspaces/:workspaceId/tags/:tagId`
- `DELETE /workspaces/:workspaceId/tags/:tagId`
- `POST /workspaces/:workspaceId/links/:linkId/tags`
- `DELETE /workspaces/:workspaceId/links/:linkId/tags/:tagId`

### QR

- `POST /workspaces/:workspaceId/links/:linkId/qr`

### Exports

- `POST /workspaces/:workspaceId/exports/links`
- `GET /workspaces/:workspaceId/exports`
- `GET /workspaces/:workspaceId/exports/:exportId`
- `GET /workspaces/:workspaceId/exports/:exportId/download`

### Invitations

- `GET /workspaces/:workspaceId/invitations`
- `POST /workspaces/:workspaceId/invitations`
- `DELETE /workspaces/:workspaceId/invitations/:invitationId`
- `GET /invitations/accept`
- `POST /invitations/accept`

### Domains

- `GET /workspaces/:workspaceId/domains`
- `POST /workspaces/:workspaceId/domains`
- `DELETE /workspaces/:workspaceId/domains/:domainId`
- `GET /workspaces/:workspaceId/domains/:domainId/diagnostics`
- `POST /workspaces/:workspaceId/domains/:domainId/refresh-verification`
- `PATCH /workspaces/:workspaceId/domains/:domainId/status`
- `GET /.well-known/url-shortener-domain-verification`

### API keys

- `GET /workspaces/:workspaceId/api-keys`
- `POST /workspaces/:workspaceId/api-keys`
- `GET /workspaces/:workspaceId/api-keys/:apiKeyId/usage`
- `DELETE /workspaces/:workspaceId/api-keys/:apiKeyId`

### Ops and audit

- `GET /workspaces/:workspaceId/audit-logs`
- `GET /workspaces/:workspaceId/ops/overview`

### Webhooks

- `POST /webhooks/resend`

## Important API Behaviors

### Redirect safety

- redirects are cached
- suspicious user agents are throttled more aggressively
- repeated misses can trigger temporary blocks
- disabled or invalid custom domains do not resolve

### Destination URL safety

The API rejects:

- local/private network destinations
- raw IP destinations
- embedded-credential URLs
- unusual ports outside the allowed web set

### API-key safety

- raw key is shown once
- only hash is stored
- invalid attempts are tracked
- repeated invalid attempts can lock out a source IP temporarily

## Recommended Companion Docs

- [database.md](D:\Projects_Components\url-shortener\docs\database.md)
- [security.md](D:\Projects_Components\url-shortener\docs\security.md)
- [deployment.md](D:\Projects_Components\url-shortener\docs\deployment.md)
