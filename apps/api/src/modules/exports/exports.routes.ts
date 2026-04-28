import type { FastifyPluginAsync } from 'fastify'
import { API_KEY_SCOPES } from '@repo/shared'
import { ExportsController } from './exports.controller.js'
import { ExportsService } from './exports.service.js'
import { requireApiKeyScopes } from '../../common/utils/api-key-scopes.js'

export const exportRoutes: FastifyPluginAsync = async (app) => {
  const service = new ExportsService(app)
  const controller = new ExportsController(service)

  app.post('/workspaces/:workspaceId/exports/links', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.EXPORTS_WRITE])],
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '10 minutes'
      }
    }
  }, controller.exportLinksCsv)

  app.get('/workspaces/:workspaceId/exports', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.EXPORTS_READ])]
  }, controller.list)

  app.get('/workspaces/:workspaceId/exports/:exportId', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.EXPORTS_READ])]
  }, controller.getById)

  app.get('/workspaces/:workspaceId/exports/:exportId/download', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.EXPORTS_READ])],
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    }
  }, controller.download)
}
