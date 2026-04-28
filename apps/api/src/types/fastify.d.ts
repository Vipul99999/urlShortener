import 'fastify'
import { prisma } from '@repo/db'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateAny: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }

  interface FastifyRequest {
    authUser: {
      userId: string
      actorType?: 'USER' | 'API_KEY'
      apiKeyId?: string
      scopes?: string[]
      sessionId?: string
      workspaceId?: string
    }
  }
}
