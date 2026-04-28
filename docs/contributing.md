# Contributing

This guide is for future teammates working in the UrlShortener monorepo.

## Goals

When contributing, keep these priorities in mind:

- protect redirect reliability
- preserve product usability
- avoid accidental tenant or security regressions
- keep docs and code aligned

## Repo Basics

Monorepo layout:

- `apps/web`
- `apps/api`
- `apps/worker`
- `packages/db`
- `packages/shared`
- `docs`
- `tests`
- `scripts`

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Generate Prisma client if needed:

```bash
pnpm db:generate
```

3. Apply migrations:

```bash
pnpm db:deploy
```

4. Start services:

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## Common Commands

### Build

```bash
pnpm build
```

### Type checks

Use the app-specific TypeScript checks when changing isolated areas.

### Runtime tests

```bash
npm run test
```

Notes:

- runtime tests require local Postgres and Redis

### Browser tests

```bash
pnpm test:e2e
```

## Contribution Rules

### 1. Keep public redirect paths safe

Be careful with anything touching:

- `apps/api/src/modules/redirects`
- `apps/api/src/common/utils/link-cache.ts`
- abuse or domain resolution logic

### 2. Respect multi-tenant boundaries

Always verify workspace membership and role behavior when editing:

- links
- domains
- invitations
- exports
- API keys
- analytics

### 3. Avoid weakening security defaults

Do not loosen:

- destination URL validation
- auth lockouts
- API-key scope checks
- domain verification rules

### 4. Keep docs updated

If you change architecture, routes, schema, or deployment expectations, update the relevant docs in `docs/`.

## When Changing The Database

1. update `packages/db/prisma/schema.prisma`
2. create a migration
3. regenerate Prisma client
4. update:
   - [database.md](D:\Projects_Components\url-shortener\docs\database.md)
   - [DB_SCHEMA_REFERENCE.md](D:\Projects_Components\url-shortener\docs\DB_SCHEMA_REFERENCE.md)
   - API docs if route behavior changes

## When Changing The API

Update:

- [api.md](D:\Projects_Components\url-shortener\docs\api.md)
- [API_REFERENCE.md](D:\Projects_Components\url-shortener\docs\API_REFERENCE.md)
- [openapi.yaml](D:\Projects_Components\url-shortener\docs\openapi.yaml) if needed
- [POSTMAN_COLLECTION.json](D:\Projects_Components\url-shortener\docs\POSTMAN_COLLECTION.json) if request flows change

## When Changing Frontend UX

Prefer:

- clearer onboarding
- better empty states
- stronger success feedback
- fewer confusing operational moments

Avoid:

- adding noise without improving clarity
- weakening mobile behavior
- hiding important trust or status signals

## Pull Request Checklist

Before considering work ready:

- code compiles
- relevant tests pass
- no obvious security regressions
- docs updated if behavior changed
- env requirements updated if new config was introduced

## Good First Areas For Future Contributors

- browser E2E coverage
- onboarding polish
- analytics visualization improvements
- ops/admin surfaces
- custom-domain UX improvements

## Related Docs

- [DOCS_INDEX.md](D:\Projects_Components\url-shortener\docs\DOCS_INDEX.md)
- [architecture.md](D:\Projects_Components\url-shortener\docs\architecture.md)
- [security.md](D:\Projects_Components\url-shortener\docs\security.md)
- [testing.md](D:\Projects_Components\url-shortener\docs\testing.md)
