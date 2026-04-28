import type { FastifyPluginAsync } from 'fastify'
import { ApiKeysController } from './api-keys.controller.js'
import { ApiKeysService } from './api-keys.service.js'

export const apiKeysRoutes: FastifyPluginAsync = async (app) => {
  const service = new ApiKeysService(app)
  const controller = new ApiKeysController(service)

  app.get('/workspaces/:workspaceId/api-keys', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, controller.list)

  app.post('/workspaces/:workspaceId/api-keys', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 12,
        timeWindow: '10 minutes'
      }
    }
  }, controller.create)

  app.get('/workspaces/:workspaceId/api-keys/:apiKeyId/usage', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, controller.usage)

  app.delete('/workspaces/:workspaceId/api-keys/:apiKeyId', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, controller.revoke)
}
