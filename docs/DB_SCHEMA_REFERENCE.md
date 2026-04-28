# DB Schema Reference

This document explains the PostgreSQL schema used by UrlShortener. It is the practical companion to [openapi.yaml](D:\Projects_Components\url-shortener\docs\openapi.yaml), [API_REFERENCE.md](D:\Projects_Components\url-shortener\docs\API_REFERENCE.md), and [SRS.md](D:\Projects_Components\url-shortener\docs\SRS.md).

## Purpose

The schema is designed for a multi-tenant SaaS product with:

- user authentication and long-lived sessions
- workspace-based collaboration
- short-link creation and redirect resolution
- asynchronous jobs and export workflows
- analytics and abuse signal tracking
- custom domains, audit logs, and API-key integrations

The database is PostgreSQL and is accessed through Prisma.

## Enums

### `UserStatus`

- `ACTIVE`: normal account state.
- `INVITED`: reserved state for invited but not fully onboarded users.
- `SUSPENDED`: account is blocked from normal activity.
- `DELETED`: soft-deleted or retired account state.

### `WorkspacePlan`

- `FREE`
- `PRO`
- `BUSINESS`
- `ENTERPRISE`

Used for future packaging, entitlement, and billing logic.

### `WorkspaceMemberRole`

- `OWNER`: top-level workspace control.
- `ADMIN`: administrative access to workspace operations.
- `EDITOR`: can manage links and related content.
- `VIEWER`: read-oriented role.

### `LinkStatus`

- `ACTIVE`: redirectable.
- `DISABLED`: manually disabled.
- `EXPIRED`: time-based expiry reached.
- `DELETED`: soft-deleted and not redirectable.

### `RedirectType`

- `TEMPORARY`: HTTP 302-style behavior.
- `PERMANENT`: HTTP 301-style behavior.

### `AuthProvider`

- `LOCAL`
- `GOOGLE`
- `GITHUB`
- `MICROSOFT`

### `ExportStatus`

- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

### `ApiKeyStatus`

- `ACTIVE`
- `REVOKED`

### `AuditActorType`

- `USER`
- `SYSTEM`
- `API_KEY`

### `InvitationStatus`

- `PENDING`
- `ACCEPTED`
- `REVOKED`
- `EXPIRED`

### `CustomDomainStatus`

- `PENDING`
- `VERIFIED`
- `DISABLED`

### `JobKind`

- `SEND_VERIFICATION_EMAIL`
- `SEND_PASSWORD_RESET_EMAIL`
- `SEND_INVITATION_EMAIL`
- `GENERATE_LINKS_EXPORT`
- `PROCESS_CLICK_EVENT`

### `JobStatus`

- `PENDING`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

## Core Identity Tables

### `users`

Stores the primary identity for each account.

Fields:

- `id`: UUID primary key.
- `email`: unique citext login identity.
- `passwordHash`: hashed local password for email/password auth.
- `name`: display name.
- `avatarUrl`: optional avatar/image URL.
- `emailVerified`: verification state for email flows.
- `status`: lifecycle state from `UserStatus`.
- `lastLoginAt`: last successful login timestamp.
- `createdAt`, `updatedAt`: normal lifecycle timestamps.
- `deletedAt`: soft-delete marker.

Relationships:

- has many `auth_accounts`
- has many `sessions`
- has many `workspace_members`
- has many created `links`
- has many created `api_keys`
- has many `audit_logs`
- has many `password_reset_tokens`
- has many `email_verification_tokens`
- has many sent `invitations`

Indexes:

- `status`
- `createdAt`

Operational notes:

- `email` uses citext, so email matching is case-insensitive.
- `deletedAt` enables safer retention than hard deletion.

### `auth_accounts`

Stores federated identity connections for future or existing OAuth providers.

Fields:

- `id`: UUID primary key.
- `userId`: FK to `users`.
- `provider`: enum `AuthProvider`.
- `providerUserId`: provider-native identity id.
- `providerEmail`: optional provider email snapshot.
- `createdAt`, `updatedAt`

Constraints and indexes:

- unique on `provider + providerUserId`
- index on `userId`

Operational notes:

- enables one user to be associated with multiple login providers.

### `sessions`

Stores refresh-token sessions and device context.

Fields:

- `id`: UUID primary key.
- `userId`: FK to `users`.
- `refreshTokenHash`: hashed refresh token.
- `jti`: unique token/session identifier.
- `userAgent`: optional user-agent snapshot.
- `ipAddress`: optional source IP.
- `expiresAt`: refresh expiry.
- `revokedAt`: revocation marker.
- `createdAt`, `updatedAt`

