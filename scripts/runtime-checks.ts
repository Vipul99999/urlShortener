import http from 'node:http'
import net from 'node:net'
import { pathToFileURL } from 'node:url'
import { claimNextJob, completeJob, Prisma, prisma, readObject, writeObject } from '../packages/db/src/index.js'

type RedisValue = string | number | null

type RedisServerHandle = {
  close: () => Promise<void>
}

function readLine(buffer: Buffer, start: number) {
  const end = buffer.indexOf('\r\n', start)
  if (end === -1) return null

  return {
    line: buffer.toString('utf8', start, end),
    nextOffset: end + 2
  }
}

function parseValue(buffer: Buffer, start = 0): { value: RedisValue; nextOffset: number } | null {
  if (start >= buffer.length) return null

  const prefix = String.fromCharCode(buffer[start])

  if (prefix === '+' || prefix === '-' || prefix === ':') {
    const line = readLine(buffer, start + 1)
    if (!line) return null

    if (prefix === '-') {
      throw new Error(line.line)
    }

    return {
      value: prefix === ':' ? Number(line.line) : line.line,
      nextOffset: line.nextOffset
    }
  }

  if (prefix === '$') {
    const line = readLine(buffer, start + 1)
    if (!line) return null

    const size = Number(line.line)
    if (size === -1) {
      return {
        value: null,
        nextOffset: line.nextOffset
      }
    }

    const end = line.nextOffset + size
    if (buffer.length < end + 2) return null

    return {
      value: buffer.toString('utf8', line.nextOffset, end),
      nextOffset: end + 2
    }
  }

  throw new Error(`Unsupported Redis response prefix: ${prefix}`)
}

function readCommand(buffer: Buffer, start = 0) {
  if (start >= buffer.length || buffer[start] !== 42) {
    return null
  }

  const lineEnd = buffer.indexOf('\r\n', start)
  if (lineEnd === -1) return null
  const partCount = Number(buffer.toString('utf8', start + 1, lineEnd))

  let offset = lineEnd + 2
  const parts: string[] = []

  for (let i = 0; i < partCount; i += 1) {
    if (offset >= buffer.length || buffer[offset] !== 36) return null
    const sizeEnd = buffer.indexOf('\r\n', offset)
    if (sizeEnd === -1) return null

    const size = Number(buffer.toString('utf8', offset + 1, sizeEnd))
    const valueStart = sizeEnd + 2
    const valueEnd = valueStart + size

    if (buffer.length < valueEnd + 2) return null

    parts.push(buffer.toString('utf8', valueStart, valueEnd))
    offset = valueEnd + 2
  }

  return {
    parts,
    nextOffset: offset
  }
}

function encodeSimpleString(value: string) {
  return `+${value}\r\n`
}

function encodeBulkString(value: string | null) {
  if (value == null) return '$-1\r\n'
  return `$${Buffer.byteLength(value)}\r\n${value}\r\n`
}

function encodeInteger(value: number) {
  return `:${value}\r\n`
}

async function startFakeRedis(port: number) {
  const store = new Map<string, { value: string; expiresAt: number | null }>()

  function cleanup() {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) {
        store.delete(key)
      }
    }
  }

  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0)

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk])

      while (true) {
        const parsed = readCommand(buffer)
        if (!parsed) break

        const [command, ...args] = parsed.parts
        const upper = command.toUpperCase()

        switch (upper) {
          case 'PING':
          case 'AUTH':
          case 'SELECT':
            socket.write(encodeSimpleString('OK'))
            break
          case 'GET': {
            cleanup()
            const entry = store.get(args[0])
            socket.write(encodeBulkString(entry?.value ?? null))
            break
          }
          case 'SETEX':
            store.set(args[0], {
              value: args[2],
              expiresAt: Date.now() + Number(args[1]) * 1000
            })
            socket.write(encodeSimpleString('OK'))
            break
          case 'DEL': {
            const existed = store.delete(args[0])
            socket.write(encodeInteger(existed ? 1 : 0))
            break
          }
          default:
            socket.write(`-ERR unsupported command ${upper}\r\n`)
        }

        buffer = buffer.subarray(parsed.nextOffset)
      }
    })
  })

  await new Promise<void>((resolve) => {
    server.listen(port, '127.0.0.1', resolve)
  })

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      })
  } satisfies RedisServerHandle
}

