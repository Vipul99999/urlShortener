import type { FastifyPluginAsync } from 'fastify'
import { UsersController } from './users.controller.js'
import { UsersService } from './users.service.js'

export const usersRoutes: FastifyPluginAsync = async (app) => {
  const service = new UsersService(app)
  const controller = new UsersController(service)

  app.get('/users/me', {
    preHandler: [app.authenticateUser]
  }, controller.me)

  app.patch('/users/me', {
    preHandler: [app.authenticateUser]
  }, controller.updateMe)

  app.get('/workspaces/:workspaceId/members', {
    preHandler: [app.authenticateUser]
  }, controller.listWorkspaceMembers)
}
