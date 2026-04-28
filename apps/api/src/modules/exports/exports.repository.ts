import type { FastifyInstance } from 'fastify'

export class ExportsRepository {
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

  listLinks(workspaceId: string) {
    return this.app.prisma.link.findMany({
      where: {
        workspaceId,
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  listExportJobs(workspaceId: string) {
    return this.app.prisma.exportJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    })
  }

  findExportJob(workspaceId: string, exportId: string) {
    return this.app.prisma.exportJob.findFirst({
      where: {
        id: exportId,
        workspaceId
      }
    })
  }

  createExportJob(data: {
    workspaceId: string
    requestedById: string
    type: string
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    fileUrl?: string | null
    fileName?: string | null
    contentType?: string | null
    content?: string | null
    filtersJson?: any
    errorMessage?: string | null
    completedAt?: Date | null
  }) {
    return this.app.prisma.exportJob.create({
      data
    })
  }

  findInFlightLinksExport(workspaceId: string, requestedById: string) {
    return this.app.prisma.exportJob.findFirst({
      where: {
        workspaceId,
        requestedById,
        type: 'links_csv',
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }

  updateExportJob(
    exportId: string,
    data: {
      status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
      fileUrl?: string | null
      fileName?: string | null
      contentType?: string | null
      content?: string | null
      errorMessage?: string | null
      completedAt?: Date | null
    }
  ) {
    return this.app.prisma.exportJob.update({
      where: { id: exportId },
      data
    })
  }
}
