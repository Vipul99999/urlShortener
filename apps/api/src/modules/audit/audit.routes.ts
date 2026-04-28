import type { FastifyPluginAsync } from 'fastify'
import { AuditController } from './audit.controller.js'
import { AuditService } from './audit.service.js'

export const auditRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuditService(app)
  const controller = new AuditController(service)

  app.get('/workspaces/:workspaceId/audit-logs', {
    preHandler: [app.authenticateUser]
  }, controller.list)
}
