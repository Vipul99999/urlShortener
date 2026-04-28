# Changelog

All notable changes to UrlShortener should be documented in this file.

This project follows a simple changelog style inspired by Keep a Changelog.

## How To Use This File

Add new entries under `Unreleased` while work is in progress.

When you cut a release:

1. move the unreleased items into a dated/released section
2. group changes into:
   - Added
   - Changed
   - Fixed
   - Security

## Unreleased

### Added

- startup-oriented docs set including product structure, practical API/database/deployment/security/testing docs, architecture diagrams, contribution guide, and changelog foundation
- OpenAPI-style spec and Postman collection for the API
- detailed schema reference and product PRD/roadmap docs
- stronger auth and API-key hardening with lockouts and safer API-key defaults
- stronger redirect abuse handling for suspicious user agents
- stricter malicious destination URL and custom-domain safety rules
- launch-readiness guidance surfaced in the dashboard and settings UX

### Changed

- production env validation is stricter in production mode
- deployment docs now call out CDN/WAF and backup expectations more clearly
- dashboard and analytics screens now emphasize first-run clarity and trust signals

### Fixed

- multiple documentation gaps for future maintainers and operators

### Security

- credential-stuffing protection improved
- invalid API-key attempt handling improved
- destination URL restrictions tightened
- domain verification safety tightened

## 2026-04-25

### Added

- architecture documentation with request-flow diagrams
- contribution guide for future teammates
- changelog file for ongoing project history

## Template For Future Releases

```md
## YYYY-MM-DD or vX.Y.Z

### Added

- ...

### Changed

- ...

### Fixed

- ...

### Security

- ...
```
