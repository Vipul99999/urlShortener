import type { FastifyReply, FastifyRequest } from 'fastify'
import type { LinksService } from './links.service.js'

export class LinksController {
  constructor(private service: LinksService) {}

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

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId } = request.params as { workspaceId: string; linkId: string }
    const result = await this.service.getById(workspaceId, linkId, request.authUser.userId)
    return reply.send(result)
  }

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId } = request.params as { workspaceId: string; linkId: string }
    const result = await this.service.update(workspaceId, linkId, request.authUser.userId, request.body)
    return reply.send(result)
  }

  softDelete = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId } = request.params as { workspaceId: string; linkId: string }
    const result = await this.service.softDelete(workspaceId, linkId, request.authUser.userId)
    return reply.send(result)
  }
}