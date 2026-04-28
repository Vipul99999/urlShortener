import crypto from 'node:crypto'
import fp from 'fastify-plugin'
import { ApiKeysService } from '../modules/api-keys/api-keys.service.js'
import { env } from '../config/env.js'
import { securityGuard } from '../common/utils/security-guard.js'
import { recordAbuseSignal } from '../common/utils/abuse-monitor.js'

function hashIpAddress(ipAddress: string | null | undefined) {
  if (!ipAddress) return null
  return crypto.createHash('sha256').update(ipAddress).digest('hex')
}

export const authPlugin = fp(async (app) => {
  const apiKeys = new ApiKeysService(app)

  app.decorate('authenticateApiKey', async function (request, reply) {
    const rawApiKey = request.headers['x-api-key']
    const apiKeyHeader = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey
    const bearerHeader = request.headers.authorization
    const ipKey = request.ip ? `auth:api-key:ip:${request.ip}` : null

    try {
      if (bearerHeader) {
        reply.unauthorized('Use either Bearer auth or X-API-Key, not both')
        return
      }

      if (!apiKeyHeader) {
        reply.unauthorized('Missing API key')
        return
      }

      if (ipKey) {
        const lockedUntil = securityGuard.getLock(ipKey)
        if (lockedUntil) {
          await recordAbuseSignal(app, {
            source: 'api_key',
            kind: 'api_key_lockout',
            ipAddress: request.ip,
            userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
            path: request.url,
            actionTaken: 'blocked',
            metadataJson: {
              lockedUntil: new Date(lockedUntil).toISOString()
            }
          })
          reply.tooManyRequests('Too many invalid API key attempts')
          return
        }
      }

      const apiKey = await apiKeys.authenticateRawKey(apiKeyHeader)
      if (ipKey) {
        securityGuard.clear(ipKey)
      }
      request.authUser = {
        userId: apiKey.createdById,
        actorType: 'API_KEY',
        apiKeyId: apiKey.id,
        scopes: apiKey.scopes,
        workspaceId: apiKey.workspaceId
      }
    } catch {
      if (ipKey) {
        securityGuard.recordFailure({
          key: ipKey,
          windowMs: env.API_KEY_INVALID_WINDOW_MS,
          maxAttempts: env.API_KEY_INVALID_MAX_ATTEMPTS,
          lockDurationMs: env.API_KEY_INVALID_LOCK_DURATION_MS
        })
      }
      await recordAbuseSignal(app, {
        source: 'api_key',
        kind: 'invalid_api_key_attempt',
        ipAddress: request.ip,
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        path: request.url,
        actionTaken: 'tracked'
      })
      reply.unauthorized('Invalid API key')
    }
  })

  app.decorate('authenticateUser', async function (request, reply) {
    try {
      const payload = await request.jwtVerify<{
        sub: string
        sessionId?: string
        workspaceId?: string
      }>()

      request.authUser = {
        userId: payload.sub,
        actorType: 'USER',
        scopes: [],
        sessionId: payload.sessionId,
        workspaceId: payload.workspaceId
      }
    } catch {
      reply.unauthorized('Invalid or missing token')
    }
  })

  app.decorate('authenticateAny', async function (request, reply) {
    const rawApiKey = request.headers['x-api-key']
    const apiKeyHeader = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey

    if (apiKeyHeader) {
      await app.authenticateApiKey(request, reply)
      return
    }

    await app.authenticateUser(request, reply)
  })

  app.decorate('authenticate', app.authenticateUser)

  app.addHook('onResponse', async (request, reply) => {
    if (request.authUser?.actorType !== 'API_KEY' || !request.authUser.apiKeyId) {
      return
    }

    try {
      await apiKeys.recordUsage({
        apiKeyId: request.authUser.apiKeyId,
        method: request.method,
        route: request.routeOptions.url || request.url,
        statusCode: reply.statusCode,
        latencyMs: Math.round(reply.elapsedTime),
        ipHash: hashIpAddress(request.ip)
      })
    } catch (error) {
      request.log.error({ error }, 'Failed to record API key usage event')
    }
  })
})
