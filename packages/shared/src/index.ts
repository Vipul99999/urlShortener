export const DEFAULT_DOMAIN = 'default'

export const CUSTOM_DOMAIN_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  DISABLED: 'DISABLED'
} as const

export const JOB_KIND = {
  SEND_VERIFICATION_EMAIL: 'SEND_VERIFICATION_EMAIL',
  SEND_PASSWORD_RESET_EMAIL: 'SEND_PASSWORD_RESET_EMAIL',
  SEND_INVITATION_EMAIL: 'SEND_INVITATION_EMAIL',
  GENERATE_LINKS_EXPORT: 'GENERATE_LINKS_EXPORT',
  PROCESS_CLICK_EVENT: 'PROCESS_CLICK_EVENT'
} as const

export type JobKind = (typeof JOB_KIND)[keyof typeof JOB_KIND]

export const API_KEY_SCOPES = {
  LINKS_READ: 'links:read',
  LINKS_WRITE: 'links:write',
  ANALYTICS_READ: 'analytics:read',
  TAGS_READ: 'tags:read',
  TAGS_WRITE: 'tags:write',
  EXPORTS_READ: 'exports:read',
  EXPORTS_WRITE: 'exports:write'
} as const

export const API_KEY_SCOPE_LIST = Object.values(API_KEY_SCOPES)

export type ApiKeyScope = (typeof API_KEY_SCOPES)[keyof typeof API_KEY_SCOPES]

export type SendVerificationEmailPayload = {
  to: string
  name?: string | null
  verifyUrl: string
  workspaceId?: string | null
  triggeredByUserId?: string | null
}

export type SendPasswordResetEmailPayload = {
  to: string
  name?: string | null
  resetUrl: string
  workspaceId?: string | null
  triggeredByUserId?: string | null
}

export type SendInvitationEmailPayload = {
  to: string
  invitedByName?: string | null
  workspaceName: string
  roleLabel: string
  acceptUrl: string
  workspaceId?: string | null
  triggeredByUserId?: string | null
}

export type GenerateLinksExportPayload = {
  exportJobId: string
  workspaceId: string
  requestedById: string
}

export type ProcessClickEventPayload = {
  linkId: string
  clickedAt: string
  ipHash: string | null
  referrer: string | null
  userAgent: string | null
  country: string | null
  city: string | null
}
