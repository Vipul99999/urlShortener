import type { Prisma } from '@repo/db'
import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'

function hashIpAddress(ipAddress: string | null | undefined) {
  if (!ipAddress) return null
  return crypto.createHash('sha256').update(ipAddress).digest('hex')
}

export async function recordAbuseSignal(
  app: FastifyInstance,
  input: {
    workspaceId?: string | null
    source: string
    kind: string
    ipAddress?: string | null
    hostname?: string | null
    path?: string | null
    userAgent?: string | null
    actionTaken?: string | null
    metadataJson?: unknown
  }
) {
  try {
    await app.prisma.abuseSignal.create({
      data: {
        workspaceId: input.workspaceId ?? null,
        source: input.source,
        kind: input.kind,
        ipHash: hashIpAddress(input.ipAddress),
        hostname: input.hostname ?? null,
        path: input.path ?? null,
        userAgent: input.userAgent ?? null,
        actionTaken: input.actionTaken ?? null,
        metadataJson:
          input.metadataJson === undefined
            ? undefined
            : (input.metadataJson as Prisma.InputJsonValue)
      }
    })
  } catch (error) {
    app.log.error({ error }, 'Failed to record abuse signal')
  }
}
