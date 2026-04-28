import type { FastifyPluginAsync } from 'fastify'
import { OpsService } from './ops.service.js'
import { OpsController } from './ops.controller.js'

export const opsRoutes: FastifyPluginAsync = async (app) => {
  const service = new OpsService(app)
  const controller = new OpsController(service)

  app.get('/workspaces/:workspaceId/ops/overview', {
    preHandler: [app.authenticateUser]
  }, controller.workspaceOverview)
}
