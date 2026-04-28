# Security

This document summarizes the current security model and the areas that matter most in future maintenance.

## Current Protections

- hashed passwords with Argon2
- hashed refresh tokens
- hashed one-time verification/reset tokens
- hashed API keys
- scoped API keys
- login attempt lockouts
- invalid API-key lockouts
- route rate limiting
- redirect abuse tracking
- abuse signal persistence
- audit logs
- custom-domain verification
- destination URL restrictions

## Main Threat Areas

### Auth abuse

- credential stuffing
- brute-force login attempts
- reset/verification abuse

Current handling:

- login throttling
- login lockout memory guard
- route-level rate limits

### API key leakage or misuse

Current handling:

- raw key shown once
- hashed at rest
- scope-limited access
- usage tracking
- invalid-attempt lockouts

### Redirect abuse and bots

Current handling:

- redirect hit limits
- miss limits for invalid slugs
- suspicious user-agent throttling
- manual blocklists
- abuse signal logging

### Malicious destination URLs

Current handling:

- only `http` and `https`
- local/private destinations blocked
- raw IP destinations blocked
- embedded credentials blocked
- unusual ports blocked

### Custom-domain misuse

Current handling:

- normalized hostname validation
- reserved-host protection
- wildcard rejection
- subdomain-only approach
- verification token flow
- DNS diagnostics

## What Still Depends On Deployment

The app alone is not enough. Production safety still depends on:

- HTTPS everywhere
- secret management
- managed backups
- CDN / WAF
- monitoring and alerting
- correct reverse-proxy IP handling

## Good Future Additions

- persistent auth-abuse store beyond in-memory guards
- admin review workflow for abuse signals
- automated IP reputation integrations
- optional 2FA
- more advanced bot scoring
