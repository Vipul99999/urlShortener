'use client'

type Props = {
  message: string
}

export function SuccessBanner({ message }: Props) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
      {message}
    </div>
  )
}