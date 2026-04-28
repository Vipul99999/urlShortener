'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: Props) {
  const base =
    'inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60'

  const variants: Record<Variant, string> = {
    primary:
      'bg-gradient-to-r from-cyan-300 via-cyan-400 to-teal-300 text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.22)] hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(34,211,238,0.28)]',
    secondary:
      'border border-white/10 bg-white/6 text-white hover:bg-white/10 hover:border-white/15',
    danger: 'border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15'
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
