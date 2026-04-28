'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { registerFormSchema } from '@/lib/validations/auth'
import { TextField } from '@/components/ui/text-field'
import { FormMessage } from '@/components/ui/form-message'
import { Button } from '@/components/ui/button'
import { GuestOnly } from '@/components/auth/guest-only'

type AuthResponse = {
  accessToken: string
  refreshToken: string
  sessionId: string
  workspaceId: string
}

export default function RegisterPage() {
  const router = useRouter()
  const setSession = useAuthStore((state) => state.setSession)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    setFieldErrors({})

    const parsed = registerFormSchema.safeParse({ name, email, password, confirmPassword })

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
      const data = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: parsed.data.name,
          email: parsed.data.email,
          password: parsed.data.password
        })
      })

      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        workspaceId: data.workspaceId
      })

      setSuccess('Account created. Please check your inbox to verify your email.')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GuestOnly>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 text-white">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[36px] border border-white/10 bg-[rgba(8,19,36,0.86)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur lg:p-10">
            <p className="text-sm uppercase tracking-[0.3em] text-white/45">Create account</p>
            <h1 className="mt-4 text-3xl font-semibold">Launch your link workspace</h1>
            <p className="mt-3 text-white/60">
              Set up your team, brand your short URLs, and start tracking campaigns in minutes.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <TextField
                label="Name"
                value={name}
                onChange={setName}
                placeholder="Your name"
                error={fieldErrors.name}
              />

              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                type="email"
                error={fieldErrors.email}
              />

              <TextField
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                type="password"
                error={fieldErrors.password}
              />

              <TextField
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter your password"
                type="password"
                error={fieldErrors.confirmPassword}
              />

              <FormMessage error={error} success={success} />

              <Button type="submit" disabled={loading} fullWidth>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-sm text-white/58">
              Already have an account?{' '}
              <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
                Log in
              </Link>
            </p>
          </div>

          <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(160deg,rgba(245,158,11,0.13),rgba(8,19,36,0.9)_34%,rgba(8,19,36,0.98))] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] lg:p-10">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-100/70">Why teams stay</p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">
              One place for branded redirects, exports, and performance signals.
            </h2>
            <div className="mt-8 grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
                <p className="text-sm font-medium text-white">Custom domains</p>
                <p className="mt-2 text-white/62">
                  Launch short links from your own subdomain with verification and diagnostics built in.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
                <p className="text-sm font-medium text-white">Campaign visibility</p>
                <p className="mt-2 text-white/62">
                  Track top referrers, devices, countries, and recent clicks without leaving the dashboard.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
                <p className="text-sm font-medium text-white">Operational safety</p>
                <p className="mt-2 text-white/62">
                  Async jobs, exports, abuse signals, and worker health keep the product stable under real use.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GuestOnly>
  )
}
