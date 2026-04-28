import type { FastifyInstance } from 'fastify'
import crypto from 'node:crypto'
import { z } from 'zod'
import { API_KEY_SCOPE_LIST } from '@repo/shared'
import { ApiKeysRepository } from './api-keys.repository.js'
import { AuditService } from '../audit/audit.service.js'
import { env } from '../../config/env.js'

const createApiKeySchema = z.object({
  name: z.string().min(2).max(100),
  scopes: z.array(z.enum(API_KEY_SCOPE_LIST as [string, ...string[]])).min(1).default(API_KEY_SCOPE_LIST),
  expiresAt: z.string().datetime().optional()
})

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function generateRawApiKey() {
  return `usk_${crypto.randomBytes(24).toString('hex')}`
}

function makePrefix(rawKey: string) {
  return rawKey.slice(0, 12)
}

function parseExpiryDate(input: string | undefined) {
  if (!input) return null
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export class ApiKeysService {
  private repo: ApiKeysRepository
  private audit: AuditService

  constructor(private app: FastifyInstance) {
    this.repo = new ApiKeysRepository(app)
    this.audit = new AuditService(app)
  }

  async list(workspaceId: string, userId: string) {
    await this.ensureAdmin(workspaceId, userId)
    return this.repo.listApiKeys(workspaceId)
  }

  async create(workspaceId: string, userId: string, input: unknown) {
    await this.ensureAdmin(workspaceId, userId)

    const data = createApiKeySchema.parse(input)

    const rawKey = generateRawApiKey()
    const keyHash = sha256(rawKey)
    const keyPrefix = makePrefix(rawKey)
    const requestedExpiry = parseExpiryDate(data.expiresAt)
    const maxExpiry = new Date(Date.now() + env.API_KEY_MAX_TTL_DAYS * 24 * 60 * 60 * 1000)
    const defaultExpiry = new Date(Date.now() + env.API_KEY_DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000)
    const expiresAt = requestedExpiry ?? defaultExpiry

    if (expiresAt.getTime() > maxExpiry.getTime()) {
      throw this.app.httpErrors.badRequest(`API keys cannot last longer than ${env.API_KEY_MAX_TTL_DAYS} days`)
    }

    const apiKey = await this.repo.createApiKey({
      workspaceId,
      createdById: userId,
      name: data.name.trim(),
      scopes: data.scopes,
      keyPrefix,
      keyHash,
      expiresAt
    })

    const result = {
  id: apiKey.id,
  name: apiKey.name,
  scopes: apiKey.scopes,
  keyPrefix: apiKey.keyPrefix,
  status: apiKey.status,
  expiresAt: apiKey.expiresAt,
  createdAt: apiKey.createdAt,
  apiKey: rawKey
}

await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'api_key.create',
  entityType: 'api_key',
  entityId: apiKey.id,
  metadataJson: {
    name: apiKey.name,
    scopes: apiKey.scopes,
    keyPrefix: apiKey.keyPrefix
  }
})

return result
  }

  async revoke(workspaceId: string, apiKeyId: string, userId: string) {
    await this.ensureAdmin(workspaceId, userId)

    const existing = await this.repo.findApiKey(workspaceId, apiKeyId)
    if (!existing) {
      throw this.app.httpErrors.notFound('API key not found')
    }

    const revoked = await this.repo.revokeApiKey(apiKeyId)

await this.audit.log({
  workspaceId,
  actorUserId: userId,
  action: 'api_key.revoke',
  entityType: 'api_key',
  entityId: apiKeyId,
      metadataJson: {
        name: revoked.name,
        scopes: revoked.scopes,
        keyPrefix: revoked.keyPrefix
      }
})

return revoked
  }

  async authenticateRawKey(rawKey: string) {
    const normalized = rawKey.trim()
    if (!normalized || !/^usk_[a-f0-9]{48}$/i.test(normalized)) {
      throw this.app.httpErrors.unauthorized('Invalid API key')
    }

    const keyPrefix = makePrefix(normalized)
    const apiKey = await this.repo.findActiveApiKeyByPrefix(keyPrefix)
    if (!apiKey) {
      throw this.app.httpErrors.unauthorized('Invalid API key')
    }

    const providedHash = sha256(normalized)
    if (!safeEqualHex(apiKey.keyHash, providedHash)) {
      throw this.app.httpErrors.unauthorized('Invalid API key')
    }

    await this.repo.touchApiKeyUsage(apiKey.id)

    return apiKey
  }

  async usage(workspaceId: string, apiKeyId: string, userId: string) {
    await this.ensureAdmin(workspaceId, userId)

    const apiKey = await this.repo.findApiKey(workspaceId, apiKeyId)
    if (!apiKey) {
      throw this.app.httpErrors.notFound('API key not found')
    }

    const [requestsLast7Days, topRoutes] = await Promise.all([
      this.repo.countUsage(apiKeyId),
      this.repo.listUsageCounts(apiKeyId)
    ])

    return {
      apiKeyId,
      requestsLast7Days,
      topRoutes: topRoutes.map((item) => ({
        route: item.route,
        requests: item._count.route
      }))
    }
  }

  async recordUsage(data: {
    apiKeyId: string
    method: string
    route: string
    statusCode: number
    latencyMs?: number | null
    ipHash?: string | null
  }) {
    await this.repo.createUsageEvent(data)
  }

  private async ensureAdmin(workspaceId: string, userId: string) {
    const membership = await this.repo.findWorkspaceMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    return membership
  }
}
