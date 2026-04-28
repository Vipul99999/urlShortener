# Database

This is the short database guide for future work.

For the full table-by-table reference, use:

- [DB_SCHEMA_REFERENCE.md](D:\Projects_Components\url-shortener\docs\DB_SCHEMA_REFERENCE.md)

## Database Role

PostgreSQL stores:

- users and sessions
- workspaces and members
- links and tags
- analytics support data
- custom domains
- export jobs
- background jobs
- API keys and usage events
- audit logs
- abuse signals

## Main Model Groups

### Identity

- `users`
- `auth_accounts`
- `sessions`
- `password_reset_tokens`
- `email_verification_tokens`

### Multi-tenant product model

- `workspaces`
- `workspace_members`
- `invitations`

### Link system

- `links`
- `tags`
- `link_tags`
- `qr_codes`
- `workspace_domains`

### Analytics

- `link_click_events`
- `link_daily_stats`
- `link_unique_visitors`
- `link_daily_unique_visitors`

### Background processing and exports

- `jobs`
- `export_jobs`

### Security and operations

- `api_keys`
- `api_key_request_events`
- `audit_logs`
- `email_delivery_events`
- `abuse_signals`

## What To Read Before Schema Changes

1. [DB_SCHEMA_REFERENCE.md](D:\Projects_Components\url-shortener\docs\DB_SCHEMA_REFERENCE.md)
2. [SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md)
3. `packages/db/prisma/schema.prisma`

## Migration Rule

Whenever the schema changes:

1. update `schema.prisma`
2. create a migration
3. regenerate Prisma client
4. update affected docs if the change is meaningful
