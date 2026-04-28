import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@repo/db'

export class AuditRepository {
  constructor(private app: FastifyInstance) {}

  createLog(data: {
    workspaceId?: string | null
    actorUserId?: string | null
    actorType: 'USER' | 'SYSTEM' | 'API_KEY'
    action: string
    entityType: string
    entityId?: string | null
    metadataJson?: unknown
    ipAddress?: string | null
  }) {
    const createData: Prisma.AuditLogUncheckedCreateInput = {
      actorType: data.actorType,
      action: data.action,
      entityType: data.entityType,
      workspaceId: data.workspaceId ?? null,
      actorUserId: data.actorUserId ?? null,
      entityId: data.entityId ?? null,
      metadataJson: data.metadataJson as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined,
      ipAddress: data.ipAddress ?? null
    }

    return this.app.prisma.auditLog.create({
      data: createData
    })
  }

  findWorkspaceMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      },
      select: { id: true }
    })
  }

  listWorkspaceAuditLogs(workspaceId: string) {
    return this.app.prisma.auditLog.findMany({
      where: {
        workspaceId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100,
      select: {
        id: true,
        actorType: true,
        action: true,
        entityType: true,
        entityId: true,
        metadataJson: true,
        ipAddress: true,
        createdAt: true,
        actorUser: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
  }
}
