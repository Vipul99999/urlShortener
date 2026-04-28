'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { TextField } from '@/components/ui/text-field'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { z } from 'zod'

const resendVerificationSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address')
})

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setFieldErrors({})
    setLoading(true)

    const parsed = resendVerificationSchema.safeParse({ email })

    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
      )
      setFieldErrors(nextErrors)
      setError(parsed.error.issues[0]?.message || 'Invalid input')
      setLoading(false)
      return
    }

    try {
      await apiFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(parsed.data)
      })

      setSuccess('If that email exists and is not verified, a new verification email has been sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold">Resend verification</h1>
        <p className="mt-2 text-white/60">
          Enter your email to receive a new verification link.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <TextField
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
            error={fieldErrors.email}
          />

          <FormMessage error={error} success={success} />

          <Button type="submit" disabled={loading} fullWidth>
            {loading ? 'Sending...' : 'Resend verification email'}
          </Button>
        </form>
      </div>
    </div>
  )
}