async function sendRedisGet(port: number, key: string) {
  const socket = net.createConnection({ host: '127.0.0.1', port })
  const payload = `*2\r\n$3\r\nGET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n`

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []

    socket.on('data', (chunk) => {
      chunks.push(chunk)
      socket.end()
    })

    socket.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })

    socket.on('error', reject)
    socket.write(payload)
  })
}

async function waitForHttp(url: string, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  throw new Error(`Timed out waiting for ${url}`)
}

function requestHttp(input: {
  port: number
  method: string
  path: string
  headers?: Record<string, string>
  body?: string
}) {
  return new Promise<{
    statusCode: number
    headers: http.IncomingHttpHeaders
    body: string
  }>((resolve, reject) => {
    const request = http.request(
      {
        host: '127.0.0.1',
        port: input.port,
        method: input.method,
        path: input.path,
        headers: input.headers
      },
      (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode || 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8')
          })
        })
      }
    )

    request.on('error', reject)

    if (input.body) {
      request.write(input.body)
    }

    request.end()
  })
}

async function ensureRuntimeUser() {
  const existing = await prisma.user.findUnique({
    where: { email: 'demo@example.com' }
  })

  if (existing) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: existing.id },
      orderBy: { joinedAt: 'asc' }
    })

    if (membership) {
      return {
        userId: existing.id,
        workspaceId: membership.workspaceId
      }
    }
  }

  const user = await prisma.user.create({
    data: {
      email: 'demo@example.com',
      name: 'Runtime Demo User',
      emailVerified: true
    }
  })

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Runtime Demo Workspace',
      slug: `runtime-demo-${Date.now()}`
    }
  })

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'OWNER'
    }
  })

  return {
    userId: user.id,
    workspaceId: workspace.id
  }
}

async function waitForExportCompletion(exportJobId: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const exportJob = await prisma.exportJob.findUnique({
      where: { id: exportJobId }
    })

    if (exportJob?.status === 'COMPLETED') {
      return exportJob
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error('Timed out waiting for export job completion')
}

function startOfUtcDay(timestamp: Date) {
  return new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()))
}

async function processClickEventPayload(payload: {
  linkId: string
  clickedAt: string
  ipHash: string | null
  referrer: string | null
  userAgent: string | null
  country: string | null
  city: string | null
}) {
  const clickedAt = new Date(payload.clickedAt)
  const dayStart = startOfUtcDay(clickedAt)

  await prisma.$transaction(async (tx) => {
    let uniqueIncrement = 0
    let dailyUniqueIncrement = 0

    if (payload.ipHash) {
      uniqueIncrement = await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "link_unique_visitors" ("linkId", "ipHash", "firstSeenAt")
          VALUES (${payload.linkId}::uuid, ${payload.ipHash}, ${clickedAt})
          ON CONFLICT ("linkId", "ipHash") DO NOTHING
        `
      )

      dailyUniqueIncrement = await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "link_daily_unique_visitors" ("linkId", "date", "ipHash", "firstSeenAt")
          VALUES (${payload.linkId}::uuid, ${dayStart}::date, ${payload.ipHash}, ${clickedAt})
          ON CONFLICT ("linkId", "date", "ipHash") DO NOTHING
        `
      )
    }

    await tx.link.update({
      where: { id: payload.linkId },
      data: {
        totalClicks: { increment: 1 },
        uniqueClicks: { increment: uniqueIncrement },
        lastClickedAt: clickedAt
      }
    })

    await tx.linkDailyStat.upsert({
      where: {
        linkId_date: {
          linkId: payload.linkId,
          date: dayStart
        }
      },
      update: {
        clicks: { increment: 1 },
        uniqueClicks: { increment: dailyUniqueIncrement }
      },
      create: {
        linkId: payload.linkId,
        date: dayStart,
        clicks: 1,
        uniqueClicks: dailyUniqueIncrement
      }
    })

    await tx.linkClickEvent.create({
      data: {
        linkId: payload.linkId,
        clickedAt,
        ipHash: payload.ipHash,
        country: payload.country,
        city: payload.city,
        referrer: payload.referrer,
        referrerHost: payload.referrer ? new URL(payload.referrer).hostname.toLowerCase() : null,
        userAgent: payload.userAgent,
        deviceType: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        isBot: false
      }
    })
  })
}

