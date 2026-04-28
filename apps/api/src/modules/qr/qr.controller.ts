import type { FastifyReply, FastifyRequest } from 'fastify'
import type { QrService } from './qr.service.js'

export class QrController {
  constructor(private service: QrService) {}

  generate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { workspaceId, linkId } = request.params as {
      workspaceId: string
      linkId: string
    }

    const result = await this.service.generate(workspaceId, linkId, request.authUser.userId)
    return reply.send(result)
  }
}