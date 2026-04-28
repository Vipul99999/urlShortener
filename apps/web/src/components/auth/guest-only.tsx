'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

type Props = {
  children: React.ReactNode
}

export function GuestOnly({ children }: Props) {
  const router = useRouter()
  const { accessToken, hydrated, hydrate } = useAuthStore()

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  useEffect(() => {
    if (hydrated && accessToken) {
      router.replace('/dashboard')
    }
  }, [hydrated, accessToken, router])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    )
  }

  if (accessToken) return null

  return <>{children}</>
}