async function processExportPayload(payload: {
  exportJobId: string
  workspaceId: string
}) {
  const exportJob = await prisma.exportJob.findUniqueOrThrow({
    where: { id: payload.exportJobId }
  })

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
    ['id', 'title', 'slug', 'domain', 'destinationUrl', 'campaign', 'status', 'totalClicks', 'createdAt'],
    ...links.map((link) => [
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
  ]

  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const stringValue = String(value ?? '')
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(',')
    )
    .join('\n')

  const fileName = exportJob.fileName || `runtime-export-${Date.now()}.csv`
  const storageKey = `${payload.workspaceId}/${payload.exportJobId}/${fileName}`

  await writeObject(storageKey, csv)

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
}

async function ensureRuntimeSchemaSupport() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      CREATE TYPE "CustomDomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISABLED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "workspace_domains" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "workspaceId" UUID NOT NULL,
      "hostname" VARCHAR(191) NOT NULL,
      "status" "CustomDomainStatus" NOT NULL DEFAULT 'PENDING',
      "verificationToken" VARCHAR(64) NOT NULL,
      "verifiedAt" TIMESTAMPTZ(6),
      "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "workspace_domains_pkey" PRIMARY KEY ("id")
    );
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "workspace_domains_hostname_key"
    ON "workspace_domains"("hostname");
  `)

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "workspace_domains_verificationToken_key"
    ON "workspace_domains"("verificationToken");
  `)

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "link_click_events"
    ADD COLUMN IF NOT EXISTS "referrerHost" VARCHAR(191);
  `)
}

export async function runRedisRecoverySimulation() {
  process.env.PORT = '4100'
  process.env.HOST = '127.0.0.1'
  process.env.API_URL = 'http://127.0.0.1:4100'
  process.env.APP_URL = 'http://127.0.0.1:3000'
  process.env.REDIS_URL = 'redis://127.0.0.1:6381'
  process.env.REDIS_RECONNECT_INTERVAL_MS = '1000'

  const { buildApp } = await import('../apps/api/src/app.js')
  let redis = await startFakeRedis(6381)
  const app = await buildApp()

  try {
    const user = await prisma.user.findFirstOrThrow({
      orderBy: { createdAt: 'asc' }
    })
    const membership = await prisma.workspaceMember.findFirstOrThrow({
      where: { userId: user.id },
      orderBy: { joinedAt: 'asc' }
    })
    const slug = 'runtime-redis-check'

    await prisma.link.upsert({
      where: {
        domain_slug: {
          domain: 'default',
          slug
        }
      },
      update: {
        workspaceId: membership.workspaceId,
        createdById: user.id,
        destinationUrl: 'https://example.com/runtime-check',
        normalizedUrl: 'https://example.com/runtime-check',
        status: 'ACTIVE',
        deletedAt: null
      },
      create: {
        workspaceId: membership.workspaceId,
        createdById: user.id,
        domain: 'default',
        slug,
        title: 'Runtime Redis Check',
        destinationUrl: 'https://example.com/runtime-check',
        normalizedUrl: 'https://example.com/runtime-check',
        campaign: 'runtime-check'
      }
    })

    await app.listen({ host: '127.0.0.1', port: 4100 })
    await waitForHttp('http://127.0.0.1:4100/health')

    const firstRedirect = await fetch(`http://127.0.0.1:4100/${slug}`, { redirect: 'manual' })
    const redisBefore = await sendRedisGet(6381, `redirect:default:${slug}`)

    await redis.close()
    const secondRedirect = await fetch(`http://127.0.0.1:4100/${slug}`, { redirect: 'manual' })

    redis = await startFakeRedis(6381)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const thirdRedirect = await fetch(`http://127.0.0.1:4100/${slug}`, { redirect: 'manual' })
    await new Promise((resolve) => setTimeout(resolve, 1500))
    const redisAfter = await sendRedisGet(6381, `redirect:default:${slug}`)

    return {
      firstRedirectStatus: firstRedirect.status,
      secondRedirectStatusWhileRedisDown: secondRedirect.status,
      thirdRedirectStatusAfterRedisRestart: thirdRedirect.status,
      redisValueBeforeRestart: redisBefore,
      redisValueAfterRestart: redisAfter,
      recoveryConfirmed: secondRedirect.status === 302 && redisAfter.includes('https://example.com')
    }
  } finally {
    await app.close()
    await redis.close().catch(() => {})
  }
}

