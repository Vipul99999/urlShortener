'use client'

type Props = {
  error?: string
  success?: string
}

export function FormMessage({ error, success }: Props) {
  if (!error && !success) return null

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        error
          ? 'border border-red-500/20 bg-red-500/10 text-red-300'
          : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      }`}
    >
      {error || success}
    </div>
  )
}