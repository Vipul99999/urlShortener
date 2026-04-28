import type { FastifyPluginAsync } from 'fastify'
import { DomainsController } from './domains.controller.js'
import { DomainsService } from './domains.service.js'

export const domainRoutes: FastifyPluginAsync = async (app) => {
  const service = new DomainsService(app)
  const controller = new DomainsController(service)

  app.get('/workspaces/:workspaceId/domains', {
    preHandler: [app.authenticateUser]
  }, controller.list)

  app.post('/workspaces/:workspaceId/domains', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 12,
        timeWindow: '10 minutes'
      }
    }
  }, controller.create)

  app.delete('/workspaces/:workspaceId/domains/:domainId', {
    preHandler: [app.authenticateUser]
  }, controller.remove)

  app.get('/workspaces/:workspaceId/domains/:domainId/diagnostics', {
    preHandler: [app.authenticateUser]
  }, controller.diagnostics)

  app.post('/workspaces/:workspaceId/domains/:domainId/refresh-verification', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, controller.refreshVerification)

  app.patch('/workspaces/:workspaceId/domains/:domainId/status', {
    preHandler: [app.authenticateUser]
  }, controller.updateStatus)

  app.get('/.well-known/url-shortener-domain-verification', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '10 minutes'
      }
    }
  }, controller.verify)
}
