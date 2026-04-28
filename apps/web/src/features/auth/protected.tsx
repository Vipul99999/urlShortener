'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

type Props = {
  children: React.ReactNode
}

export function Protected({ children }: Props) {
  const router = useRouter()
  const { accessToken, hydrated, hydrate } = useAuthStore()

  useEffect(() => {
    if (!hydrated) {
      hydrate()
    }
  }, [hydrate, hydrated])

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.push('/login')
    }
  }, [hydrated, accessToken, router])

  if (!hydrated || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    )
  }

  return <>{children}</>
}