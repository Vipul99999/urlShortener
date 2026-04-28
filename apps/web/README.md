````md
# UrlShortener Frontend

Modern frontend for the UrlShortener SaaS MVP built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Zustand**, **React Query**, and **Zod**.

This app is the user-facing product for:

- landing page
- authentication
- dashboard
- links management
- analytics
- tags
- QR workflows
- exports
- API keys
- audit logs
- members and invitations
- account settings

---

## Tech Stack

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **Zustand** for auth/session state
- **React Query** for server data fetching and caching
- **Zod** for frontend validation
- **Recharts** for analytics charts
- **Lucide React** for icons

---

## Features

### Marketing / Landing
- polished landing page
- CTA flow to register/login
- testimonials
- FAQ
- pricing section
- social proof/logo strip

### Authentication
- register
- login
- logout
- refresh token handling
- forgot password
- reset password
- email verification
- resend verification
- guest-only route handling
- protected dashboard routing

### Dashboard
- overview cards
- top links
- workspace switcher
- mobile dashboard navigation
- responsive layout

### Links
- create link
- list links
- search links
- sort-ready structure
- tag display in main list
- link details page
- edit link
- copy short URL
- QR generation
- QR download
- delete link

### Tags
- create tags
- attach tags to links
- remove tags from links
- tag visibility in link detail and main list

### Analytics
- workspace summary cards
- top links comparison chart
- summary bar charts
- multi-link analytics view

### Team / Workspace
- members page
- invite member flow
- accept invitation page
- pending invitations
- revoke invitation
- settings page
- change password
- email verification status

### API / Operations
- API key creation
- one-time reveal UI
- API key revoke
- export history page
- audit log page
- audit log search

---

## Project Structure

```text
apps/web/
  src/
    app/
      page.tsx
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
      verify-email/page.tsx
      resend-verification/page.tsx
      accept-invitation/page.tsx
      dashboard/
        layout.tsx
        page.tsx
        links/page.tsx
        links/[linkId]/page.tsx
        links/[linkId]/edit/page.tsx
        analytics/page.tsx
        settings/page.tsx
        change-password/page.tsx
        members/page.tsx
        api-keys/page.tsx
        audit-logs/page.tsx
        exports/page.tsx

    components/
      analytics/
      auth/
      dashboard/
      marketing/
      ui/

    lib/
      api.ts
      auth.ts
      hooks/
      store/
      utils/
      validations/
````

---

## Environment Variables

Create this file:

```text
apps/web/.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Notes

* `NEXT_PUBLIC_API_URL` must point to your backend API
* in production, this should be your deployed backend URL

Example:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Installation

From the monorepo root:

```bash
pnpm install
```

If `@repo/web` is configured correctly in the workspace, run:

```bash
pnpm --filter @repo/web dev
```

If needed, you can also run directly inside the frontend folder:

```bash
cd apps/web
pnpm install
pnpm dev
```

---

## Required Workspace Setup

Your root `pnpm-workspace.yaml` must include:

```yaml
packages:
  - apps/*
  - packages/*
```

Your frontend package name should be:

```json
{
  "name": "@repo/web"
}
```

Without that, `pnpm --filter @repo/web ...` will not work.

---

## Scripts

Run from `apps/web` or through workspace filters.

### Start development server

```bash
pnpm dev
```

### Build production app

```bash
pnpm build
```

### Start production server locally

```bash
pnpm start
```

