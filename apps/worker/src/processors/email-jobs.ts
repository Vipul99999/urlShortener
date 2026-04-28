import { prisma } from '@repo/db'
import { JOB_KIND, type JobKind, type SendInvitationEmailPayload, type SendPasswordResetEmailPayload, type SendVerificationEmailPayload } from '@repo/shared'
import { sendInvitationEmail, sendPasswordResetEmail, sendVerificationEmail } from '../utils/mailer.js'

function requireString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Email job payload is missing ${field}`)
  }

  return value
}

export async function processEmailJob(kind: JobKind, payload: unknown) {
  if (kind === JOB_KIND.SEND_VERIFICATION_EMAIL) {
    const data = payload as Partial<SendVerificationEmailPayload>
    const result = await sendVerificationEmail({
      to: requireString(data.to, 'to'),
      name: typeof data.name === 'string' ? data.name : null,
      verifyUrl: requireString(data.verifyUrl, 'verifyUrl')
    })
    await prisma.emailDeliveryEvent.create({
      data: {
        workspaceId: typeof data.workspaceId === 'string' ? data.workspaceId : null,
        triggeredByUserId: typeof data.triggeredByUserId === 'string' ? data.triggeredByUserId : null,
        provider: result.provider,
        emailType: kind,
        recipient: data.to,
        providerMessageId: result.providerMessageId,
        eventType: 'queued',
        status: 'queued',
        payloadJson: payload as never
      }
    })
    return { to: data.to, template: kind, provider: result.provider }
  }

  if (kind === JOB_KIND.SEND_PASSWORD_RESET_EMAIL) {
    const data = payload as Partial<SendPasswordResetEmailPayload>
    const result = await sendPasswordResetEmail({
      to: requireString(data.to, 'to'),
      name: typeof data.name === 'string' ? data.name : null,
      resetUrl: requireString(data.resetUrl, 'resetUrl')
    })
    await prisma.emailDeliveryEvent.create({
      data: {
        workspaceId: typeof data.workspaceId === 'string' ? data.workspaceId : null,
        triggeredByUserId: typeof data.triggeredByUserId === 'string' ? data.triggeredByUserId : null,
        provider: result.provider,
        emailType: kind,
        recipient: data.to,
        providerMessageId: result.providerMessageId,
        eventType: 'queued',
        status: 'queued',
        payloadJson: payload as never
      }
    })
    return { to: data.to, template: kind, provider: result.provider }
  }

  if (kind === JOB_KIND.SEND_INVITATION_EMAIL) {
    const data = payload as Partial<SendInvitationEmailPayload>
    const result = await sendInvitationEmail({
      to: requireString(data.to, 'to'),
      invitedByName: typeof data.invitedByName === 'string' ? data.invitedByName : null,
      workspaceName: requireString(data.workspaceName, 'workspaceName'),
      roleLabel: requireString(data.roleLabel, 'roleLabel'),
      acceptUrl: requireString(data.acceptUrl, 'acceptUrl')
    })
    await prisma.emailDeliveryEvent.create({
      data: {
        workspaceId: typeof data.workspaceId === 'string' ? data.workspaceId : null,
        triggeredByUserId: typeof data.triggeredByUserId === 'string' ? data.triggeredByUserId : null,
        provider: result.provider,
        emailType: kind,
        recipient: data.to,
        providerMessageId: result.providerMessageId,
        eventType: 'queued',
        status: 'queued',
        payloadJson: payload as never
      }
    })
    return { to: data.to, template: kind, provider: result.provider }
  }

  return { template: kind }
}
