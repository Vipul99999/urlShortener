import type { FastifyPluginAsync } from 'fastify'
import { API_KEY_SCOPES } from '@repo/shared'
import { LinksController } from './links.controller.js'
import { LinksService } from './links.service.js'
import { requireApiKeyScopes } from '../../common/utils/api-key-scopes.js'

export const linkRoutes: FastifyPluginAsync = async (app) => {
  const service = new LinksService(app)
  const controller = new LinksController(service)

  app.get('/workspaces/:workspaceId/links', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.LINKS_READ])]
  }, controller.list)

  app.post('/workspaces/:workspaceId/links', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.LINKS_WRITE])],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, controller.create)

  app.get('/workspaces/:workspaceId/links/:linkId', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.LINKS_READ])]
  }, controller.getById)

  app.patch('/workspaces/:workspaceId/links/:linkId', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.LINKS_WRITE])],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, controller.update)

  app.delete('/workspaces/:workspaceId/links/:linkId', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.LINKS_WRITE])],
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      }
    }
  }, controller.softDelete)
}
