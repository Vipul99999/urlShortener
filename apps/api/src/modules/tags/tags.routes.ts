import type { FastifyPluginAsync } from 'fastify'
import { API_KEY_SCOPES } from '@repo/shared'
import { TagsController } from './tags.controller.js'
import { TagsService } from './tags.service.js'
import { requireApiKeyScopes } from '../../common/utils/api-key-scopes.js'

export const tagRoutes: FastifyPluginAsync = async (app) => {
  const service = new TagsService(app)
  const controller = new TagsController(service)

  app.get('/workspaces/:workspaceId/tags', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.TAGS_READ])]
  }, controller.list)

  app.post('/workspaces/:workspaceId/tags', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.TAGS_WRITE])]
  }, controller.create)

  app.patch('/workspaces/:workspaceId/tags/:tagId', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.TAGS_WRITE])]
  }, controller.update)

  app.delete('/workspaces/:workspaceId/tags/:tagId', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.TAGS_WRITE])]
  }, controller.remove)

  app.post('/workspaces/:workspaceId/links/:linkId/tags', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.TAGS_WRITE])]
  }, controller.attachToLink)

  app.delete('/workspaces/:workspaceId/links/:linkId/tags/:tagId', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.TAGS_WRITE])]
  }, controller.detachFromLink)
}
