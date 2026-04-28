import type { FastifyPluginAsync } from 'fastify'
import { InvitationsController } from './invitations.controller.js'
import { InvitationsService } from './invitations.service.js'

export const invitationRoutes: FastifyPluginAsync = async (app) => {
  const service = new InvitationsService(app)
  const controller = new InvitationsController(service)

  app.get('/workspaces/:workspaceId/invitations', {
    preHandler: [app.authenticateUser]
  }, controller.list)

  app.post('/workspaces/:workspaceId/invitations', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, controller.create)

  app.delete('/workspaces/:workspaceId/invitations/:invitationId', {
    preHandler: [app.authenticateUser]
  }, controller.revoke)

  app.get('/invitations/accept', {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '10 minutes'
      }
    }
  }, controller.preview)

  app.post('/invitations/accept', {
    preHandler: [app.authenticateUser],
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, controller.accept)
}
