import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ApiKeysService } from './api-keys.service.js'

export class ApiKeysController {
  constructor(private service: ApiKeysService) {}

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
    const { workspaceId, apiKeyId } = request.params as {
      workspaceId: string
      apiKeyId: string
    }
    const result = await this.service.revoke(workspaceId, apiKeyId, request.authUser.userId)
    return reply.send(result)
  }

  usage = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, apiKeyId } = request.params as {
      workspaceId: string
      apiKeyId: string
    }
    const result = await this.service.usage(workspaceId, apiKeyId, request.authUser.userId)
    return reply.send(result)
  }
}
