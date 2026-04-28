import { API_URL } from '@/lib/urls'

type RefreshResponse = {
  accessToken: string
  refreshToken: string
  sessionId: string
  workspaceId: string
}

export async function refreshAccessToken(): Promise<RefreshResponse | null> {
  if (typeof window === 'undefined') return null

  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  })

  if (!response.ok) {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('workspaceId')
    return null
  }

  return response.json()
}
