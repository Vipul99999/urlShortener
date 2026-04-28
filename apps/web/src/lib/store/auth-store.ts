import { create } from 'zustand'

type SessionPayload = {
  accessToken: string
  refreshToken: string
  workspaceId: string
}

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  workspaceId: string | null
  hydrated: boolean
  setSession: (data: SessionPayload) => void
  setAccessToken: (accessToken: string) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  workspaceId: null,
  hydrated: false,

  setSession: ({ accessToken, refreshToken, workspaceId }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('workspaceId', workspaceId)
    }

    set({
      accessToken,
      refreshToken,
      workspaceId,
      hydrated: true
    })
  },

  setAccessToken: (accessToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken)
    }

    set((state) => ({
      ...state,
      accessToken
    }))
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('workspaceId')
    }

    set({
      accessToken: null,
      refreshToken: null,
      workspaceId: null,
      hydrated: true
    })
  },

  hydrate: () => {
    if (typeof window === 'undefined') return

    set({
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      workspaceId: localStorage.getItem('workspaceId'),
      hydrated: true
    })
  }
}))