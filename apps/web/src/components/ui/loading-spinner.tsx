'use client'

type Props = {
  label?: string
}

export function LoadingSpinner({ label = 'Loading...' }: Props) {
  return (
    <div className="flex items-center gap-3 text-white/70">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
      <span>{label}</span>
    </div>
  )
}