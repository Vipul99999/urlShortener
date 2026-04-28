import type { FastifyInstance } from 'fastify'
import { describeObjectStorage } from '@repo/db'

export class OpsService {
  constructor(private app: FastifyInstance) {}

  async getWorkspaceOverview(workspaceId: string, userId: string) {
    const membership = await this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      },
      select: { id: true }
    })

    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    const [pendingExports, failedExports, recentEmailEvents, recentAbuseSignals, domainSummary, activeApiKeys] =
      await Promise.all([
        this.app.prisma.exportJob.count({
          where: {
            workspaceId,
            status: {
              in: ['PENDING', 'PROCESSING']
            }
          }
        }),
        this.app.prisma.exportJob.count({
          where: {
            workspaceId,
            status: 'FAILED'
          }
        }),
        this.app.prisma.emailDeliveryEvent.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            provider: true,
            emailType: true,
            recipient: true,
            eventType: true,
            status: true,
            createdAt: true
          }
        }),
        this.app.prisma.abuseSignal.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: {
            id: true,
            source: true,
            kind: true,
            hostname: true,
            path: true,
            actionTaken: true,
            createdAt: true
          }
        }),
        this.app.prisma.workspaceDomain.groupBy({
          by: ['status'],
          where: { workspaceId },
          _count: {
            status: true
          }
        }),
        this.app.prisma.apiKey.count({
          where: {
            workspaceId,
            status: 'ACTIVE'
          }
        })
      ])

    return {
      storage: describeObjectStorage(),
      exportHealth: {
        pendingExports,
        failedExports
      },
      activeApiKeys,
      domainHealth: domainSummary.map((item: { status: string; _count: { status: number } }) => ({
        status: item.status,
        count: item._count.status
      })),
      recentEmailEvents,
      recentAbuseSignals
    }
  }
}
