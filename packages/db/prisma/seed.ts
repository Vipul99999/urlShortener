import { prisma } from '../src/client.js'
import argon2 from 'argon2'

async function main() {
  const email = 'demo@example.com'

  const existing = await prisma.user.findUnique({
    where: { email }
  })

  if (existing) {
    console.log('Seed already exists')
    return
  }

  const passwordHash = await argon2.hash('password123')

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'Demo User',
      emailVerified: true
    }
  })

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      slug: 'demo-workspace'
    }
  })

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'OWNER'
    }
  })

  await prisma.link.create({
    data: {
      workspaceId: workspace.id,
      createdById: user.id,
      domain: 'default',
      slug: 'welcome1',
      title: 'Welcome Link',
      destinationUrl: 'https://example.com',
      normalizedUrl: 'https://example.com',
      campaign: 'demo'
    }
  })

  console.log('Seed completed')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })