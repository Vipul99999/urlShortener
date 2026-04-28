import type { FastifyInstance } from 'fastify'
import { AuditRepository } from './audit.repository.js'

export class AuditService {
  private repo: AuditRepository

  constructor(private app: FastifyInstance) {
    this.repo = new AuditRepository(app)
  }

  async log(data: {
    workspaceId?: string | null
    actorUserId?: string | null
    actorType?: 'USER' | 'SYSTEM' | 'API_KEY'
    action: string
    entityType: string
    entityId?: string | null
    metadataJson?: unknown
    ipAddress?: string | null
  }) {
    try {
      await this.repo.createLog({
        workspaceId: data.workspaceId ?? null,
        actorUserId: data.actorUserId ?? null,
        actorType: data.actorType ?? 'USER',
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        metadataJson: data.metadataJson,
        ipAddress: data.ipAddress ?? null
      })
    } catch (error) {
      this.app.log.error(error)
    }
  }

  async list(workspaceId: string, userId: string) {
    const membership = await this.repo.findWorkspaceMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    return this.repo.listWorkspaceAuditLogs(workspaceId)
  }
}