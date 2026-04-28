'use client'

import { X } from 'lucide-react'
import { useToastStore } from '@/lib/store/toast-store'

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="pointer-events-none fixed right-5 top-5 z-[100] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-4 shadow-2xl backdrop-blur ${
            toast.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
              : toast.type === 'error'
                ? 'border-red-500/20 bg-red-500/10 text-red-200'
                : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm leading-6">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded-lg p-1 opacity-80 hover:opacity-100"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}