'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { formatWorkspaceRole } from '@/lib/utils/roles'

type InvitationPreview = {
  email: string
  role: string
  workspace: {
    id: string
    name: string
    slug: string
  }
  invitedBy: {
    id: string
    email: string
    name: string | null
  }
  expiresAt: string
}

type AcceptInvitationResponse = {
  success: boolean
  workspace: {
    id: string
    name: string
    slug: string
  }
}

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const { accessToken, refreshToken, hydrated, hydrate, setSession } = useAuthStore()

  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!hydrated) hydrate()
  }, [hydrated, hydrate])

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError('Missing invitation token')
        setLoading(false)
        return
      }

      try {
        const data = await apiFetch<InvitationPreview>(
          `/invitations/accept?token=${encodeURIComponent(token)}`
        )
        setPreview(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid invitation')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [token])

  const handleAccept = async () => {
    if (!accessToken) {
      router.push(`/login?next=${encodeURIComponent(`/accept-invitation?token=${token}`)}`)
      return
    }

    try {
      setAccepting(true)
      setError('')
      setSuccess('')

      const data = await apiFetch<AcceptInvitationResponse>('/invitations/accept', {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ token })
      })

      if (accessToken && refreshToken) {
        setSession({
          accessToken,
          refreshToken,
          workspaceId: data.workspace.id
        })
      }

      setSuccess('Invitation accepted successfully.')
      setTimeout(() => {
        router.push('/dashboard/members')
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold">Workspace invitation</h1>

        {loading ? (
          <p className="mt-6 text-white/70">Loading invitation...</p>
        ) : (
          <>
            {preview ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm text-white/50">Workspace</p>
                  <p className="mt-1 text-lg font-semibold text-white">{preview.workspace.name}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm text-white/50">Invited email</p>
                  <p className="mt-1 text-white">{preview.email}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm text-white/50">Role</p>
                  <p className="mt-1 text-white">{formatWorkspaceRole(preview.role)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm text-white/50">Invited by</p>
                  <p className="mt-1 text-white">
                    {preview.invitedBy.name || preview.invitedBy.email}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <FormMessage error={error} success={success} />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleAccept} disabled={accepting} fullWidth>
                {accepting ? 'Accepting...' : 'Accept invitation'}
              </Button>

              <Link href="/">
                <Button variant="secondary" fullWidth>
                  Back
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
