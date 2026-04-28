# Testing

This document explains the testing model for UrlShortener.

## Current Test Layers

### Type checks

- API TypeScript
- web TypeScript
- worker TypeScript

### Runtime tests

Current runtime coverage includes:

- Redis recovery behavior
- stale job recovery
- custom-domain and analytics flow
- export storage behavior

### Browser tests

Playwright coverage exists for dashboard-level browser flows.

## Commands

### Type checks

```bash
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/web exec tsc --noEmit
pnpm -C apps/worker exec tsc --noEmit
```

### Runtime tests

```bash
npm run test
```

### Browser tests

```bash
pnpm test:e2e
```

## Environment Needed For Runtime Tests

Runtime tests are not pure unit tests. They expect supporting services such as:

- PostgreSQL
- Redis

If those services are missing, runtime tests will fail for environment reasons.

## Recommended Future Coverage

- more API integration tests
- more browser tests for onboarding and settings
- deployed-environment smoke tests
- custom-domain live validation in staging
