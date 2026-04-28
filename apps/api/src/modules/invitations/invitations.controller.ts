import type { FastifyReply, FastifyRequest } from 'fastify'
import type { InvitationsService } from './invitations.service.js'

export class InvitationsController {
  constructor(private service: InvitationsService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.list(workspaceId, request.authUser.userId)
    return reply.send(result)
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.create(workspaceId, request.authUser.userId, request.body)
    return reply.send(result)
  }

  revoke = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, invitationId } = request.params as {
      workspaceId: string
      invitationId: string
    }
    const result = await this.service.revoke(workspaceId, invitationId, request.authUser.userId)
    return reply.send(result)
  }

  preview = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.preview(request.query)
    return reply.send(result)
  }

  accept = async (request: FastifyRequest, reply: FastifyReply) => {
    const email = await this.service.getUserEmail(request.authUser.userId)
    const result = await this.service.accept(request.authUser.userId, email, request.body)
    return reply.send(result)
  }
}
