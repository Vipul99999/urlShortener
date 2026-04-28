import fp from 'fastify-plugin'
import { prisma } from '@repo/db'

export const prismaPlugin = fp(async (app) => {
  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})