### Type check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
```

---

## Local Development Flow

### 1. Start backend

From monorepo root:

```bash
pnpm --filter @repo/api dev
```

### 2. Start frontend

From monorepo root:

```bash
pnpm --filter @repo/web dev
```

Frontend will run on:

```text
http://localhost:3000
```

Backend should run on:

```text
http://localhost:4000
```

---

## Auth Flow

This frontend expects the backend to support:

* `POST /auth/register`
* `POST /auth/login`
* `POST /auth/refresh`
* `POST /auth/logout`
* `GET /auth/me`
* `POST /auth/forgot-password`
* `POST /auth/reset-password`
* `GET /auth/verify-email`
* `POST /auth/resend-verification`
* `POST /auth/change-password`

### Session handling

* access token stored in Zustand + localStorage
* refresh token stored in Zustand + localStorage
* automatic retry on `401` through refresh flow
* logout clears persisted auth state

---

## State Management Strategy

### Zustand

Used for:

* access token
* refresh token
* current workspace id
* hydration state
* toast state

### React Query

Used for:

* links
* analytics
* members
* invitations
* exports
* API keys
* audit logs
* workspace lists
* profile/settings data

### Zod

Used for:

* login form
* register form
* reset password form
* forgot password form
* resend verification form
* create link form
* create tag form
* update profile form
* update workspace form
* create API key form
* member invitation form

---

## UI/UX Patterns

This frontend uses:

* card-based dashboard layout
* inline field validation
* toast notifications
* empty states
* skeleton loading states
* responsive mobile navigation
* protected routes
* guest-only redirects for auth pages

---

## Main Pages

### Public

* `/`
* `/login`
* `/register`
* `/forgot-password`
* `/reset-password`
* `/verify-email`
* `/resend-verification`
* `/accept-invitation`

### Protected

* `/dashboard`
* `/dashboard/links`
* `/dashboard/links/[linkId]`
* `/dashboard/links/[linkId]/edit`
* `/dashboard/analytics`
* `/dashboard/settings`
* `/dashboard/change-password`
* `/dashboard/members`
* `/dashboard/api-keys`
* `/dashboard/audit-logs`
* `/dashboard/exports`

---

## Deployment

### Recommended setup

* **Vercel** for frontend
* **Render** for backend
* **PostgreSQL** for database
* SMTP provider for email delivery

### Frontend production env

In Vercel, set:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Important

Frontend must point to the deployed backend, not localhost.

---

## Production Readiness Checklist

Before deploying frontend:

* backend is deployed and reachable
* `NEXT_PUBLIC_API_URL` is correct
* auth flows work against production backend
* email verification links open frontend correctly
* password reset links open frontend correctly
* invitations open frontend correctly
* all dashboard pages load after login
* API keys page works
* exports page loads
* audit logs page loads
* mobile layout looks acceptable

---

## Common Problems

### `No projects matched the filters`

Cause:

* `apps/web/package.json` missing
* wrong `"name"` in frontend package
* `pnpm-workspace.yaml` missing `apps/*`

Fix:

* ensure `apps/web/package.json` exists
* set `"name": "@repo/web"`
* ensure workspace includes apps

### `NEXT_PUBLIC_API_URL` is undefined

Cause:

* `.env.local` missing or wrong

Fix:
Create:

```text
apps/web/.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Login works but dashboard fails

Cause:

* backend route mismatch
* token refresh issue
* workspace id missing
* backend URL wrong

Fix:

* confirm backend is running
* confirm `/auth/login` returns expected payload
* confirm `NEXT_PUBLIC_API_URL`
* check browser devtools network tab

### Invitation / verify / reset links fail

Cause:

* frontend route missing
* backend `FRONTEND_URL` wrong
* token expired

Fix:

* confirm frontend deployed URL
* confirm backend env uses correct `FRONTEND_URL`
* re-send invite/verification/reset email

---

## Recommended Next Improvements After MVP

Post-MVP ideas:

* custom domains
* billing and subscriptions
* richer analytics filters
* better table sorting/pagination from server
* image/avatar upload
* advanced member permissions
* 2FA
* SSO / OAuth providers
* background jobs
* saved reports

---

## Developer Notes

### Design goals

This frontend is intentionally optimized for:

* fast MVP shipping
* good user perception
* clean code organization
* simple but scalable state management
* easy migration into more advanced SaaS features later

### Architecture goals

* keep auth/session separate from server-state
* keep forms validated at UI boundary
* keep pages readable
* use components for repeated UI patterns
* avoid unnecessary complexity until post-MVP

---

## Commands Summary

From repo root:

```bash
pnpm install
pnpm --filter @repo/api dev
pnpm --filter @repo/web dev
```

From frontend folder:

```bash
cd apps/web
pnpm install
pnpm dev
```

---

## License

Private project for internal/product development.
