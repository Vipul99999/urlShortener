import type { FastifyInstance } from "fastify";
import { DEFAULT_DOMAIN } from "@repo/shared";
import { createLinkSchema, updateLinkSchema } from "./links.schemas.js";
import { generateSlug } from "./slug.util.js";
import { normalizeUrl } from "./url.util.js";
import { LinksRepository } from "./links.repository.js";
import { RESERVED_SLUGS } from "../../common/utils/reserved-slugs.js";
import { AuditService } from '../audit/audit.service.js'
import { redirectCache } from '../../common/utils/link-cache.js'
import { DomainsService } from '../domains/domains.service.js'

function toPublicLink(link: {
  totalClicks: bigint
  uniqueClicks: bigint
  tags: Array<{
    tag: {
      id: string
      name: string
      color: string | null
      createdAt: Date
    }
  }>
} & Record<string, unknown>) {
  return {
    ...link,
    totalClicks: Number(link.totalClicks),
    uniqueClicks: Number(link.uniqueClicks),
    tags: link.tags.map((item) => ({
      id: item.tag.id,
      name: item.tag.name,
      color: item.tag.color,
      createdAt: item.tag.createdAt
    }))
  }
}

export class LinksService {
  private repo: LinksRepository;
  private audit: AuditService
  private domains: DomainsService

  constructor(private app: FastifyInstance) {
    this.repo = new LinksRepository(app);
    this.audit = new AuditService(app)
    this.domains = new DomainsService(app)
  }

  async create(workspaceId: string, userId: string, input: unknown) {
    await this.ensureMembership(workspaceId, userId);

    const data = createLinkSchema.parse(input);
    const domain = data.domain ?? DEFAULT_DOMAIN
    await this.domains.ensureVerifiedWorkspaceDomain(workspaceId, domain)

    if (data.slug && RESERVED_SLUGS.has(data.slug.toLowerCase())) {
      throw this.app.httpErrors.badRequest("Slug is reserved");
    }
    let slug = data.slug ?? generateSlug();

    for (let i = 0; i < 10; i++) {
      const exists = await this.repo.findByDomainAndSlug(domain, slug);
      if (!exists) break;
      slug = generateSlug();
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(data.destinationUrl);
    } catch {
      throw this.app.httpErrors.badRequest("Invalid destination URL");
    }

    const created = await this.repo.createLink({
      workspaceId,
      createdById: userId,
      domain,
      slug,
      title: data.title,
      destinationUrl: data.destinationUrl,
      normalizedUrl,
      description: data.description,
      campaign: data.campaign,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      redirectType: data.redirectType
    })

    await this.audit.log({
      workspaceId,
      actorUserId: userId,
      action: 'link.create',
      entityType: 'link',
      entityId: created.id,
      metadataJson: {
        domain: created.domain,
        slug: created.slug,
        destinationUrl: created.destinationUrl,
        campaign: created.campaign
      }
    })

    await redirectCache.set({
      id: created.id,
      domain: created.domain,
      slug: created.slug,
      destinationUrl: created.destinationUrl,
      redirectType: created.redirectType,
      status: created.status,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      deletedAt: created.deletedAt?.toISOString() ?? null
    })

    return {
      ...created,
      totalClicks: Number(created.totalClicks),
      uniqueClicks: Number(created.uniqueClicks),
      tags: []
    }
  }

  async list(workspaceId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const links = await this.repo.listLinks(workspaceId)

    return links.map((link) => toPublicLink(link))
  }

  async getById(workspaceId: string, linkId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const link = await this.repo.findLink(workspaceId, linkId)
    if (!link) {
      throw this.app.httpErrors.notFound('Link not found')
    }

    return toPublicLink(link)
  }

  async update(
    workspaceId: string,
    linkId: string,
    userId: string,
    input: unknown,
  ) {
    await this.ensureMembership(workspaceId, userId);

    const data = updateLinkSchema.parse(input);
    const existing = await this.repo.findLink(workspaceId, linkId);
    if (!existing) {
      throw this.app.httpErrors.notFound("Link not found");
    }

    const domain = data.domain ?? existing.domain
    await this.domains.ensureVerifiedWorkspaceDomain(workspaceId, domain)

    let normalizedUrl: string | undefined
    if (data.destinationUrl) {
      try {
        normalizedUrl = normalizeUrl(data.destinationUrl)
      } catch {
        throw this.app.httpErrors.badRequest('Invalid destination URL')
      }
    }

    await this.repo.updateLink(linkId, {
      domain,
      title: data.title,
      destinationUrl: data.destinationUrl,
      normalizedUrl,
      description: data.description,
      campaign: data.campaign,
      redirectType: data.redirectType,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : data.expiresAt === null ? null : undefined
    })

    const fullLink = await this.repo.findLink(workspaceId, linkId)
    if (!fullLink) {
      throw this.app.httpErrors.notFound('Link not found')
    }

    if (existing.domain !== fullLink.domain || existing.slug !== fullLink.slug) {
      await redirectCache.delete(existing.domain, existing.slug)
    }

    await redirectCache.set({
      id: fullLink.id,
      domain: fullLink.domain,
      slug: fullLink.slug,
      destinationUrl: fullLink.destinationUrl,
      redirectType: fullLink.redirectType,
      status: fullLink.status,
      expiresAt: fullLink.expiresAt?.toISOString() ?? null,
      deletedAt: fullLink.deletedAt?.toISOString() ?? null
    })

    await this.audit.log({
      workspaceId,
      actorUserId: userId,
      action: 'link.update',
      entityType: 'link',
      entityId: linkId,
      metadataJson: {
        title: data.title,
        domain: fullLink.domain,
        destinationUrl: data.destinationUrl,
        campaign: data.campaign,
        redirectType: data.redirectType
      }
    })

    return toPublicLink(fullLink)
  }

  async softDelete(workspaceId: string, linkId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId);

    const existing = await this.repo.findLink(workspaceId, linkId)
    if (!existing) {
      throw this.app.httpErrors.notFound("Link not found");
    }

    const result = await this.repo.deleteLink(workspaceId, linkId);

    if (result.count === 0) {
      throw this.app.httpErrors.notFound("Link not found");
    }

    await redirectCache.delete(existing.domain, existing.slug)
    await this.audit.log({
      workspaceId,
      actorUserId: userId,
      action: 'link.delete',
      entityType: 'link',
      entityId: linkId
    })
    return { success: true };
  }

  private async ensureMembership(workspaceId: string, userId: string) {
    const membership = await this.repo.findMembership(workspaceId, userId);
    if (!membership) {
      throw this.app.httpErrors.forbidden("Access denied");
    }

    return membership
  }
}