Indexes:

- `userId`
- `expiresAt`
- `revokedAt`

Operational notes:

- supports token rotation and session invalidation.
- `revokedAt` lets the application reject reused rotated tokens.

## Workspace and Collaboration Tables

### `workspaces`

Tenant boundary for teams, data ownership, and feature grouping.

Fields:

- `id`: UUID primary key.
- `name`: customer-visible workspace name.
- `slug`: unique friendly identifier.
- `plan`: `WorkspacePlan`.
- `brandingTitle`: optional UI/display branding field.
- `createdAt`, `updatedAt`
- `deletedAt`

Relationships:

- has many `workspace_members`
- has many `links`
- has many `tags`
- has many `export_jobs`
- has many `api_keys`
- has many `audit_logs`
- has many `invitations`
- has many `workspace_domains`
- has many `email_delivery_events`
- has many `abuse_signals`

Indexes:

- `createdAt`

Operational notes:

- this is the key multi-tenant partition throughout the system.

### `workspace_members`

Associates users with workspaces and roles.

Fields:

- `id`: UUID primary key.
- `workspaceId`: FK to `workspaces`.
- `userId`: FK to `users`.
- `role`: `WorkspaceMemberRole`.
- `joinedAt`

Constraints and indexes:

- unique on `workspaceId + userId`
- index on `userId`
- index on `workspaceId + role`

Operational notes:

- one user can belong to many workspaces.
- role checks in services and route guards should reference this table.

### `invitations`

Tracks pending and completed workspace invites.

Fields:

- `id`: UUID primary key.
- `workspaceId`: FK to `workspaces`.
- `invitedById`: FK to `users`.
- `email`: recipient email.
- `role`: requested member role.
- `tokenHash`: unique hashed invite token.
- `status`: `InvitationStatus`.
- `expiresAt`: invite expiry time.
- `acceptedAt`: accept timestamp.
- `revokedAt`: revoke timestamp.
- `createdAt`, `updatedAt`

Indexes:

- `workspaceId + status + createdAt`
- `email + status`

Operational notes:

- tokens are stored as hashes, not raw values.
- acceptance typically creates a `workspace_members` row.

## Link Management Tables

### `links`

The central short-link entity.

Fields:

- `id`: UUID primary key.
- `workspaceId`: owning workspace.
- `createdById`: creator user.
- `domain`: `default` or a verified custom hostname.
- `slug`: path segment.
- `title`: optional human label.
- `destinationUrl`: original outbound URL.
- `normalizedUrl`: sanitized/normalized version used internally.
- `description`: optional note.
- `campaign`: optional campaign label.
- `status`: `LinkStatus`.
- `redirectType`: `RedirectType`.
- `passwordHash`: optional hashed link password.
- `expiresAt`: expiry time.
- `lastClickedAt`: latest click timestamp.
- `totalClicks`: aggregate clicks.
- `uniqueClicks`: aggregate unique visitors.
- `isArchived`: UI-oriented archive flag.
- `createdAt`, `updatedAt`
- `deletedAt`

Constraints and indexes:

- unique on `domain + slug`
- indexes on `workspaceId`
- `workspaceId + createdAt`
- `workspaceId + status`
- `createdById`
- `slug`
- `expiresAt`
- `lastClickedAt`
- `deletedAt`

Operational notes:

- `domain + slug` is the true public identity of a short link.
- `passwordHash` enables protected-link behavior without storing raw secrets.
- `deletedAt` is preferred over hard deletion for auditability.

### `tags`

Workspace-scoped labels for link organization.

Fields:

- `id`: UUID primary key.
- `workspaceId`: owning workspace.
- `name`: tag label.
- `color`: UI color hint.
- `createdAt`

Constraints and indexes:

- unique on `workspaceId + name`
- index on `workspaceId`

### `link_tags`

Join table between links and tags.

Fields:

- `linkId`: FK to `links`.
- `tagId`: FK to `tags`.
- `assignedAt`

Constraints and indexes:

- composite primary key on `linkId + tagId`
- index on `tagId`

Operational notes:

- many-to-many relationship for organization and filtering.

### `qr_codes`

Records generated QR code artifacts for links.

Fields:

- `id`: UUID primary key.
- `linkId`: FK to `links`.
- `generatedById`: user who created the QR.
- `format`: output format such as `png` or `svg`.
- `size`: size hint.
- `fileUrl`: optional durable file location.
- `createdAt`

Indexes:

- `linkId`
- `generatedById`

