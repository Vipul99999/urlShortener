import type { FastifyReply, FastifyRequest } from 'fastify'
import type { RedirectsService } from './redirects.service.js'

export class RedirectsController {
  constructor(private service: RedirectsService) {}

  private buildMetadata(request: FastifyRequest) {
    return {
      ipAddress: request.ip,
      referrer: typeof request.headers.referer === 'string' ? request.headers.referer : null,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      country:
        typeof request.headers['cf-ipcountry'] === 'string'
          ? request.headers['cf-ipcountry']
          : typeof request.headers['x-vercel-ip-country'] === 'string'
            ? request.headers['x-vercel-ip-country']
            : null,
      city:
        typeof request.headers['x-vercel-ip-city'] === 'string'
          ? request.headers['x-vercel-ip-city']
          : typeof request.headers['cf-ipcity'] === 'string'
            ? request.headers['cf-ipcity']
            : null
    }
  }

  resolveDomain = async (request: FastifyRequest, reply: FastifyReply) => {
    const { domain, slug } = request.params as { domain: string; slug: string }
    const link = await this.service.resolve(domain, slug, this.buildMetadata(request))
    return reply.redirect(link.destinationUrl, link.redirectType === 'PERMANENT' ? 301 : 302)
  }

  resolveDefault = async (request: FastifyRequest, reply: FastifyReply) => {
    const { slug } = request.params as { slug: string }
    const forwardedHost = typeof request.headers['x-forwarded-host'] === 'string' ? request.headers['x-forwarded-host'] : null
    const link = await this.service.resolveDefault(
      slug,
      this.buildMetadata(request),
      forwardedHost ?? (typeof request.headers.host === 'string' ? request.headers.host : null)
    )
    return reply.redirect(link.destinationUrl, link.redirectType === 'PERMANENT' ? 301 : 302)
  }
}
