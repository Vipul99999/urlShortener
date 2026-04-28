import { objectPublicPath, prisma, writeObject } from '@repo/db'
import type { GenerateLinksExportPayload } from '@repo/shared'

function csvEscape(value: unknown) {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function processExportJob(payload: GenerateLinksExportPayload) {
  if (!payload.exportJobId || !payload.workspaceId) {
    throw new Error('Export job payload is incomplete')
  }

  const exportJob = await prisma.exportJob.findUnique({
    where: { id: payload.exportJobId }
  })

  if (!exportJob) {
    throw new Error('Export job not found')
  }

  await prisma.exportJob.update({
    where: { id: payload.exportJobId },
    data: {
      status: 'PROCESSING',
      errorMessage: null
    }
  })

  const links = await prisma.link.findMany({
    where: {
      workspaceId: payload.workspaceId,
      deletedAt: null
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const rows = [
    ['id', 'title', 'slug', 'domain', 'destinationUrl', 'campaign', 'status', 'totalClicks', 'createdAt']
  ]

  for (const link of links) {
    rows.push([
      link.id,
      link.title ?? '',
      link.slug,
      link.domain,
      link.destinationUrl,
      link.campaign ?? '',
      link.status,
      Number(link.totalClicks).toString(),
      link.createdAt.toISOString()
    ])
  }

  const csv = rows
    .map((row) => row.map(csvEscape).join(','))
    .join('\n')

  const fileName = exportJob.fileName || `links-${payload.workspaceId}-${Date.now()}.csv`
  const storageKey = objectPublicPath(pathForExport(payload.workspaceId, payload.exportJobId, fileName))

  await writeObject(storageKey, csv, {
    contentType: 'text/csv'
  })

  await prisma.exportJob.update({
    where: { id: payload.exportJobId },
    data: {
      status: 'COMPLETED',
      fileUrl: storageKey,
      fileName,
      contentType: exportJob.contentType || 'text/csv',
      content: null,
      errorMessage: null,
      completedAt: new Date()
    }
  })

  return {
    exportJobId: payload.exportJobId,
    fileName,
    rowCount: links.length
  }
}

function pathForExport(workspaceId: string, exportJobId: string, fileName: string) {
  return `${workspaceId}/${exportJobId}/${fileName}`
}
