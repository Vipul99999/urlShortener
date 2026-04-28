import type { FastifyReply, FastifyRequest } from 'fastify'
import type { TagsService } from './tags.service.js'

export class TagsController {
  constructor(private service: TagsService) {}

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

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, tagId } = request.params as { workspaceId: string; tagId: string }
    const result = await this.service.update(workspaceId, tagId, request.authUser.userId, request.body)
    return reply.send(result)
  }

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, tagId } = request.params as { workspaceId: string; tagId: string }
    const result = await this.service.remove(workspaceId, tagId, request.authUser.userId)
    return reply.send(result)
  }

  attachToLink = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId } = request.params as { workspaceId: string; linkId: string }
    const result = await this.service.attachToLink(workspaceId, linkId, request.authUser.userId, request.body)
    return reply.send(result)
  }

  detachFromLink = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId, tagId } = request.params as {
      workspaceId: string
      linkId: string
      tagId: string
    }
    const result = await this.service.detachFromLink(workspaceId, linkId, tagId, request.authUser.userId)
    return reply.send(result)
  }
}