Operational notes:

- some deployments may keep only metadata and return generated SVG directly.

## Analytics Tables

### `link_daily_stats`

Aggregated per-link daily counters.

Fields:

- `id`: UUID primary key.
- `linkId`: FK to `links`.
- `date`: UTC day bucket.
- `clicks`: total clicks for that day.
- `uniqueClicks`: unique clicks for that day.
- `createdAt`, `updatedAt`

Constraints and indexes:

- unique on `linkId + date`
- index on `date`
- index on `linkId + date`

Operational notes:

- powers charting and dashboard rollups without scanning raw events.

### `link_click_events`

Raw click-event log for analytics and abuse visibility.

Fields:

- `id`: UUID primary key.
- `linkId`: FK to `links`.
- `clickedAt`
- `ipHash`: hashed visitor IP.
- `country`
- `city`
- `referrer`
- `referrerHost`
- `userAgent`
- `deviceType`
- `browser`
- `os`
- `isBot`

Indexes:

- `linkId + clickedAt`
- `clickedAt`
- `country`

Operational notes:

- IPs are stored as hashes for a more privacy-aware model.
- useful for recent-activity views, top referrers, geo/device reporting, and abuse analysis.

### `link_unique_visitors`

Dedup table for all-time unique visitors per link.

Fields:

- `id`: UUID primary key.
- `linkId`: FK to `links`.
- `ipHash`: hashed visitor identity.
- `firstSeenAt`

Constraints and indexes:

- unique on `linkId + ipHash`
- index on `linkId`

Operational notes:

- solves race-prone uniqueness counting by making dedupe database-enforced.

### `link_daily_unique_visitors`

Dedup table for daily unique visitors per link.

Fields:

- `id`: UUID primary key.
- `linkId`: FK to `links`.
- `date`: UTC day bucket.
- `ipHash`
- `firstSeenAt`

Constraints and indexes:

- unique on `linkId + date + ipHash`
- index on `linkId + date`

Operational notes:

- used to increment daily unique counts exactly once per visitor per day.

## Custom Domain Table

### `workspace_domains`

Stores workspace-owned custom domains used for branded short links.

Fields:

- `id`: UUID primary key.
- `workspaceId`: owning workspace.
- `hostname`: unique full hostname such as `go.example.com`.
- `status`: `CustomDomainStatus`.
- `verificationToken`: unique token for `/.well-known` verification.
- `verifiedAt`: verification time.
- `createdAt`, `updatedAt`

Indexes:

- `workspaceId + status`
- `workspaceId + createdAt`

Operational notes:

- hostnames are globally unique across all workspaces.
- subdomain-based onboarding is the safer production path for this project.

## Export and Job Tables

### `export_jobs`

Tracks export requests and generated artifacts.

Fields:

- `id`: UUID primary key.
- `workspaceId`: owning workspace.
- `requestedById`: user who requested export.
- `type`: export type, currently focused on links exports.
- `status`: `ExportStatus`.
- `fileUrl`: object-storage location or public URL.
- `fileName`: downloadable file name.
- `contentType`: MIME type.
- `content`: legacy inline content field retained for compatibility.
- `filtersJson`: requested filter payload.
- `errorMessage`: failure reason.
- `createdAt`, `updatedAt`, `completedAt`

Indexes:

- `workspaceId + createdAt`
- `requestedById`
- `status`

Operational notes:

- production flow should prefer object storage via `fileUrl`.
- `content` exists but should not be the primary storage strategy long-term.

### `jobs`

Generic durable job queue for background work.

Fields:

- `id`: UUID primary key.
- `kind`: `JobKind`.
- `status`: `JobStatus`.
- `payloadJson`: job payload.
- `resultJson`: optional structured result.
- `errorMessage`: last failure reason.
- `attempts`: current attempt count.
- `maxAttempts`: retry limit.
- `availableAt`: earliest claim time.
- `lockedAt`: claim timestamp.
- `lockedBy`: worker identity.
- `completedAt`: completion time.
- `createdAt`, `updatedAt`

Indexes:

- `status + availableAt`
- `kind + status + availableAt`

Operational notes:

- worker code supports stale-lock recovery for crashed processors.
- job payloads should stay compact and reference durable entities rather than carry large blobs.

## API Integration Tables

### `api_keys`

Machine-auth credentials for workspace integrations.

Fields:

