import type { FastifyPluginAsync } from 'fastify'
import { RedirectsController } from './redirects.controller.js'
import { RedirectsService } from './redirects.service.js'

export const redirectRoutes: FastifyPluginAsync = async (app) => {
  const service = new RedirectsService(app)
  const controller = new RedirectsController(service)

  app.get('/r/:domain/:slug', {
    config: {
      rateLimit: {
        max: 600,
        timeWindow: '1 minute'
      }
    }
  }, controller.resolveDomain)
  app.get('/:slug', {
    config: {
      rateLimit: {
        max: 600,
        timeWindow: '1 minute'
      }
    }
  }, controller.resolveDefault)
}
