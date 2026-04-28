import type { FastifyInstance } from 'fastify'

export class RedirectsRepository {
  constructor(private app: FastifyInstance) {}

  findByDomainAndSlug(domain: string, slug: string) {
    return this.app.prisma.link.findUnique({
      where: {
        domain_slug: { domain, slug }
      }
    })
  }

  findCustomDomain(hostname: string) {
    return this.app.prisma.workspaceDomain.findUnique({
      where: { hostname },
      select: {
        id: true,
        status: true
      }
    })
  }

  async recordClick(
    linkId: string,
    dayStart: Date,
    dayEnd: Date,
    data: {
      ipHash: string | null
      referrer: string | null
      userAgent: string | null
    }
  ) {
    return this.app.prisma.$transaction(async (tx) => {
      const hasSeenIpBefore = data.ipHash
        ? await tx.linkClickEvent.findFirst({
            where: {
              linkId,
              ipHash: data.ipHash
            },
            select: { id: true }
          })
        : null

      const hasSeenIpToday = data.ipHash
        ? await tx.linkClickEvent.findFirst({
            where: {
              linkId,
              ipHash: data.ipHash,
              clickedAt: {
                gte: dayStart,
                lt: dayEnd
              }
            },
            select: { id: true }
          })
        : null

      const uniqueIncrement = data.ipHash && !hasSeenIpBefore ? 1 : 0
      const dailyUniqueIncrement = data.ipHash && !hasSeenIpToday ? 1 : 0

      await tx.link.update({
        where: { id: linkId },
        data: {
          totalClicks: { increment: 1 },
          uniqueClicks: { increment: uniqueIncrement },
          lastClickedAt: new Date()
        }
      })

      await tx.linkDailyStat.upsert({
        where: {
          linkId_date: {
            linkId,
            date: dayStart
          }
        },
        update: {
          clicks: { increment: 1 },
          uniqueClicks: { increment: dailyUniqueIncrement }
        },
        create: {
          linkId,
          date: dayStart,
          clicks: 1,
          uniqueClicks: dailyUniqueIncrement
        }
      })

      await tx.linkClickEvent.create({
        data: {
          linkId,
          ipHash: data.ipHash,
          referrer: data.referrer,
          userAgent: data.userAgent
        }
      })
    })
  }
}
