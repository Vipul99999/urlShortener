import { refreshAccessToken } from '@/lib/auth'
import { useAuthStore } from '@/lib/store/auth-store'
import { API_URL } from '@/lib/urls'

type RequestOptions = RequestInit & {
  token?: string
  retryOnAuthError?: boolean
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    token,
    headers,
    retryOnAuthError = true,
    ...rest
  } = options

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    cache: 'no-store'
  })

  if (response.status === 401 && retryOnAuthError && typeof window !== 'undefined') {
    const refreshed = await refreshAccessToken()

    if (refreshed) {
      useAuthStore.getState().setSession({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        workspaceId: refreshed.workspaceId
      })

      return apiFetch<T>(path, {
        ...options,
        token: refreshed.accessToken,
        retryOnAuthError: false
      })
    }

    useAuthStore.getState().logout()
    throw new Error('Session expired. Please log in again.')
  }

  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: unknown }).message)
        : 'Request failed'

    throw new Error(message)
  }

  return data as T
}
