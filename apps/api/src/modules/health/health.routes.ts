import { describeObjectStorage } from '@repo/db'
import { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    return {
      ok: true,
      objectStorage: describeObjectStorage()
    }
  })

  app.get('/ready', async () => {
    await app.prisma.$queryRaw`SELECT 1`
    return {
      ok: true,
      objectStorage: describeObjectStorage()
    }
  })
}
