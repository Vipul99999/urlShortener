import type { FastifyPluginAsync } from 'fastify'
import { WorkspacesController } from './workspaces.controller.js'
import { WorkspacesService } from './workspaces.service.js'

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
  const service = new WorkspacesService(app)
  const controller = new WorkspacesController(service)

  app.get('/', {
    preHandler: [app.authenticateUser]
  }, controller.list)

  app.post('/', {
    preHandler: [app.authenticateUser]
  }, controller.create)

  app.get('/:workspaceId', {
    preHandler: [app.authenticateUser]
  }, controller.getById)

  app.patch('/:workspaceId', {
    preHandler: [app.authenticateUser]
  }, controller.update)
}
