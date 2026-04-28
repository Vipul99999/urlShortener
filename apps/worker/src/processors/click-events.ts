import { Prisma, prisma } from '@repo/db'
import type { ProcessClickEventPayload } from '@repo/shared'
import {
  detectBrowser,
  detectDeviceType,
  detectIsBot,
  detectOs,
  extractReferrerHost
} from '../utils/click-metadata.js'

function startOfUtcDay(timestamp: Date) {
  return new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()))
}

export async function processClickEventJob(payload: ProcessClickEventPayload) {
  if (!payload.linkId || !payload.clickedAt) {
    throw new Error('Click event payload is incomplete')
  }

  const clickedAt = new Date(payload.clickedAt)
  const dayStart = startOfUtcDay(clickedAt)
  const userAgent = payload.userAgent ?? null
  const referrerHost = extractReferrerHost(payload.referrer)
  const isBot = detectIsBot(userAgent)
  const deviceType = detectDeviceType(userAgent)
  const browser = detectBrowser(userAgent)
  const os = detectOs(userAgent)

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
        referrerHost,
        userAgent,
        deviceType,
        browser,
        os,
        isBot
      }
    })

    if (isBot) {
      const link = await tx.link.findUnique({
        where: { id: payload.linkId },
        select: { workspaceId: true, domain: true, slug: true }
      })

      await tx.abuseSignal.create({
        data: {
          workspaceId: link?.workspaceId ?? null,
          source: 'analytics',
          kind: 'bot_click_detected',
          ipHash: payload.ipHash,
          hostname: link?.domain === 'default' ? null : link?.domain ?? null,
          path: link ? `/${link.slug}` : null,
          userAgent,
          actionTaken: 'flagged',
          metadataJson: {
            browser,
            os,
            referrerHost
          }
        }
      })
    }
  })
}
