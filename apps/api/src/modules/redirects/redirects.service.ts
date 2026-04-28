import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { enqueueJob, type Prisma } from '@repo/db'
import { DEFAULT_DOMAIN, JOB_KIND } from '@repo/shared'
import { RedirectsRepository } from './redirects.repository.js'
import { redirectCache } from '../../common/utils/link-cache.js'
import { isDefaultShortDomain, stripPortFromHost } from '../../common/utils/custom-domains.js'
import { abuseGuard } from '../../common/utils/abuse-guard.js'
import { recordAbuseSignal } from '../../common/utils/abuse-monitor.js'

function hashIpAddress(ipAddress: string | null) {
  if (!ipAddress) return null
  return crypto.createHash('sha256').update(ipAddress).digest('hex')
}

type ClickMetadata = {
  ipAddress: string | null
  referrer: string | null
  userAgent: string | null
  country: string | null
  city: string | null
}

function parseCommaSeparatedSet(value: string | undefined) {
  return new Set(
    (value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

function parseAgentPatterns(value: string | undefined) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function isSuspiciousUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return true
  }

  const lower = userAgent.toLowerCase()
  return [
    'curl/',
    'wget/',
    'python-requests',
    'aiohttp',
    'go-http-client',
    'httpie',
    'libwww',
    'java/',
    'okhttp',
    'headless',
    'phantomjs',
    'scrapy'
  ].some((pattern) => lower.includes(pattern))
}

export class RedirectsService {
  private repo: RedirectsRepository

  constructor(private app: FastifyInstance) {
    this.repo = new RedirectsRepository(app)
  }

  async resolve(domain: string, slug: string, metadata: ClickMetadata) {
    const hostForSignal = domain === DEFAULT_DOMAIN ? null : domain
    const blockedIps = parseCommaSeparatedSet(process.env.ABUSE_IP_BLOCKLIST)
    const blockedPatterns = parseAgentPatterns(process.env.ABUSE_USER_AGENT_BLOCK_PATTERNS)

    if (metadata.ipAddress && blockedIps.has(metadata.ipAddress)) {
      await recordAbuseSignal(this.app, {
        source: 'redirect',
        kind: 'ip_blocklist_hit',
        ipAddress: metadata.ipAddress,
        hostname: hostForSignal,
        path: `/${slug}`,
        userAgent: metadata.userAgent,
        actionTaken: 'blocked',
        metadataJson: {
          domain,
          slug
        }
      })
      throw this.app.httpErrors.forbidden('Requests from this IP are blocked')
    }

    if (
      metadata.userAgent &&
      blockedPatterns.some((pattern) => metadata.userAgent?.toLowerCase().includes(pattern.toLowerCase()))
    ) {
      await recordAbuseSignal(this.app, {
        source: 'redirect',
        kind: 'blocked_user_agent',
        ipAddress: metadata.ipAddress,
        hostname: hostForSignal,
        path: `/${slug}`,
        userAgent: metadata.userAgent,
        actionTaken: 'blocked',
        metadataJson: {
          domain,
          slug
        }
      })
      throw this.app.httpErrors.tooManyRequests('Traffic from this user agent is blocked')
    }

    const suspiciousUserAgent = isSuspiciousUserAgent(metadata.userAgent)

    try {
      abuseGuard.assertNotBlocked(metadata.ipAddress, Number(process.env.ABUSE_BLOCK_DURATION_MS || 900000))
    } catch (error) {
      await recordAbuseSignal(this.app, {
        source: 'redirect',
        kind: 'rate_limit_block',
        ipAddress: metadata.ipAddress,
        hostname: hostForSignal,
        path: `/${slug}`,
        userAgent: metadata.userAgent,
        actionTaken: 'blocked',
        metadataJson: {
          domain,
          slug
        }
      })
      throw error
    }

    if (domain !== DEFAULT_DOMAIN) {
      const customDomain = await this.repo.findCustomDomain(domain)
      if (!customDomain || customDomain.status !== 'VERIFIED') {
        abuseGuard.registerRedirectMiss({
          ip: metadata.ipAddress,
          maxMissesPerMinute: Number(process.env.ABUSE_REDIRECT_MISS_MAX_PER_MINUTE || 40),
          blockDurationMs: Number(process.env.ABUSE_BLOCK_DURATION_MS || 900000)
        })
        await recordAbuseSignal(this.app, {
          source: 'redirect',
          kind: 'invalid_custom_domain_lookup',
          ipAddress: metadata.ipAddress,
          hostname: hostForSignal,
          path: `/${slug}`,
          userAgent: metadata.userAgent,
          actionTaken: 'miss_recorded',
          metadataJson: {
            domain,
            slug
          }
        })
        throw this.app.httpErrors.notFound('Link not found')
      }
    }

    const cached = await redirectCache.get(domain, slug)
    const cachedLink = cached
      ? {
          ...cached,
          expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
          deletedAt: cached.deletedAt ? new Date(cached.deletedAt) : null
        }
      : null

    const link = cachedLink ?? await this.repo.findByDomainAndSlug(domain, slug)
    const workspaceId = 'workspaceId' in (link || {}) ? (link as { workspaceId?: string }).workspaceId ?? null : null

    if (!link || link.deletedAt || link.status !== 'ACTIVE') {
      abuseGuard.registerRedirectMiss({
        ip: metadata.ipAddress,
        maxMissesPerMinute: Number(process.env.ABUSE_REDIRECT_MISS_MAX_PER_MINUTE || 40),
        blockDurationMs: Number(process.env.ABUSE_BLOCK_DURATION_MS || 900000)
      })
      await recordAbuseSignal(this.app, {
        workspaceId,
        source: 'redirect',
        kind: 'invalid_slug_lookup',
        ipAddress: metadata.ipAddress,
        hostname: hostForSignal,
        path: `/${slug}`,
        userAgent: metadata.userAgent,
        actionTaken: 'miss_recorded',
        metadataJson: {
          domain,
          slug
        }
      })
      throw this.app.httpErrors.notFound('Link not found')
    }

    if (!cachedLink) {
      await redirectCache.set({
        id: link.id,
        domain: link.domain,
        slug: link.slug,
        destinationUrl: link.destinationUrl,
        redirectType: link.redirectType,
        status: link.status,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        deletedAt: null
      })
    }

    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      await redirectCache.delete(link.domain, link.slug)
      throw this.app.httpErrors.gone('Link expired')
    }

    const ipHash = hashIpAddress(metadata.ipAddress)

    try {
      if (suspiciousUserAgent) {
        abuseGuard.registerSuspiciousRedirectHit({
          ip: metadata.ipAddress,
          maxPerMinute: Number(process.env.ABUSE_SUSPICIOUS_REDIRECT_MAX_PER_MINUTE || 90),
          blockDurationMs: Number(process.env.ABUSE_BLOCK_DURATION_MS || 900000)
        })
      } else {
        abuseGuard.registerRedirectHit({
          ip: metadata.ipAddress,
          maxPerMinute: Number(process.env.ABUSE_REDIRECT_MAX_PER_MINUTE || 240),
          blockDurationMs: Number(process.env.ABUSE_BLOCK_DURATION_MS || 900000)
        })
      }
    } catch (error) {
      await recordAbuseSignal(this.app, {
        workspaceId,
        source: 'redirect',
        kind: suspiciousUserAgent ? 'suspicious_redirect_rate_limit_exceeded' : 'redirect_rate_limit_exceeded',
        ipAddress: metadata.ipAddress,
        hostname: hostForSignal,
        path: `/${slug}`,
        userAgent: metadata.userAgent,
        actionTaken: 'blocked',
        metadataJson: {
          domain,
          slug
        }
      })
      throw error
    }

    await enqueueJob(this.app.prisma, {
      kind: JOB_KIND.PROCESS_CLICK_EVENT,
      payload: {
        linkId: link.id,
        clickedAt: new Date().toISOString(),
        ipHash,
        referrer: metadata.referrer,
        userAgent: metadata.userAgent,
        country: metadata.country,
        city: metadata.city,
        suspiciousUserAgent
      } as Prisma.InputJsonValue
    })

    return link
  }

  async resolveDefault(slug: string, metadata: ClickMetadata, hostHeader?: string | null) {
    const hostname = stripPortFromHost(hostHeader)
    const domain = isDefaultShortDomain(hostname, [process.env.API_URL ?? '', process.env.APP_URL ?? ''])
      ? DEFAULT_DOMAIN
      : hostname ?? DEFAULT_DOMAIN

    return this.resolve(domain, slug, metadata)
  }
}
