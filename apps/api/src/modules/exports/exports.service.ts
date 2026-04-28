import type { FastifyInstance } from 'fastify'
import { enqueueJob, type Prisma } from '@repo/db'
import { readObject } from '@repo/db'
import { JOB_KIND } from '@repo/shared'
import { ExportsRepository } from './exports.repository.js'
import { AuditService } from '../audit/audit.service.js'

export class ExportsService {
  private repo: ExportsRepository
  private audit: AuditService

  constructor(private app: FastifyInstance) {
    this.repo = new ExportsRepository(app)
    this.audit = new AuditService(app)
  }

  async exportLinksCsv(workspaceId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)
    const existing = await this.repo.findInFlightLinksExport(workspaceId, userId)

    if (existing) {
      return {
        exportId: existing.id,
        filename: existing.fileName || `links-${workspaceId}.csv`,
        status: existing.status,
        reused: true
      }
    }

    const fileName = `links-${workspaceId}-${Date.now()}.csv`

    const job = await this.repo.createExportJob({
      workspaceId,
      requestedById: userId,
      type: 'links_csv',
      status: 'PENDING',
      fileUrl: null,
      fileName,
      contentType: 'text/csv',
      content: null,
      filtersJson: null,
      errorMessage: null,
      completedAt: null
    })

    await enqueueJob(this.app.prisma, {
      kind: JOB_KIND.GENERATE_LINKS_EXPORT,
      payload: {
        exportJobId: job.id,
        workspaceId,
        requestedById: userId
      } as Prisma.InputJsonValue
    })

    await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'export.request_links_csv',
  entityType: 'export_job',
  entityId: job.id,
  metadataJson: {
    filename: fileName
  }
})
    return {
      exportId: job.id,
      filename: fileName,
      status: job.status,
      reused: false
    }
  }

  async list(workspaceId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)
    const jobs = await this.repo.listExportJobs(workspaceId)

    return jobs.map((job) => ({
      ...job,
      content: undefined,
      downloadUrl:
        job.status === 'COMPLETED' && (job.fileUrl || job.content)
          ? `/workspaces/${workspaceId}/exports/${job.id}/download`
          : null
    }))
  }

  async getById(workspaceId: string, exportId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const job = await this.repo.findExportJob(workspaceId, exportId)
    if (!job) {
      throw this.app.httpErrors.notFound('Export not found')
    }

    return {
      ...job,
      content: undefined,
      downloadUrl:
        job.status === 'COMPLETED' && (job.fileUrl || job.content)
          ? `/workspaces/${workspaceId}/exports/${job.id}/download`
          : null
    }
  }

  async download(workspaceId: string, exportId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const job = await this.repo.findExportJob(workspaceId, exportId)
    if (!job) {
      throw this.app.httpErrors.notFound('Export not found')
    }

    if (job.status !== 'COMPLETED' || (!job.fileUrl && !job.content)) {
      throw this.app.httpErrors.conflict('Export is not ready yet')
    }

    const content = job.fileUrl
      ? (await readObject(job.fileUrl)).toString('utf8')
      : job.content

    if (!content) {
      throw this.app.httpErrors.notFound('Export file is missing')
    }

    return {
      filename: job.fileName || `links-${workspaceId}.csv`,
      contentType: job.contentType || 'text/csv',
      content
    }
  }

  private async ensureMembership(workspaceId: string, userId: string) {
    const membership = await this.repo.findMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }
  }
}
