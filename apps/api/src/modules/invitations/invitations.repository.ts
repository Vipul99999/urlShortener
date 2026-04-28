import type { FastifyInstance } from 'fastify'
import type { WorkspaceMemberRole } from '@repo/db'

export class InvitationsRepository {
  constructor(private app: FastifyInstance) {}

  findWorkspaceAdminMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })
  }

  findUserByEmail(email: string) {
    return this.app.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true
      }
    })
  }

  findUserById(userId: string) {
    return this.app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })
  }

  findMembershipByUserId(workspaceId: string, userId: string) {
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

  listPendingInvitations(workspaceId: string) {
    return this.app.prisma.invitation.findMany({
      where: {
        workspaceId,
        status: 'PENDING',
        revokedAt: null,
        acceptedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
  }

  revokePendingInvitations(workspaceId: string, email: string) {
    return this.app.prisma.invitation.updateMany({
      where: {
        workspaceId,
        email,
        status: 'PENDING'
      },
      data: {
        status: 'REVOKED',
        revokedAt: new Date()
      }
    })
  }

  createInvitation(data: {
    workspaceId: string
    invitedById: string
    email: string
    role: WorkspaceMemberRole
    tokenHash: string
    expiresAt: Date
  }) {
    return this.app.prisma.invitation.create({
      data
    })
  }

  findInvitationById(workspaceId: string, invitationId: string) {
    return this.app.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        workspaceId
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
  }

  revokeInvitation(invitationId: string) {
    return this.app.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date()
      }
    })
  }

  findInvitationByTokenHash(tokenHash: string) {
    return this.app.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        invitedBy: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })
  }

  acceptInvitation(invitationId: string, userId: string, workspaceId: string, role: WorkspaceMemberRole) {
    return this.app.prisma.$transaction(async (tx) => {
      const existing = await tx.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId
        },
        select: {
          id: true
        }
      })

      if (!existing) {
        await tx.workspaceMember.create({
          data: {
            workspaceId,
            userId,
            role
          }
        })
      }

      const invitation = await tx.invitation.update({
        where: { id: invitationId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date()
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      })

      return invitation
    })
  }
}
