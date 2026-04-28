import type { FastifyInstance } from 'fastify'

export class ApiKeysRepository {
  constructor(private app: FastifyInstance) {}

  findWorkspaceMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      },
      select: {
        id: true,
        role: true
      }
    })
  }

  listApiKeys(workspaceId: string) {
    return this.app.prisma.apiKey.findMany({
      where: {
        workspaceId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        keyPrefix: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        revokedAt: true
      }
    })
  }

  createApiKey(data: {
    workspaceId: string
    createdById: string
    name: string
    scopes: string[]
    keyPrefix: string
    keyHash: string
    expiresAt?: Date | null
  }) {
    return this.app.prisma.apiKey.create({
      data
    })
  }

  findApiKey(workspaceId: string, apiKeyId: string) {
    return this.app.prisma.apiKey.findFirst({
      where: {
        id: apiKeyId,
        workspaceId
      }
    })
  }

  findActiveApiKeyByPrefix(keyPrefix: string) {
    return this.app.prisma.apiKey.findFirst({
      where: {
        keyPrefix,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      select: {
        id: true,
        workspaceId: true,
        createdById: true,
        scopes: true,
        keyHash: true,
        keyPrefix: true,
        name: true
      }
    })
  }

  touchApiKeyUsage(apiKeyId: string) {
    return this.app.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        lastUsedAt: new Date()
      }
    })
  }

  createUsageEvent(data: {
    apiKeyId: string
    method: string
    route: string
    statusCode: number
    latencyMs?: number | null
    ipHash?: string | null
  }) {
    return this.app.prisma.apiKeyRequestEvent.create({
      data
    })
  }

  listUsageCounts(apiKeyId: string, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return this.app.prisma.apiKeyRequestEvent.groupBy({
      by: ['route'],
      where: {
        apiKeyId,
        createdAt: {
          gte: since
        }
      },
      _count: {
        route: true
      },
      orderBy: {
        _count: {
          route: 'desc'
        }
      },
      take: 5
    })
  }

  countUsage(apiKeyId: string, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return this.app.prisma.apiKeyRequestEvent.count({
      where: {
        apiKeyId,
        createdAt: {
          gte: since
        }
      }
    })
  }

  revokeApiKey(apiKeyId: string) {
    return this.app.prisma.apiKey.update({
      where: { id: apiKeyId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        scopes: true,
        keyPrefix: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        revokedAt: true
      }
    })
  }
}
