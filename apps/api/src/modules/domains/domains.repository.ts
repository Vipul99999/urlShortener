import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'

export class DomainsRepository {
  constructor(private app: FastifyInstance) {}

  findAdminMembership(workspaceId: string, userId: string) {
    return this.app.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      },
      include: {
        workspace: true
      }
    })
  }

  listWorkspaceDomains(workspaceId: string) {
    return this.app.prisma.workspaceDomain.findMany({
      where: { workspaceId },
      orderBy: [
        { status: 'desc' },
        { createdAt: 'desc' }
      ]
    })
  }

  findDomainByHostname(hostname: string) {
    return this.app.prisma.workspaceDomain.findUnique({
      where: { hostname }
    })
  }

  findDomainById(workspaceId: string, domainId: string) {
    return this.app.prisma.workspaceDomain.findFirst({
      where: {
        id: domainId,
        workspaceId
      }
    })
  }

  findDomainByVerificationToken(token: string) {
    return this.app.prisma.workspaceDomain.findUnique({
      where: { verificationToken: token }
    })
  }

  createDomain(workspaceId: string, hostname: string) {
    return this.app.prisma.workspaceDomain.create({
      data: {
        workspaceId,
        hostname,
        verificationToken: crypto.randomBytes(24).toString('hex')
      }
    })
  }

  verifyDomain(domainId: string) {
    return this.app.prisma.workspaceDomain.update({
      where: { id: domainId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date()
      }
    })
  }

  updateDomain(domainId: string, data: {
    status?: 'PENDING' | 'VERIFIED' | 'DISABLED'
    verificationToken?: string
    verifiedAt?: Date | null
  }) {
    return this.app.prisma.workspaceDomain.update({
      where: { id: domainId },
      data
    })
  }

  rotateVerificationToken(domainId: string) {
    return this.app.prisma.workspaceDomain.update({
      where: { id: domainId },
      data: {
        verificationToken: crypto.randomBytes(24).toString('hex'),
        status: 'PENDING',
        verifiedAt: null
      }
    })
  }

  deleteDomain(domainId: string) {
    return this.app.prisma.workspaceDomain.delete({
      where: { id: domainId }
    })
  }

  countLinksUsingDomain(workspaceId: string, hostname: string) {
    return this.app.prisma.link.count({
      where: {
        workspaceId,
        domain: hostname,
        deletedAt: null
      }
    })
  }

  listLinksUsingDomain(workspaceId: string, hostname: string) {
    return this.app.prisma.link.findMany({
      where: {
        workspaceId,
        domain: hostname,
        deletedAt: null
      }
    })
  }

  resetLinksToDefaultDomain(workspaceId: string, hostname: string) {
    return this.app.prisma.link.updateMany({
      where: {
        workspaceId,
        domain: hostname
      },
      data: {
        domain: 'default'
      }
    })
  }
}
