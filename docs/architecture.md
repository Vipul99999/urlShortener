# Architecture

This document explains how UrlShortener is structured as a running system.

Use it when you want to understand:

- which service handles which responsibility
- how key flows move through the stack
- where caching, jobs, analytics, and custom domains fit

## High-Level Topology

```mermaid
flowchart TD
    User["User Browser / Client"] --> Web["Next.js Web App"]
    User --> Redirect["Public Redirect Routes"]
    Web --> API["Fastify API"]
    Redirect --> API
    API --> Redis["Redis Cache"]
    API --> Postgres["PostgreSQL / Prisma"]
    API --> Jobs["Jobs Table"]
    Worker["Worker Process"] --> Jobs
    Worker --> Postgres
    Worker --> Storage["Object Storage (R2 / local)"]
    Worker --> Email["Email Provider"]
    API --> Monitoring["Monitoring / Alerts"]
    Worker --> Monitoring
    Web --> Monitoring
```

## Service Responsibilities

### `web`

Responsibilities:

- authentication UI
- dashboard experience
- link creation and management flows
- analytics presentation
- settings, members, domains, API keys, exports

Main technology:

- Next.js App Router
- React Query
- Zustand

### `api`

Responsibilities:

- user and session auth
- workspace authorization
- link CRUD
- redirects
- analytics queries
- invitations
- custom domain lifecycle
- API-key auth and usage logging
- audit and ops endpoints

Main technology:

- Fastify
- Prisma
- PostgreSQL
- Redis-backed cache helpers

### `worker`

Responsibilities:

- process queued emails
- process click events
- generate exports
- recover stale jobs
- expose worker health endpoints

Main technology:

- Node.js process
- Prisma-backed durable jobs

## Core Storage Layers

### PostgreSQL

Used for:

- transactional product data
- job queue state
- analytics support tables
- audit and abuse signals

### Redis

Used for:

- redirect lookups
- faster short-link resolution
- resilience during heavy redirect traffic

### Object Storage

Used for:

- generated export files

Recommended production provider:

- Cloudflare R2

## Request Flows

## 1. Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web
    participant A as API
    participant DB as PostgreSQL

    U->>W: Submit email + password
    W->>A: POST /auth/login
    A->>A: Validate input
    A->>A: Check lockout / abuse state
    A->>DB: Find user + verify password
    A->>DB: Create rotated session
    A-->>W: accessToken + refreshToken + workspaceId
    W->>W: Persist session in store
    W-->>U: Redirect to dashboard
```

## 2. Link Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web
    participant A as API
    participant DB as PostgreSQL
    participant R as Redis

    U->>W: Submit create-link form
    W->>A: POST /workspaces/:id/links
    A->>A: Validate auth + membership
    A->>A: Validate domain and destination URL
    A->>DB: Check slug uniqueness
    A->>DB: Insert link
    A->>R: Warm redirect cache
    A-->>W: Created link
    W-->>U: Show success and refresh list
```

## 3. Redirect Flow

```mermaid
sequenceDiagram
    participant V as Visitor
    participant A as API Redirect Route
    participant G as Abuse Guard
    participant R as Redis
    participant DB as PostgreSQL
    participant J as Jobs Table
    participant W as Worker

    V->>A: GET /slug
    A->>G: Check blocks / suspicious traffic
    A->>R: Lookup domain + slug
    alt cache hit
        R-->>A: link target
    else cache miss
        A->>DB: Load link
        DB-->>A: link target
        A->>R: Cache result
    end
    A->>J: Enqueue click event
    A-->>V: 301/302 redirect
    W->>J: Claim click job
    W->>DB: Write raw click + aggregate stats
```

## 4. Export Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web
    participant A as API
    participant DB as PostgreSQL
    participant Q as Jobs Table
    participant Worker as Worker
    participant S as Object Storage

    U->>W: Request export
    W->>A: POST /workspaces/:id/exports/links
    A->>DB: Create export record
    A->>Q: Enqueue export job
    A-->>W: Export queued
    Worker->>Q: Claim export job
    Worker->>DB: Read workspace link data
    Worker->>S: Upload CSV
    Worker->>DB: Mark export completed
    W->>A: GET export status / download
    A-->>W: Download metadata / file
```

## 5. Custom Domain Verification Flow

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web
    participant A as API
    participant DNS as DNS Provider
    participant DB as PostgreSQL

    U->>W: Add go.example.com
    W->>A: POST /workspaces/:id/domains
    A->>DB: Create pending domain + token
    A-->>W: Show verification path and DNS target
    U->>DNS: Add CNAME record
    U->>A: Open /.well-known verification URL on custom host
    A->>A: Confirm host + token + DNS diagnostics
    A->>DB: Mark domain verified
    A-->>U: Domain verified
```

## Security Layers In The Architecture

- route-level rate limiting at the API layer
- in-memory auth and API-key lockout guard
- abuse-signal persistence in PostgreSQL
- redirect cache isolation from analytics writes
- async jobs to keep slow work off request paths
- hashed tokens and keys
- scoped API-key auth

## Operational Characteristics

### Good startup-stage properties

- monorepo is simple to reason about
- worker separates slow work from request handling
- Redis keeps redirect performance reasonable
- analytics can grow without redesigning the whole app

### Current limits

- auth lockout memory is process-local
- Redis/cache behavior still depends on correct deployment topology
- custom-domain operations still rely on external DNS/TLS setup
- runtime tests require real local services

## Where To Read Next

- [Product_structure.md](D:\Projects_Components\url-shortener\docs\Product_structure.md)
- [api.md](D:\Projects_Components\url-shortener\docs\api.md)
- [database.md](D:\Projects_Components\url-shortener\docs\database.md)
- [deployment.md](D:\Projects_Components\url-shortener\docs\deployment.md)
