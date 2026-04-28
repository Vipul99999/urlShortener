import type { FastifyReply, FastifyRequest } from 'fastify'
import type { DomainsService } from './domains.service.js'

export class DomainsController {
  constructor(private service: DomainsService) {}

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

  remove = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, domainId } = request.params as { workspaceId: string; domainId: string }
    const result = await this.service.delete(workspaceId, domainId, request.authUser.userId)
    return reply.send(result)
  }

  diagnostics = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, domainId } = request.params as { workspaceId: string; domainId: string }
    const result = await this.service.diagnostics(workspaceId, domainId, request.authUser.userId)
    return reply.send(result)
  }

  refreshVerification = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, domainId } = request.params as { workspaceId: string; domainId: string }
    const result = await this.service.rotateVerification(workspaceId, domainId, request.authUser.userId)
    return reply.send(result)
  }

  updateStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, domainId } = request.params as { workspaceId: string; domainId: string }
    const result = await this.service.updateStatus(workspaceId, domainId, request.authUser.userId, request.body)
    return reply.send(result)
  }

  verify = async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.query as { token?: string }
    const result = await this.service.verifyFromHostname(
      typeof request.headers.host === 'string' ? request.headers.host : undefined,
      token
    )
    return reply.send({
      success: true,
      domain: result
    })
  }
}
