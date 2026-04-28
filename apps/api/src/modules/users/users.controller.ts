import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UsersService } from './users.service.js'

export class UsersController {
  constructor(private service: UsersService) {}

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.me(request.authUser.userId)
    return reply.send(result)
  }

  updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await this.service.updateMe(request.authUser.userId, request.body)
    return reply.send(result)
  }

  listWorkspaceMembers = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.listWorkspaceMembers(workspaceId, request.authUser.userId)
    return reply.send(result)
  }
}