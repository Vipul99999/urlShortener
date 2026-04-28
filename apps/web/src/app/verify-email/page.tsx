'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('Missing verification token')
        setLoading(false)
        return
      }

      try {
        await apiFetch(`/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'GET'
        })

        setSuccess('Email verified successfully. You can now continue using your account.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed')
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold">Verify email</h1>
        <p className="mt-2 text-white/60">We’re confirming your email address.</p>

        <div className="mt-8 space-y-5">
          {loading ? (
            <p className="text-white/70">Verifying...</p>
          ) : (
            <FormMessage error={error} success={success} />
          )}

          <div className="flex flex-col gap-3">
            <Link href="/login">
              <Button fullWidth>Go to login</Button>
            </Link>

            <Link href="/resend-verification">
              <Button variant="secondary" fullWidth>
                Resend verification
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}