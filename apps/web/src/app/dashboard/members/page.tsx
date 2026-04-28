'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { TextField } from '@/components/ui/text-field'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/ui/form-message'
import { useToast } from '@/lib/hooks/use-toast'
import { formatWorkspaceRole } from '@/lib/utils/roles'
import { z } from 'zod'

type Member = {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    emailVerified: boolean
    createdAt: string
  }
}

type Invitation = {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  invitedBy: {
    id: string
    email: string
    name: string | null
  }
}

const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['ADMIN', 'MEMBER'])
})

export default function MembersPage() {
  const { accessToken, workspaceId, hydrate } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const membersQuery = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () =>
      apiFetch<Member[]>(`/workspaces/${workspaceId}/members`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const invitationsQuery = useQuery({
    queryKey: ['workspace-invitations', workspaceId],
    queryFn: () =>
      apiFetch<Invitation[]>(`/workspaces/${workspaceId}/invitations`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !workspaceId) return

    setFieldErrors({})
    setFormError('')
    setFormSuccess('')

    const parsed = inviteSchema.safeParse({ email, role })

    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
      )
      setFieldErrors(nextErrors)
      setFormError(parsed.error.issues[0]?.message || 'Invalid input')
      return
    }

    try {
      setSubmitting(true)

      await apiFetch(`/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify(parsed.data)
      })

      setEmail('')
      setRole('MEMBER')
      setFormSuccess('Invitation sent successfully.')
      toast.success('Invitation sent successfully.')

      await queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation'
      setFormError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    if (!accessToken || !workspaceId) return

    try {
      await apiFetch(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: 'DELETE',
        token: accessToken
      })

      toast.success('Invitation revoked.')
      await queryClient.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invitation')
    }
  }

  if (membersQuery.isLoading || invitationsQuery.isLoading) {
    return (
      <div className="grid gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (membersQuery.error || invitationsQuery.error) {
    const error = membersQuery.error || invitationsQuery.error
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {error instanceof Error ? error.message : 'Failed to load members'}
      </div>
    )
  }

  const members = membersQuery.data || []
  const invitations = invitationsQuery.data || []

  return (
    <div className="grid gap-6">
      <Card>
        <h2 className="text-2xl font-semibold">Invite member</h2>
        <p className="mt-2 text-white/60">Invite someone to collaborate in this workspace.</p>

        <form onSubmit={handleInvite} className="mt-6 grid gap-4 md:grid-cols-[1fr_180px_auto]">
          <div>
            <TextField
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="teammate@example.com"
              error={fieldErrors.email}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={submitting} fullWidth>
              {submitting ? 'Sending...' : 'Send invite'}
            </Button>
          </div>
        </form>

        <div className="mt-4">
          <FormMessage error={formError} success={formSuccess} />
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">Pending invitations</h2>

        <div className="mt-6 space-y-4">
          {invitations.length === 0 ? (
            <EmptyState
              title="No pending invitations"
              description="Sent invitations will appear here until accepted or revoked."
            />
          ) : (
            invitations.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{item.email}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Role: {formatWorkspaceRole(item.role)} · Expires {new Date(item.expiresAt).toLocaleDateString()}
                  </p>
                </div>

                <Button variant="danger" onClick={() => handleRevoke(item.id)}>
                  Revoke
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h1 className="text-2xl font-semibold">Workspace members</h1>
        <p className="mt-2 text-white/60">People who currently have access to this workspace.</p>

        <div className="mt-6 space-y-4">
          {members.length === 0 ? (
            <EmptyState
              title="No members found"
              description="Members will appear here when more people join the workspace."
            />
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-white">
                    {member.user.name || member.user.email}
                  </p>
                  <p className="mt-1 text-sm text-white/55">{member.user.email}</p>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
                    {formatWorkspaceRole(member.role)}
                  </span>
                  <span className="text-white/45">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
