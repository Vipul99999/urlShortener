import type { FastifyInstance } from 'fastify'

export class UsersRepository {
  constructor(private app: FastifyInstance) {}

  findUserById(userId: string) {
    return this.app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })
  }

  updateUser(userId: string, data: { name?: string; avatarUrl?: string | null }) {
    return this.app.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    })
  }

  findWorkspaceMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId
      },
      select: {
        id: true,
        role: true
      }
    })
  }

  listWorkspaceMembers(workspaceId: string) {
    return this.app.prisma.workspaceMember.findMany({
      where: { workspaceId },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            emailVerified: true,
            createdAt: true
          }
        }
      }
    })
  }
}