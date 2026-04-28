import type { FastifyInstance } from 'fastify'

export class LinksRepository {
  constructor(private app: FastifyInstance) {}

  findMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId
      },
      select: {
        id: true
      }
    })
  }

  findByDomainAndSlug(domain: string, slug: string) {
    return this.app.prisma.link.findUnique({
      where: {
        domain_slug: {
          domain,
          slug
        }
      }
    })
  }

  createLink(data: {
    workspaceId: string
    createdById: string
    domain: string
    slug: string
    title?: string
    destinationUrl: string
    normalizedUrl: string
    description?: string
    campaign?: string
    expiresAt?: Date | null
    redirectType: 'TEMPORARY' | 'PERMANENT'
  }) {
    return this.app.prisma.link.create({
      data: {
        workspaceId: data.workspaceId,
        createdById: data.createdById,
        domain: data.domain,
        slug: data.slug,
        title: data.title,
        destinationUrl: data.destinationUrl,
        normalizedUrl: data.normalizedUrl,
        description: data.description,
        campaign: data.campaign,
        expiresAt: data.expiresAt,
        redirectType: data.redirectType
      }
    })
  }

  listLinks(workspaceId: string) {
  return this.app.prisma.link.findMany({
    where: {
      workspaceId,
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    }
  })
}

  findLink(workspaceId: string, linkId: string) {
  return this.app.prisma.link.findFirst({
    where: {
      id: linkId,
      workspaceId,
      deletedAt: null
    },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    }
  })
}

  updateLink(
    linkId: string,
    data: {
      domain?: string
      title?: string
      destinationUrl?: string
      normalizedUrl?: string
      description?: string
      campaign?: string
      expiresAt?: Date | null
      redirectType?: 'TEMPORARY' | 'PERMANENT'
    }
  ) {
    return this.app.prisma.link.update({
      where: { id: linkId },
      data
    })
  }

  deleteLink(workspaceId: string, linkId: string) {
    return this.app.prisma.link.updateMany({
      where: {
        id: linkId,
        workspaceId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date(),
        status: 'DELETED'
      }
    })
  }
}
