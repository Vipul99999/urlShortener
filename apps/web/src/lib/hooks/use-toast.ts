import { useToastStore } from '@/lib/store/toast-store'

export function useToast() {
  const showToast = useToastStore((state) => state.showToast)

  return {
    success: (message: string) => showToast({ type: 'success', message }),
    error: (message: string) => showToast({ type: 'error', message }),
    info: (message: string) => showToast({ type: 'info', message })
  }
}