import type { FastifyReply, FastifyRequest } from 'fastify'

export function requireApiKeyScopes(requiredScopes: string[]) {
  return async function apiKeyScopeGuard(request: FastifyRequest, reply: FastifyReply) {
    if (request.authUser.actorType !== 'API_KEY') {
      return
    }

    const grantedScopes = new Set(request.authUser.scopes || [])
    const missing = requiredScopes.filter((scope) => !grantedScopes.has(scope))

    if (missing.length > 0) {
      reply.forbidden(`API key is missing required scopes: ${missing.join(', ')}`)
      return
    }

    const params = request.params as Record<string, unknown> | undefined
    const workspaceId = typeof params?.workspaceId === 'string' ? params.workspaceId : null

    if (workspaceId && request.authUser.workspaceId && workspaceId !== request.authUser.workspaceId) {
      reply.forbidden('API key does not belong to this workspace')
    }
  }
}
