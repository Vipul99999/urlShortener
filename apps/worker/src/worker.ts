import http from 'node:http'
import { pathToFileURL } from 'node:url'
import { claimNextJob, completeJob, failJob, prisma, type Job } from '@repo/db'
import { JOB_KIND, type GenerateLinksExportPayload, type ProcessClickEventPayload } from '@repo/shared'
import { env } from './config/env.js'
import { processClickEventJob } from './processors/click-events.js'
import { processEmailJob } from './processors/email-jobs.js'
import { processExportJob } from './processors/export-jobs.js'
import { sendOperationalAlert } from './utils/alerts.js'
import { captureMonitoringError, flushMonitoring, initMonitoring } from './utils/monitoring.js'

const supportedKinds = [
  JOB_KIND.SEND_VERIFICATION_EMAIL,
  JOB_KIND.SEND_PASSWORD_RESET_EMAIL,
  JOB_KIND.SEND_INVITATION_EMAIL,
  JOB_KIND.GENERATE_LINKS_EXPORT,
  JOB_KIND.PROCESS_CLICK_EVENT
] as const

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let keepRunning = true
let shutdownInProgress = false
let workerStartedAt = new Date()
let lastJobStartedAt: string | null = null
let lastJobCompletedAt: string | null = null
let lastJobFailedAt: string | null = null
let lastProcessedJobKind: string | null = null
let lastLoopErrorAt: string | null = null
let healthServer: http.Server | null = null

function writeJson(response: http.ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

function startHealthServer() {
  healthServer = http.createServer(async (request, response) => {
    if (!request.url) {
      writeJson(response, 404, { ok: false })
      return
    }

    if (request.url === '/health') {
      writeJson(response, 200, {
        ok: true,
        workerId: env.WORKER_ID,
        startedAt: workerStartedAt.toISOString(),
        lastProcessedJobKind,
        lastJobStartedAt,
        lastJobCompletedAt,
        lastJobFailedAt,
        lastLoopErrorAt
      })
      return
    }

    if (request.url === '/ready') {
      try {
        await prisma.$queryRaw`SELECT 1`
        writeJson(response, 200, {
          ok: true,
          workerId: env.WORKER_ID
        })
      } catch (error) {
        writeJson(response, 503, {
          ok: false,
          workerId: env.WORKER_ID,
          message: error instanceof Error ? error.message : 'Worker readiness check failed'
        })
      }
      return
    }

    writeJson(response, 404, { ok: false })
  })

  healthServer.listen(env.WORKER_HEALTH_PORT, env.WORKER_HEALTH_HOST, () => {
    console.log(
      `[worker] health server listening on http://${env.WORKER_HEALTH_HOST}:${env.WORKER_HEALTH_PORT}`
    )
  })
}

export async function requestShutdown(signal: string) {
  if (shutdownInProgress) return

  shutdownInProgress = true
  keepRunning = false
  console.log(`[worker] received ${signal}; shutting down gracefully`)

  try {
    await new Promise<void>((resolve, reject) => {
      if (!healthServer) {
        resolve()
        return
      }

      healthServer.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  } catch (error) {
    console.error('[worker] failed to close health server cleanly', error)
  }

  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('[worker] failed to disconnect Prisma cleanly', error)
  }

  await flushMonitoring()
}

async function processJob(job: Job) {
  const payload = job.payloadJson

  switch (job.kind) {
    case JOB_KIND.SEND_VERIFICATION_EMAIL:
    case JOB_KIND.SEND_PASSWORD_RESET_EMAIL:
    case JOB_KIND.SEND_INVITATION_EMAIL:
      return processEmailJob(job.kind, payload)
    case JOB_KIND.GENERATE_LINKS_EXPORT:
      return processExportJob(payload as unknown as GenerateLinksExportPayload)
    case JOB_KIND.PROCESS_CLICK_EVENT:
      await processClickEventJob(payload as unknown as ProcessClickEventPayload)
      return { linkId: (payload as ProcessClickEventPayload).linkId }
    default:
      throw new Error(`Unsupported job kind: ${job.kind}`)
  }
}

export async function runWorker() {
  initMonitoring()
  workerStartedAt = new Date()
  keepRunning = true
  shutdownInProgress = false
  console.log(`[worker] starting ${env.WORKER_ID}`)
  startHealthServer()

  while (keepRunning) {
    try {
      const job = await claimNextJob(prisma, env.WORKER_ID, [...supportedKinds], {
        staleLockThresholdMs: env.JOB_STALE_LOCK_TIMEOUT_MS
      })

      if (!job) {
        await sleep(env.JOB_POLL_INTERVAL_MS)
        continue
      }

      try {
        lastJobStartedAt = new Date().toISOString()
        lastProcessedJobKind = job.kind
        const result = await processJob(job)
        await completeJob(prisma, job.id, result as never)
        lastJobCompletedAt = new Date().toISOString()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown job processing error'
        console.error(`[worker] job ${job.id} failed`, error)
        lastJobFailedAt = new Date().toISOString()
        captureMonitoringError(error, {
          tags: {
            area: 'worker',
            jobKind: job.kind
          },
          extra: {
            jobId: job.id
          }
        })

        if (job.kind === JOB_KIND.GENERATE_LINKS_EXPORT) {
          const payload = job.payloadJson as unknown as GenerateLinksExportPayload
          await prisma.exportJob.updateMany({
            where: { id: payload.exportJobId },
            data: {
              status: 'FAILED',
              errorMessage: message
            }
          })
        }

        await sendOperationalAlert({
          title: 'Worker job failed',
          level: 'error',
          source: 'worker',
          message,
          details: {
            jobId: job.id,
            kind: job.kind
          }
        })

        await failJob(prisma, job, message)
      }
    } catch (error) {
      console.error('[worker] loop error; backing off before retrying', error)
      lastLoopErrorAt = new Date().toISOString()
      captureMonitoringError(error, {
        tags: {
          area: 'worker',
          phase: 'loop'
        }
      })
      await sendOperationalAlert({
        title: 'Worker loop error',
        level: 'critical',
        source: 'worker',
        message: error instanceof Error ? error.message : 'Unknown worker loop error'
      })
      await sleep(env.WORKER_ERROR_BACKOFF_MS)
    }
  }
}

process.once('SIGINT', () => {
  void requestShutdown('SIGINT')
})

process.once('SIGTERM', () => {
  void requestShutdown('SIGTERM')
})

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
  runWorker()
    .catch((error) => {
      console.error('[worker] fatal error', error)
      captureMonitoringError(error, {
        tags: {
          area: 'worker',
          phase: 'fatal'
        }
      })
      process.exitCode = 1
    })
    .finally(async () => {
      await flushMonitoring()
      await prisma.$disconnect()
    })
}
