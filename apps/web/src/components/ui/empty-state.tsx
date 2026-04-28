'use client'

type Props = {
  title: string
  description: string
}

export function EmptyState({ title, description }: Props) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-10 text-center">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-white/60">{description}</p>
    </div>
  )
}