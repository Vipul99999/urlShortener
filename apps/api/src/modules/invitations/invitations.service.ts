import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { enqueueJob, type Prisma } from '@repo/db'
import { JOB_KIND } from '@repo/shared'
import { InvitationsRepository } from './invitations.repository.js'
import {
  acceptInvitationSchema,
  createInvitationSchema,
  previewInvitationSchema
} from './invitations.schemas.js'
import { AuditService } from '../audit/audit.service.js'
import {
  toPublicWorkspaceRole,
  toStoredWorkspaceRole
} from '../../common/utils/workspace-roles.js'

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function makeOneTimeToken() {
  return crypto.randomBytes(32).toString('hex')
}

export class InvitationsService {
  private repo: InvitationsRepository
  private audit: AuditService

  constructor(private app: FastifyInstance) {
    this.repo = new InvitationsRepository(app)
    this.audit = new AuditService(app)
  }

  async list(workspaceId: string, userId: string) {
    await this.ensureAdmin(workspaceId, userId)

    const invitations = await this.repo.listPendingInvitations(workspaceId)

    return invitations
      .filter((item) => item.expiresAt.getTime() > Date.now())
      .map((item) => ({
        id: item.id,
        email: item.email,
        role: toPublicWorkspaceRole(item.role),
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        invitedBy: item.invitedBy
      }))
  }

  async create(workspaceId: string, userId: string, input: unknown) {
    const adminMembership = await this.ensureAdmin(workspaceId, userId)
    const data = createInvitationSchema.parse(input)

    const existingUser = await this.repo.findUserByEmail(data.email)
    if (existingUser) {
      const existingMembership = await this.repo.findMembershipByUserId(workspaceId, existingUser.id)
      if (existingMembership) {
        throw this.app.httpErrors.conflict('User is already a member of this workspace')
      }
    }

    await this.repo.revokePendingInvitations(workspaceId, data.email)

    const rawToken = makeOneTimeToken()
    const invitation = await this.repo.createInvitation({
      workspaceId,
      invitedById: userId,
      email: data.email,
      role: toStoredWorkspaceRole(data.role),
      tokenHash: sha256(rawToken),
      expiresAt: hoursFromNow(72)
    })

    const acceptUrl = `${process.env.FRONTEND_URL || process.env.APP_URL}/accept-invitation?token=${rawToken}`

    await enqueueJob(this.app.prisma, {
      kind: JOB_KIND.SEND_INVITATION_EMAIL,
      payload: {
        to: data.email,
        invitedByName: adminMembership.user.name,
        workspaceName: adminMembership.workspace.name,
        roleLabel: toPublicWorkspaceRole(invitation.role),
        acceptUrl,
        workspaceId,
        triggeredByUserId: userId
      } as Prisma.InputJsonValue
    })

    await this.audit.log({
      workspaceId,
      actorUserId: userId,
      action: 'invitation.create',
      entityType: 'invitation',
      entityId: invitation.id,
      metadataJson: {
        email: invitation.email,
        role: toPublicWorkspaceRole(invitation.role)
      }
    })

    return {
      id: invitation.id,
      email: invitation.email,
      role: toPublicWorkspaceRole(invitation.role),
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt
    }
  }

  async revoke(workspaceId: string, invitationId: string, userId: string) {
    await this.ensureAdmin(workspaceId, userId)

    const invitation = await this.repo.findInvitationById(workspaceId, invitationId)
    if (!invitation || invitation.status !== 'PENDING') {
      throw this.app.httpErrors.notFound('Invitation not found')
    }

    await this.repo.revokeInvitation(invitationId)

    await this.audit.log({
      workspaceId,
      actorUserId: userId,
      action: 'invitation.revoke',
      entityType: 'invitation',
      entityId: invitationId,
      metadataJson: {
        email: invitation.email
      }
    })

    return { success: true }
  }

  async preview(input: unknown) {
    const { token } = previewInvitationSchema.parse(input)
    const invitation = await this.repo.findInvitationByTokenHash(sha256(token))

    if (!invitation) {
      throw this.app.httpErrors.notFound('Invitation not found')
    }

    if (invitation.status !== 'PENDING' || invitation.revokedAt || invitation.acceptedAt) {
      throw this.app.httpErrors.badRequest('Invitation is no longer valid')
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw this.app.httpErrors.gone('Invitation expired')
    }

    return {
      email: invitation.email,
      role: toPublicWorkspaceRole(invitation.role),
      workspace: invitation.workspace,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt
    }
  }

  async accept(userId: string, userEmail: string, input: unknown) {
    const { token } = acceptInvitationSchema.parse(input)
    const invitation = await this.repo.findInvitationByTokenHash(sha256(token))

    if (!invitation) {
      throw this.app.httpErrors.notFound('Invitation not found')
    }

    if (invitation.status !== 'PENDING' || invitation.revokedAt || invitation.acceptedAt) {
      throw this.app.httpErrors.badRequest('Invitation is no longer valid')
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw this.app.httpErrors.gone('Invitation expired')
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw this.app.httpErrors.forbidden('Invitation email does not match your account')
    }

    const accepted = await this.repo.acceptInvitation(
      invitation.id,
      userId,
      invitation.workspaceId,
      invitation.role
    )

    await this.audit.log({
      workspaceId: invitation.workspaceId,
      actorUserId: userId,
      action: 'invitation.accept',
      entityType: 'invitation',
      entityId: invitation.id,
      metadataJson: {
        email: invitation.email,
        role: toPublicWorkspaceRole(invitation.role)
      }
    })

    return {
      success: true,
      workspace: accepted.workspace
    }
  }

  async getUserEmail(userId: string) {
    const user = await this.repo.findUserById(userId)
    if (!user) {
      throw this.app.httpErrors.notFound('User not found')
    }

    return user.email
  }

  private async ensureAdmin(workspaceId: string, userId: string) {
    const membership = await this.repo.findWorkspaceAdminMembership(workspaceId, userId)
    if (!membership) {
      throw this.app.httpErrors.forbidden('Access denied')
    }

    return membership
  }
}
