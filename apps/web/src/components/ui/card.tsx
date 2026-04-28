'use client'

import { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: Props) {
  return (
    <div
      className={`rounded-[30px] border border-white/10 bg-[rgba(8,19,36,0.74)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur ${className}`}
    >
      {children}
    </div>
  )
}
