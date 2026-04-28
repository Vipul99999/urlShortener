export function canManageWorkspace(role?: string | null) {
  return role === 'OWNER' || role === 'ADMIN'
}

export function formatWorkspaceRole(role?: string | null) {
  if (role === 'EDITOR' || role === 'VIEWER') {
    return 'MEMBER'
  }

  return role || 'MEMBER'
}
