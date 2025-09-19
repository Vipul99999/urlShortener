Absolutely, Vipul! Here's your complete `README.md` file content, formatted and ready to drop into your repo:

```markdown
# URL Shortener — README

A simple, production-minded URL shortener (Fullstack) built with **Express + TypeScript + Prisma + PostgreSQL** (backend) and **Vite + React + TypeScript** (frontend).  
This repository implements short link creation, redirect handling, click logging, daily aggregation of clicks and pruning of old click logs. Authentication is left out on purpose — the schema includes optional `userId` so you can add auth later.

---

## Table of contents

- [Features](#features)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quickstart (dev)](#quickstart-dev)
- [Environment variables](#environment-variables)
- [Database / Prisma](#database--prisma)
- [API reference](#api-reference)
- [Frontend usage](#frontend-usage)
- [Worker / cleanup jobs](#worker--cleanup-jobs)
- [Data lifecycle & retention](#data-lifecycle--retention)
- [Production considerations](#production-considerations)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Next steps / TODOs](#next-steps--todos)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Create short links (auto-generated or user-supplied shortcode).
- Redirect shortcodes → records clicks (referrer, user-agent, country header if available).
- Stats endpoint returns recent raw clicks and older daily aggregates.
- Daily cleanup worker:
  - Aggregates yesterday’s raw clicks into `ClickStatsDaily`.
  - Prunes raw clicks older than `CLICK_RETENTION_DAYS` (default 90).
  - Marks expired short URLs inactive (`isActive = false`) so they return `410 Gone`.
- Clean, minimal frontend to create and view stats.

---

## Repository layout

```text
project-root/
├─ backend/
│  ├─ prisma/
│  │  └─ schema.prisma
│  ├─ src/
│  │  ├─ app.ts
│  │  ├─ server.ts
│  │  ├─ lib/
│  │  │  ├─ prisma.ts
│  │  │  └─ shortcode.ts
│  │  ├─ middleware/
│  │  │  └─ logging.ts
│  │  ├─ routes/
│  │  │  └─ shorturls.ts
│  │  └─ workers/
│  │     └─ cleanupWorker.ts
│  ├─ package.json
│  └─ tsconfig.json
└─ frontend/
   ├─ src/
   │  ├─ main.tsx
   │  ├─ App.tsx
   │  ├─ styles.css
   │  ├─ api/
   │  │  └─ apiClient.ts
   │  └─ components/
   │     ├─ ShortenForm.tsx
   │     ├─ ResultList.tsx
   │     └─ StatsPage.tsx
   ├─ index.html
   ├─ package.json
   └─ tsconfig.json
```

---

## Prerequisites

- Node.js >= 18
- npm or yarn
- PostgreSQL (local or remote)
- (optional) Redis if you later add sessions / rate-limiting / fast click queue

---

## Quickstart (dev)

1. Clone repo and open two terminals (backend / frontend).

2. Backend:

```bash
cd backend
cp .env.example .env            # edit DATABASE_URL, BASE_URL, PORT if needed
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Backend will start (default): `http://localhost:4000`

3. Frontend:

```bash
cd frontend
npm install
npm run dev
```

Vite will print the local URL (typically `http://localhost:5173`).

---

## Environment variables

`backend/.env` (example)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shortener
BASE_URL=http://localhost:4000
PORT=4000
CLICK_RETENTION_DAYS=90
```

`frontend` uses `VITE_API_BASE` if you want:

```env
VITE_API_BASE=http://localhost:4000
```

---

## Database & Prisma

The Prisma schema (`backend/prisma/schema.prisma`) contains:

- `ShortUrl` — short links (id, shortcode, url, createdAt, expiresAt, isActive, optional userId)
- `Click` — raw click logs (timestamp, referrer, country, userAgent)
- `ClickStatsDaily` — aggregated daily counts per short url

Run Prisma commands:

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma studio
```

---

## API reference

### Create short URL

`POST /shorturls`

```json
{
  "url": "https://example.com/long-path",
  "validity": 30,
  "shortcode": "abcd12"
}
```

Success response:

```json
{
  "shortLink": "http://localhost:4000/abcd12",
  "expiry": "2025-01-01T12:34:56.000Z"
}
```

Errors:
- `400` invalid url / validity / shortcode
- `409` shortcode already taken

### Redirect

`GET /:shortcode`

- `302` redirect if active
- `410 Gone` if expired
- `404 Not Found` if missing

Click logs include referrer, userAgent, and country header.

### Stats

`GET /shorturls/:shortcode`

```json
{
  "shortcode": "abcd12",
  "originalUrl": "https://example.com/long-path",
  "createdAt": "...",
  "expiry": "...",
  "isActive": true,
  "recentClicks": [
    { "timestamp": "...", "referrer": "...", "country": "..." }
  ],
  "olderStats": [
    { "date": "2025-01-01T00:00:00.000Z", "clicks": 12 }
  ]
}
```

---

## Frontend usage

- Shorten form (URL, validity, shortcode)
- Result list with expiry
- Stats viewer

API client: `frontend/src/api/apiClient.ts`

---

## Worker / cleanup jobs

`backend/src/workers/cleanupWorker.ts` runs nightly (`cron "0 0 * * *"`):

1. Aggregate yesterday’s clicks
2. Prune old `Click` rows
3. Mark expired links inactive

You can manually run exported functions for testing.

---

## Data lifecycle & retention

- `ShortUrl`: marked inactive when expired
- `Click`: retained for `CLICK_RETENTION_DAYS`, then deleted
- `ClickStatsDaily`: long-term analytics
- Auth/session: not implemented (consider Redis)

---

## Production considerations

- Use HTTPS
- Store secrets securely
- Use structured logging (Pino)
- Add security middleware (`helmet`, `CORS`, `CSP`)
- Rate-limit endpoints
- Use Redis/CDN cache for redirects
- Use click queue for async logging
- Add DB indexes and replicas
- Monitor with Sentry, Prometheus

---

## Testing

- Unit: Jest (shortcode, validation, routes)
- Integration: Supertest
- Load: k6 or wrk

---

## Troubleshooting

- Vite import errors: check `index.html` and CSS imports
- Tailwind init issues on Windows: use `.cmd` or create config manually
- Prisma migration errors: check `DATABASE_URL`, use `db push` for quick sync

---

## Next steps / TODOs

- Add auth (`/auth/register`, `/auth/login`, etc.)
- Redis-backed rate limiter and click queue
- Redis/CDN cache for redirects
- Admin UI for link management
- CI pipeline (lint, typecheck, test, migrate)

---

## Contributing

1. Open an issue
2. Create a branch, implement, test
3. Submit a PR with description and notes

---

## License

MIT — feel free to use and adapt.

---
```

Let me know if you want this scaffolded into a GitHub repo structure, or if you'd like me to generate Dockerfiles, CI config, or auth routes next. You're building something solid here!