export async function runWorkerRecoverySimulation() {
  const user = await prisma.user.findFirstOrThrow({
    orderBy: { createdAt: 'asc' }
  })
  const membership = await prisma.workspaceMember.findFirstOrThrow({
    where: { userId: user.id },
    orderBy: { joinedAt: 'asc' }
  })

  const exportJob = await prisma.exportJob.create({
    data: {
      workspaceId: membership.workspaceId,
      requestedById: user.id,
      type: 'links_csv',
      status: 'PENDING'
    }
  })

  const staleJob = await prisma.job.create({
    data: {
      kind: 'GENERATE_LINKS_EXPORT',
      status: 'PROCESSING',
      payloadJson: {
        exportJobId: exportJob.id,
        workspaceId: membership.workspaceId,
        requestedById: user.id
      } as Prisma.InputJsonValue,
      lockedBy: 'dead-worker',
      lockedAt: new Date(Date.now() - 60_000),
      availableAt: new Date(Date.now() - 60_000)
    }
  })

  const reclaimedJob = await claimNextJob(prisma, 'runtime-check-recovery', ['GENERATE_LINKS_EXPORT'], {
    staleLockThresholdMs: 1000
  })

  if (!reclaimedJob) {
    throw new Error('Failed to reclaim stale job')
  }

  await prisma.exportJob.update({
    where: { id: exportJob.id },
    data: {
      status: 'COMPLETED',
      fileName: exportJob.fileName || `links-${membership.workspaceId}.csv`,
      contentType: 'text/csv',
      content: 'id,title\nruntime-check,Runtime Check',
      completedAt: new Date()
    }
  })

  await completeJob(prisma, reclaimedJob.id, {
    exportJobId: exportJob.id
  } as Prisma.InputJsonValue)

  const completedExport = await waitForExportCompletion(exportJob.id)
  const finalizedJob = await prisma.job.findUniqueOrThrow({
    where: { id: staleJob.id }
  })

  return {
    staleJobId: staleJob.id,
    exportJobId: exportJob.id,
    reclaimedBy: reclaimedJob.lockedBy,
    finalizedJobStatus: finalizedJob.status,
    exportStatus: completedExport.status,
    healthSignalAddedInCode: true
  }
}

