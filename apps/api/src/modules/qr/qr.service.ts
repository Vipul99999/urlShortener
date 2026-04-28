import type { FastifyInstance } from 'fastify'
import QRCode from 'qrcode'
import { QrRepository } from './qr.repository.js'

export class QrService {
  private repo: QrRepository

  constructor(private app: FastifyInstance) {
    this.repo = new QrRepository(app)
  }

  async generate(workspaceId: string, linkId: string, userId: string) {
    const membership = await this.repo.findMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    const link = await this.repo.findLink(workspaceId, linkId)
    if (!link) {
      throw this.app.httpErrors.notFound('Link not found')
    }

    const shortUrl =
      link.domain === 'default'
        ? `${process.env.API_URL}/${link.slug}`
        : link.domain.includes('.')
          ? `https://${link.domain}/${link.slug}`
          : `${process.env.API_URL}/r/${link.domain}/${link.slug}`

    const svg = await QRCode.toString(shortUrl, {
      type: 'svg',
      margin: 1,
      width: 512
    })

    await this.repo.createQrRecord({
      linkId: link.id,
      generatedById: userId,
      format: 'svg',
      size: 512,
      fileUrl: null
    })

    return {
      shortUrl,
      format: 'svg',
      svg
    }
  }
}