- `id`: UUID primary key.
- `workspaceId`: owning workspace.
- `createdById`: issuing user.
- `name`: key label.
- `scopes`: string array of allowed capabilities.
- `keyPrefix`: short visible prefix for identification.
- `keyHash`: hashed raw secret.
- `lastUsedAt`
- `expiresAt`
- `status`: `ApiKeyStatus`.
- `createdAt`
- `revokedAt`

Indexes:

- `workspaceId`
- `createdById`
- `status`

Operational notes:

- raw API keys are returned once at creation and never stored plaintext.
- scopes let machine clients be limited to specific route families.

### `api_key_request_events`

Usage and observability table for machine-auth traffic.

Fields:

- `id`: UUID primary key.
- `apiKeyId`: FK to `api_keys`.
- `method`: HTTP method.
- `route`: matched route path.
- `statusCode`
- `latencyMs`
- `ipHash`
- `createdAt`

Indexes:

- `apiKeyId + createdAt`
- `route + createdAt`

Operational notes:

- powers per-key usage summaries and supports anomaly detection.

## Security and Operations Tables

### `audit_logs`

High-level actor/event trail for workspace actions.

Fields:

- `id`: UUID primary key.
- `workspaceId`: optional workspace scope.
- `actorUserId`: optional actor user.
- `actorType`: `AuditActorType`.
- `action`: event verb.
- `entityType`
- `entityId`
- `metadataJson`
- `ipAddress`
- `createdAt`

Indexes:

- `workspaceId + createdAt`
- `actorUserId + createdAt`
- `entityType + entityId`
- `action + createdAt`

Operational notes:

- meant for operational traceability rather than verbose event sourcing.

### `email_delivery_events`

Stores outgoing email lifecycle events from providers like Resend.

Fields:

- `id`: UUID primary key.
- `workspaceId`: optional related workspace.
- `triggeredByUserId`: initiating user when known.
- `provider`: `smtp` or `resend` style provider name.
- `emailType`: product-specific email category.
- `recipient`
- `providerMessageId`
- `eventType`: delivered, bounced, complained, and similar values.
- `status`
- `payloadJson`
- `createdAt`

Indexes:

- `workspaceId + createdAt`
- `provider + eventType + createdAt`
- `providerMessageId`

Operational notes:

- useful for debugging onboarding and invite delivery issues.

### `abuse_signals`

Persistent evidence of suspicious traffic or automated abuse.

Fields:

- `id`: UUID primary key.
- `workspaceId`: optional related workspace.
- `source`: subsystem that generated the signal.
- `kind`: classified abuse type.
- `ipHash`
- `hostname`
- `path`
- `userAgent`
- `actionTaken`
- `metadataJson`
- `createdAt`

Indexes:

- `workspaceId + createdAt`
- `source + kind + createdAt`
- `ipHash + createdAt`

Operational notes:

- complements rate limiting by giving operators historical visibility.

## Token Tables

### `password_reset_tokens`

Password-reset token ledger.

Fields:

- `id`: UUID primary key.
- `userId`: FK to `users`.
- `tokenHash`: unique hashed reset token.
- `expiresAt`
- `usedAt`
- `createdAt`

Indexes:

- `userId`
- `expiresAt`

Operational notes:

- raw reset tokens are never stored.

### `email_verification_tokens`

Email-verification token ledger.

Fields:

- `id`: UUID primary key.
- `userId`: FK to `users`.
- `tokenHash`: unique hashed verification token.
- `expiresAt`
- `usedAt`
- `createdAt`

Indexes:

- `userId`
- `expiresAt`

Operational notes:

- supports verify-email and resend flows with one-time tokens.

## Table Design Notes

### Soft deletion

Several top-level entities use `deletedAt` rather than hard delete. This is useful for:

- operational safety
- debugging and auditability
- eventual restoration workflows

### UUIDs

Every major table uses UUID primary keys to avoid predictable ids and to simplify distributed growth.

### Timestamp strategy

The schema consistently uses `createdAt`, `updatedAt`, and lifecycle markers like `revokedAt`, `acceptedAt`, or `completedAt` to support:

- auditability
- analytics windows
- operational debugging

### Privacy posture

The analytics pipeline stores hashed IPs rather than raw IPs in click and API-key request logs. The system still handles real IPs transiently at request time for security and operational purposes, but persistent analytics tables favor hashed representations.

## Recommended Future Schema Evolutions

- move remaining export inline content usage fully to object storage and deprecate `export_jobs.content`
- add subscription, invoice, and entitlement tables if billing is introduced
- add organization-level settings if multi-workspace enterprise accounts become a product requirement
- add admin review state for abuse signals if a moderation workflow is needed
- add certificate or DNS health history if custom-domain operations grow more advanced
