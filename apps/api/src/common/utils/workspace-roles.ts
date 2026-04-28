import type { WorkspaceMemberRole } from '@repo/db'

export function toStoredWorkspaceRole(role: 'ADMIN' | 'MEMBER'): WorkspaceMemberRole {
  return role === 'ADMIN' ? 'ADMIN' : 'VIEWER'
}

export function toPublicWorkspaceRole(role: WorkspaceMemberRole | string | null | undefined) {
  if (role === 'EDITOR' || role === 'VIEWER') {
    return 'MEMBER'
  }

  return role || 'MEMBER'
}
