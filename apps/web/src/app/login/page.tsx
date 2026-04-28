'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { loginFormSchema } from '@/lib/validations/auth'
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

export default function LoginPage() {
  const router = useRouter()
  const setSession = useAuthStore((state) => state.setSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setFieldErrors({})

    const parsed = loginFormSchema.safeParse({ email, password })

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
      const data = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(parsed.data)
      })

      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        workspaceId: data.workspaceId
      })

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GuestOnly>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12 text-white">
        <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(160deg,rgba(103,232,249,0.14),rgba(8,19,36,0.9)_42%,rgba(8,19,36,0.98))] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] lg:p-10">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/70">UrlShortener</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">
              Operate your links like a real growth system, not a spreadsheet.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/68">
              Clean redirects, custom domains, QR codes, workspace permissions, and analytics that
              make sense at a glance.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Fast redirect</p>
                <p className="mt-3 text-2xl font-semibold">Redis-backed</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Safe ops</p>
                <p className="mt-3 text-2xl font-semibold">Worker + alerts</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/45">Team ready</p>
                <p className="mt-3 text-2xl font-semibold">Domains + roles</p>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/10 bg-[rgba(8,19,36,0.86)] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur lg:p-10">
            <p className="text-sm uppercase tracking-[0.3em] text-white/45">Welcome back</p>
            <h2 className="mt-4 text-3xl font-semibold">Log in to your workspace</h2>
            <p className="mt-3 text-white/60">Get back to redirects, campaigns, exports, and custom domains.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Forgot password?
                </Link>
              </div>

              <FormMessage error={error} />

              <Button type="submit" disabled={loading} fullWidth>
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </form>

            <div className="mt-7 space-y-3 text-sm text-white/58">
              <p>
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-cyan-300 hover:text-cyan-200">
                  Create one
                </Link>
              </p>
              <p>
                Need a new verification email?{' '}
                <Link href="/resend-verification" className="text-cyan-300 hover:text-cyan-200">
                  Resend verification
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </GuestOnly>
  )
}
