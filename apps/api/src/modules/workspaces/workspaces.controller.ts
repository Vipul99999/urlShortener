import type { FastifyReply, FastifyRequest } from 'fastify'
import type { WorkspacesService } from './workspaces.service.js'

export class WorkspacesController {
  constructor(private service: WorkspacesService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.listForUser(request.authUser.userId)
    return reply.send(result)
  }

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.create(request.authUser.userId, request.body)
    return reply.send(result)
  }

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.getById(workspaceId, request.authUser.userId)
    return reply.send(result)
  }

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.update(workspaceId, request.authUser.userId, request.body)
    return reply.send(result)
  }
}