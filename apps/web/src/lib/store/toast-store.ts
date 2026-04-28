import { create } from 'zustand'

export type ToastItem = {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

type ToastState = {
  toasts: ToastItem[]
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  showToast: (toast) => {
    const id = crypto.randomUUID()

    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }))

    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((item) => item.id !== id)
      }))
    }, 3500)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((item) => item.id !== id)
    }))
  }
}))