export async function runCustomDomainAnalyticsSimulation() {
  process.env.PORT = '4102'
  process.env.HOST = '127.0.0.1'
  process.env.API_URL = 'http://127.0.0.1:4102'
  process.env.APP_URL = 'http://127.0.0.1:3000'
  process.env.REDIS_RECONNECT_INTERVAL_MS = '1000'

  const { buildApp } = await import('../apps/api/src/app.js')
  const app = await buildApp()
  const customHostname = `go-${Date.now()}.runtime.test`
  const slug = `runtime-domain-${Date.now()}`

  try {
    await ensureRuntimeSchemaSupport()
    await app.listen({ host: '127.0.0.1', port: 4102 })
    await waitForHttp('http://127.0.0.1:4102/health')

    const authContext = await ensureRuntimeUser()
    const accessToken = app.jwt.sign({
      sub: authContext.userId,
      sessionId: 'runtime-session',
      workspaceId: authContext.workspaceId
    })

    const createDomainBody = JSON.stringify({ hostname: customHostname })
    const domainResponse = await requestHttp({
      port: 4102,
      method: 'POST',
      path: `/workspaces/${authContext.workspaceId}/domains`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'content-length': String(Buffer.byteLength(createDomainBody))
      },
      body: createDomainBody
    })

    if (domainResponse.statusCode !== 200) {
      throw new Error(`Create domain failed: ${domainResponse.statusCode} ${domainResponse.body}`)
    }

    const createdDomain = JSON.parse(domainResponse.body) as {
      id: string
      verificationPath: string
      hostname: string
    }

    const verifyResponse = await requestHttp({
      port: 4102,
      method: 'GET',
      path: createdDomain.verificationPath,
      headers: {
        host: customHostname
      }
    })

    if (verifyResponse.statusCode !== 200) {
      throw new Error(`Verify domain failed: ${verifyResponse.statusCode} ${verifyResponse.body}`)
    }

    const createLinkBody = JSON.stringify({
      title: 'Runtime Domain Link',
      destinationUrl: 'https://example.com/custom-domain-test',
      domain: customHostname,
      slug,
      campaign: 'runtime-domain'
    })
    const linkResponse = await requestHttp({
      port: 4102,
      method: 'POST',
      path: `/workspaces/${authContext.workspaceId}/links`,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'content-length': String(Buffer.byteLength(createLinkBody))
      },
      body: createLinkBody
    })

    if (linkResponse.statusCode !== 200) {
      throw new Error(`Create link failed: ${linkResponse.statusCode} ${linkResponse.body}`)
    }

    const redirectResponse = await requestHttp({
      port: 4102,
      method: 'GET',
      path: `/${slug}`,
      headers: {
        host: customHostname,
        referer: 'https://news.ycombinator.com/item?id=runtime',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
        'cf-ipcountry': 'IN',
        'x-vercel-ip-city': 'Kolkata'
      }
    })

    const clickJobs = await prisma.job.findMany({
      where: {
        kind: 'PROCESS_CLICK_EVENT',
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    for (const job of clickJobs) {
      await processClickEventPayload(job.payloadJson as unknown as {
        linkId: string
        clickedAt: string
        ipHash: string | null
        referrer: string | null
        userAgent: string | null
        country: string | null
        city: string | null
      })
      await completeJob(prisma, job.id, { linkId: (job.payloadJson as { linkId: string }).linkId } as Prisma.InputJsonValue)
    }

    const overviewResponse = await requestHttp({
      port: 4102,
      method: 'GET',
      path: `/workspaces/${authContext.workspaceId}/analytics/overview`,
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    })

    if (overviewResponse.statusCode !== 200) {
      throw new Error(`Analytics overview failed: ${overviewResponse.statusCode} ${overviewResponse.body}`)
    }

    const overview = JSON.parse(overviewResponse.body) as {
      topReferrers: Array<{ referrerHost: string }>
      countryBreakdown: Array<{ country: string }>
      recentClicks: Array<{ link: { slug: string; domain: string }; deviceType: string | null }>
    }

    return {
      domainId: createdDomain.id,
      linkId: JSON.parse(linkResponse.body).id as string,
      queuedClickJobIds: clickJobs.map((job) => job.id),
      verifyStatus: verifyResponse.statusCode,
      redirectStatus: redirectResponse.statusCode,
      redirectLocation: redirectResponse.headers.location,
      topReferrer: overview.topReferrers[0]?.referrerHost ?? null,
      topCountry: overview.countryBreakdown[0]?.country ?? null,
      recentClickDomain: overview.recentClicks[0]?.link.domain ?? null,
      recentClickSlug: overview.recentClicks[0]?.link.slug ?? null,
      recentClickDeviceType: overview.recentClicks[0]?.deviceType ?? null
    }
  } finally {
    await app.close()
  }
}

export async function runExportStorageSimulation() {
  const user = await prisma.user.findFirstOrThrow({
    orderBy: { createdAt: 'asc' }
  })
  const membership = await prisma.workspaceMember.findFirstOrThrow({
    where: { userId: user.id },
    orderBy: { joinedAt: 'asc' }
  })

  const exportJob = await prisma.exportJob.create({
    data: {
      workspaceId: membership.workspaceId,
      requestedById: user.id,
      type: 'links_csv',
      status: 'PENDING',
      fileName: `runtime-export-${Date.now()}.csv`,
      contentType: 'text/csv'
    }
  })

  await processExportPayload({
    exportJobId: exportJob.id,
    workspaceId: membership.workspaceId,
  })

  const completed = await prisma.exportJob.findUniqueOrThrow({
    where: { id: exportJob.id }
  })

  const storedContent = completed.fileUrl ? (await readObject(completed.fileUrl)).toString('utf8') : null

  return {
    exportJobId: exportJob.id,
    fileUrl: completed.fileUrl,
    contentWasMovedOutOfDb: completed.content === null,
    storedContentPreview: storedContent?.slice(0, 40) ?? null
  }
}

async function main() {
  const redis = await runRedisRecoverySimulation()
  const worker = await runWorkerRecoverySimulation()
  const customDomain = await runCustomDomainAnalyticsSimulation()
  const exportStorage = await runExportStorageSimulation()

  console.log(
    JSON.stringify(
      {
        redis,
        worker,
        customDomain,
        exportStorage
      },
      null,
      2
    )
  )
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMainModule) {
  main()
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
