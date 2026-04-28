import type { Job, JobKind, Prisma, PrismaClient } from '@prisma/client'

export async function enqueueJob<TPayload>(
  db: PrismaClient | Prisma.TransactionClient,
  input: {
    kind: JobKind
    payload: TPayload
    availableAt?: Date
    maxAttempts?: number
  }
) {
  return db.job.create({
    data: {
      kind: input.kind,
      payloadJson: input.payload as Prisma.InputJsonValue,
      availableAt: input.availableAt,
      maxAttempts: input.maxAttempts ?? 5
    }
  })
}

export async function claimNextJob(
  db: PrismaClient,
  workerId: string,
  kinds?: JobKind[],
  options?: {
    staleLockThresholdMs?: number
  }
): Promise<Job | null> {
  const now = new Date()
  const staleLockThresholdMs = options?.staleLockThresholdMs ?? 5 * 60 * 1000
  const staleBefore = new Date(now.getTime() - staleLockThresholdMs)

  return db.$transaction(async (tx) => {
    await tx.job.updateMany({
      where: {
        status: 'PROCESSING',
        lockedAt: {
          lte: staleBefore
        }
      },
      data: {
        status: 'PENDING',
        lockedAt: null,
        lockedBy: null
      }
    })

    const job = await tx.job.findFirst({
      where: {
        status: 'PENDING',
        availableAt: {
          lte: now
        },
        ...(kinds && kinds.length > 0
          ? {
              kind: {
                in: kinds
              }
            }
          : {})
      },
      orderBy: [
        { availableAt: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    if (!job) {
      return null
    }

    const claimed = await tx.job.updateMany({
      where: {
        id: job.id,
        status: 'PENDING'
      },
      data: {
        status: 'PROCESSING',
        lockedAt: now,
        lockedBy: workerId
      }
    })

    if (claimed.count === 0) {
      return null
    }

    return tx.job.findUnique({
      where: { id: job.id }
    })
  })
}

export async function completeJob(
  db: PrismaClient,
  jobId: string,
  result?: Prisma.InputJsonValue | null
) {
  return db.job.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      resultJson: result ?? undefined,
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null
    }
  })
}

export async function failJob(
  db: PrismaClient,
  job: Pick<Job, 'id' | 'attempts' | 'maxAttempts'>,
  errorMessage: string
) {
  const nextAttempts = job.attempts + 1
  const exhausted = nextAttempts >= job.maxAttempts
  const retryDelayMs = Math.min(60_000, nextAttempts * 5_000)

  return db.job.update({
    where: { id: job.id },
    data: exhausted
      ? {
          status: 'FAILED',
          attempts: nextAttempts,
          errorMessage,
          lockedAt: null,
          lockedBy: null
        }
      : {
          status: 'PENDING',
          attempts: nextAttempts,
          errorMessage,
          availableAt: new Date(Date.now() + retryDelayMs),
          lockedAt: null,
          lockedBy: null
        }
  })
}
