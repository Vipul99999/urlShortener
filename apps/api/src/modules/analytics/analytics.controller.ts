import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AnalyticsService } from './analytics.service.js'

export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  workspaceSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.getWorkspaceSummary(workspaceId, request.authUser.userId)
    return reply.send(result)
  }

  workspaceOverview = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.getWorkspaceOverview(workspaceId, request.authUser.userId)
    return reply.send(result)
  }

  linkSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId } = request.params as { workspaceId: string; linkId: string }
    const result = await this.service.getLinkSummary(workspaceId, linkId, request.authUser.userId)
    return reply.send(result)
  }

  linkDaily = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId } = request.params as { workspaceId: string; linkId: string }
    const result = await this.service.getLinkDaily(workspaceId, linkId, request.authUser.userId)
    return reply.send(result)
  }
}
