import type { FastifyReply, FastifyRequest } from 'fastify'
import type { ExportsService } from './exports.service.js'

export class ExportsController {
  constructor(private service: ExportsService) {}

  exportLinksCsv = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.exportLinksCsv(workspaceId, request.authUser.userId)
    return reply.send(result)
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await this.service.list(workspaceId, request.authUser.userId)
    return reply.send(result)
  }

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, exportId } = request.params as { workspaceId: string; exportId: string }
    const result = await this.service.getById(workspaceId, exportId, request.authUser.userId)
    return reply.send(result)
  }

  download = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, exportId } = request.params as { workspaceId: string; exportId: string }
    const result = await this.service.download(workspaceId, exportId, request.authUser.userId)

    reply.header('Content-Type', result.contentType)
    reply.header('Content-Disposition', `attachment; filename="${result.filename}"`)

    return reply.send(result.content)
  }
}
