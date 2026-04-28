import type { FastifyInstance } from 'fastify'

export class AnalyticsRepository {
  constructor(private app: FastifyInstance) {}

  findMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId
      },
      select: { id: true }
    })
  }

  listWorkspaceLinks(workspaceId: string) {
    return this.app.prisma.link.findMany({
      where: {
        workspaceId,
        deletedAt: null
      },
      select: {
        id: true,
        totalClicks: true,
        uniqueClicks: true,
        createdAt: true
      }
    })
  }

  findLinkSummary(workspaceId: string, linkId: string) {
    return this.app.prisma.link.findFirst({
      where: {
        id: linkId,
        workspaceId,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        slug: true,
        destinationUrl: true,
        totalClicks: true,
        uniqueClicks: true,
        createdAt: true,
        lastClickedAt: true
      }
    })
  }

  listDailyStats(linkId: string) {
    return this.app.prisma.linkDailyStat.findMany({
      where: { linkId },
      orderBy: { date: 'asc' }
    })
  }

  listTopLinks(workspaceId: string, limit = 5) {
    return this.app.prisma.link.findMany({
      where: {
        workspaceId,
        deletedAt: null
      },
      orderBy: [
        { totalClicks: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        domain: true,
        totalClicks: true,
        uniqueClicks: true
      }
    })
  }

  listRecentClicks(workspaceId: string, limit = 20) {
    return this.app.prisma.linkClickEvent.findMany({
      where: {
        link: {
          workspaceId,
          deletedAt: null
        }
      },
      orderBy: {
        clickedAt: 'desc'
      },
      take: limit,
      select: {
        id: true,
        clickedAt: true,
        country: true,
        city: true,
        referrerHost: true,
        deviceType: true,
        browser: true,
        os: true,
        isBot: true,
        link: {
          select: {
            id: true,
            title: true,
            slug: true,
            domain: true
          }
        }
      }
    })
  }

  groupReferrers(workspaceId: string) {
    return this.app.prisma.linkClickEvent.groupBy({
      by: ['referrerHost'],
      where: {
        referrerHost: {
          not: null
        },
        link: {
          workspaceId,
          deletedAt: null
        }
      },
      _count: {
        referrerHost: true
      },
      orderBy: {
        _count: {
          referrerHost: 'desc'
        }
      },
      take: 5
    })
  }

  groupDevices(workspaceId: string) {
    return this.app.prisma.linkClickEvent.groupBy({
      by: ['deviceType'],
      where: {
        deviceType: {
          not: null
        },
        link: {
          workspaceId,
          deletedAt: null
        }
      },
      _count: {
        deviceType: true
      },
      orderBy: {
        _count: {
          deviceType: 'desc'
        }
      }
    })
  }

  groupCountries(workspaceId: string) {
    return this.app.prisma.linkClickEvent.groupBy({
      by: ['country'],
      where: {
        country: {
          not: null
        },
        link: {
          workspaceId,
          deletedAt: null
        }
      },
      _count: {
        country: true
      },
      orderBy: {
        _count: {
          country: 'desc'
        }
      },
      take: 5
    })
  }
}
