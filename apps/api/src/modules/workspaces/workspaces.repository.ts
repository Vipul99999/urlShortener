import type { FastifyInstance } from 'fastify'

export class WorkspacesRepository {
  constructor(private app: FastifyInstance) {}

  listForUser(userId: string) {
    return this.app.prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: true
      },
      orderBy: {
        joinedAt: 'asc'
      }
    })
  }

  findMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId
      },
      include: {
        workspace: true
      }
    })
  }

  findAdminMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    })
  }

  findBySlug(slug: string) {
    return this.app.prisma.workspace.findUnique({
      where: { slug }
    })
  }

  async createWorkspaceWithOwner(data: {
    userId: string
    name: string
    slug: string
  }) {
    return this.app.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.name,
          slug: data.slug
        }
      })

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: data.userId,
          role: 'OWNER'
        }
      })

      return workspace
    })
  }

  updateWorkspace(workspaceId: string, data: { name?: string; brandingTitle?: string }) {
    return this.app.prisma.workspace.update({
      where: { id: workspaceId },
      data
    })
  }
}
