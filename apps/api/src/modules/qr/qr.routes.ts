import type { FastifyPluginAsync } from 'fastify'
import { QrController } from './qr.controller.js'
import { QrService } from './qr.service.js'

export const qrRoutes: FastifyPluginAsync = async (app) => {
  const service = new QrService(app)
  const controller = new QrController(service)

  app.post('/workspaces/:workspaceId/links/:linkId/qr', {
    preHandler: [app.authenticateUser]
  }, controller.generate)
}
