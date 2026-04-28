import type { FastifyInstance } from 'fastify'
import { AnalyticsRepository } from './analytics.repository.js'

export class AnalyticsService {
  private repo: AnalyticsRepository

  constructor(private app: FastifyInstance) {
    this.repo = new AnalyticsRepository(app)
  }

  async getWorkspaceSummary(workspaceId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const links = await this.repo.listWorkspaceLinks(workspaceId)

    const totalLinks = links.length
    const totalClicks = links.reduce((sum, link) => sum + Number(link.totalClicks), 0)
    const uniqueClicks = links.reduce((sum, link) => sum + Number(link.uniqueClicks), 0)

    return {
      totalLinks,
      totalClicks,
      uniqueClicks
    }
  }

  async getWorkspaceOverview(workspaceId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const [summary, topLinks, topReferrers, deviceBreakdown, countryBreakdown, recentClicks] = await Promise.all([
      this.getWorkspaceSummary(workspaceId, userId),
      this.repo.listTopLinks(workspaceId),
      this.repo.groupReferrers(workspaceId),
      this.repo.groupDevices(workspaceId),
      this.repo.groupCountries(workspaceId),
      this.repo.listRecentClicks(workspaceId)
    ])

    return {
      ...summary,
      topLinks: topLinks.map((link) => ({
        ...link,
        totalClicks: Number(link.totalClicks),
        uniqueClicks: Number(link.uniqueClicks)
      })),
      topReferrers: topReferrers.map((item) => ({
        referrerHost: item.referrerHost ?? 'Direct / Unknown',
        clicks: item._count.referrerHost
      })),
      deviceBreakdown: deviceBreakdown.map((item) => ({
        deviceType: item.deviceType ?? 'unknown',
        clicks: item._count.deviceType
      })),
      countryBreakdown: countryBreakdown.map((item) => ({
        country: item.country ?? 'Unknown',
        clicks: item._count.country
      })),
      recentClicks: recentClicks.map((event) => ({
        id: event.id,
        clickedAt: event.clickedAt,
        country: event.country,
        city: event.city,
        referrerHost: event.referrerHost,
        deviceType: event.deviceType,
        browser: event.browser,
        os: event.os,
        isBot: event.isBot,
        link: event.link
      }))
    }
  }

  async getLinkSummary(workspaceId: string, linkId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const link = await this.repo.findLinkSummary(workspaceId, linkId)
    if (!link) {
      throw this.app.httpErrors.notFound('Link not found')
    }

    return {
      ...link,
      totalClicks: Number(link.totalClicks),
      uniqueClicks: Number(link.uniqueClicks)
    }
  }

  async getLinkDaily(workspaceId: string, linkId: string, userId: string) {
    await this.ensureMembership(workspaceId, userId)

    const link = await this.repo.findLinkSummary(workspaceId, linkId)
    if (!link) {
      throw this.app.httpErrors.notFound('Link not found')
    }

    const stats = await this.repo.listDailyStats(linkId)

    return stats.map((item) => ({
      date: item.date,
      clicks: Number(item.clicks),
      uniqueClicks: Number(item.uniqueClicks)
    }))
  }

  private async ensureMembership(workspaceId: string, userId: string) {
    const membership = await this.repo.findMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }
  }
}
