import type { FastifyInstance } from 'fastify'

export class QrRepository {
  constructor(private app: FastifyInstance) {}

  findMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId
      },
      select: { id: true }
    })
  }

  findLink(workspaceId: string, linkId: string) {
    return this.app.prisma.link.findFirst({
      where: {
        id: linkId,
        workspaceId,
        deletedAt: null
      }
    })
  }

  createQrRecord(data: {
    linkId: string
    generatedById: string
    format: string
    size: number
    fileUrl?: string | null
  }) {
    return this.app.prisma.qrCode.create({
      data
    })
  }
}