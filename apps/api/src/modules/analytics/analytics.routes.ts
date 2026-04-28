import type { FastifyPluginAsync } from 'fastify'
import { API_KEY_SCOPES } from '@repo/shared'
import { AnalyticsController } from './analytics.controller.js'
import { AnalyticsService } from './analytics.service.js'
import { requireApiKeyScopes } from '../../common/utils/api-key-scopes.js'

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  const service = new AnalyticsService(app)
  const controller = new AnalyticsController(service)

  app.get('/workspaces/:workspaceId/analytics/summary', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.ANALYTICS_READ])]
  }, controller.workspaceSummary)

  app.get('/workspaces/:workspaceId/analytics/overview', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.ANALYTICS_READ])]
  }, controller.workspaceOverview)

  app.get('/workspaces/:workspaceId/links/:linkId/analytics/summary', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.ANALYTICS_READ])]
  }, controller.linkSummary)

  app.get('/workspaces/:workspaceId/links/:linkId/analytics/daily', {
    preHandler: [app.authenticateAny, requireApiKeyScopes([API_KEY_SCOPES.ANALYTICS_READ])]
  }, controller.linkDaily)
}
