import type { FastifyReply, FastifyRequest } from 'fastify'
import type { AuditService } from './audit.service.js'

export class AuditController {
  constructor(private service: AuditService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.list(workspaceId, request.authUser.userId)
    return reply.send(result)
  }
}