# Deployment

This is the short deployment guide.

For the full operational runbook, use:

- [DEPLOYMENT_RUNBOOK.md](D:\Projects_Components\url-shortener\docs\DEPLOYMENT_RUNBOOK.md)

## Required Runtime Shape

Deploy these separately:

- `web`
- `api`
- `worker`

Required backing services:

- PostgreSQL
- Redis
- object storage
- email provider

Recommended edge services:

- CDN / WAF
- DNS provider
- TLS termination
- monitoring / alerting

## Minimum Production Requirements

- managed PostgreSQL with backups
- Redis enabled
- shared object storage enabled
- strong JWT secrets
- HTTPS-only public URLs
- worker deployed separately
- health/readiness endpoints monitored

## Most Important Env Areas

- database
- auth secrets
- public URLs
- Redis
- object storage
- email
- monitoring / alerts
- abuse controls

See:

- [.env.examples](D:\Projects_Components\url-shortener\.env.examples)
- [README.md](D:\Projects_Components\url-shortener\README.md)
- [DEPLOYMENT_RUNBOOK.md](D:\Projects_Components\url-shortener\docs\DEPLOYMENT_RUNBOOK.md)

## Launch Reminder

Before public launch, validate:

- signup and login
- create link
- redirect
- analytics
- exports
- invitations
- custom domain verification
- worker health
