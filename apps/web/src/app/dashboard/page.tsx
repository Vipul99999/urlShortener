'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Card } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatWorkspaceRole } from '@/lib/utils/roles'
import { buildShortUrl } from '@/lib/urls'

type MeResponse = {
  id: string
  email: string
  name: string | null
  createdAt: string
}

type WorkspaceMembership = {
  id: string
  role: string
  joinedAt: string
  workspace: {
    id: string
    name: string
    slug: string
    brandingTitle: string | null
    plan: string
    createdAt: string
  }
}

type WorkspaceAnalytics = {
  totalLinks: number
  totalClicks: number
  uniqueClicks: number
}

type OpsOverview = {
  storage: {
    provider: string
  }
  exportHealth: {
    pendingExports: number
    failedExports: number
  }
  activeApiKeys: number
  domainHealth: Array<{
    status: string
    count: number
  }>
  recentAbuseSignals: Array<{
    id: string
    kind: string
    actionTaken: string | null
    createdAt: string
  }>
}

type LinkItem = {
  id: string
  title: string | null
  domain: string
  slug: string
  destinationUrl: string
  campaign: string | null
  status: string
  totalClicks: number
  createdAt: string
}

export default function DashboardPage() {
  const { accessToken, workspaceId, hydrate } = useAuthStore()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      apiFetch<MeResponse>('/auth/me', {
        token: accessToken || undefined
      }),
    enabled: !!accessToken
  })

  const workspaceQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: () =>
      apiFetch<WorkspaceMembership[]>('/workspaces', {
        token: accessToken || undefined
      }),
    enabled: !!accessToken
  })

  const analyticsQuery = useQuery({
    queryKey: ['workspace-summary', workspaceId],
    queryFn: () =>
      apiFetch<WorkspaceAnalytics>(`/workspaces/${workspaceId}/analytics/summary`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const linksQuery = useQuery({
    queryKey: ['workspace-links', workspaceId],
    queryFn: () =>
      apiFetch<LinkItem[]>(`/workspaces/${workspaceId}/links`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const opsQuery = useQuery({
    queryKey: ['workspace-ops', workspaceId],
    queryFn: () =>
      apiFetch<OpsOverview>(`/workspaces/${workspaceId}/ops/overview`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const loading =
    meQuery.isLoading ||
    workspaceQuery.isLoading ||
    analyticsQuery.isLoading ||
    linksQuery.isLoading ||
    opsQuery.isLoading

  const error =
    meQuery.error ||
    workspaceQuery.error ||
    analyticsQuery.error ||
    linksQuery.error ||
    opsQuery.error

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {error instanceof Error ? error.message : 'Failed to load dashboard'}
      </div>
    )
  }

  const user = meQuery.data
  const workspace =
    workspaceQuery.data?.find((item) => item.workspace.id === workspaceId) ||
    workspaceQuery.data?.[0]

  const analytics = analyticsQuery.data
  const ops = opsQuery.data
  const topLinks = [...(linksQuery.data || [])]
    .sort((a, b) => b.totalClicks - a.totalClicks)
    .slice(0, 5)

  const readinessItems = [
    {
      label: 'Create your first link',
      done: (linksQuery.data || []).length > 0,
      hint: 'Launch a short URL so analytics and QR tools have something to work with.'
    },
    {
      label: 'Connect a branded domain',
      done: (ops?.domainHealth || []).some((item) => item.status === 'VERIFIED'),
      hint: 'Branded links improve trust and make the product feel real to customers.'
    },
    {
      label: 'Set up machine access',
      done: (ops?.activeApiKeys || 0) > 0,
      hint: 'Create a scoped API key when your workflow needs automation or integrations.'
    }
  ]

  return (
    <div className="grid gap-6">
      <Card>
        <p className="text-sm text-white/50">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold">
          {workspace?.workspace.brandingTitle || workspace?.workspace.name}
        </h1>
        <p className="mt-3 max-w-2xl text-white/65">
          Hello {user?.name || user?.email}. Here&apos;s the current performance snapshot for your
          workspace.
        </p>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-white/50">Startup launch checklist</p>
            <h2 className="mt-2 text-2xl font-semibold">Make this workspace feel production-ready fast.</h2>
            <p className="mt-2 max-w-2xl text-white/60">
              These are the highest-impact actions for a new team: ship one live link, add a branded
              domain, and secure one integration path.
            </p>
          </div>
          <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            {readinessItems.filter((item) => item.done).length}/{readinessItems.length} complete
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {readinessItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-white">{item.label}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    item.done ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/5 text-white/60'
                  }`}
                >
                  {item.done ? 'Done' : 'Next'}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/55">{item.hint}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/links"
          className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
        >
          <p className="text-sm text-white/50">Quick action</p>
          <h3 className="mt-2 text-xl font-semibold">Create and manage links</h3>
          <p className="mt-2 text-white/60">
            Launch new short URLs and manage existing ones.
          </p>
        </Link>

        <Link
          href="/dashboard/analytics"
          className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
        >
          <p className="text-sm text-white/50">Quick action</p>
          <h3 className="mt-2 text-xl font-semibold">View analytics</h3>
          <p className="mt-2 text-white/60">
            Track clicks, top links, and workspace activity.
          </p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
        >
          <p className="text-sm text-white/50">Quick action</p>
          <h3 className="mt-2 text-xl font-semibold">Update settings</h3>
          <p className="mt-2 text-white/60">
            Manage profile, members, and workspace branding.
          </p>
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-white/50">Total links</p>
          <p className="mt-3 text-4xl font-semibold">{analytics?.totalLinks ?? 0}</p>
        </Card>

        <Card>
          <p className="text-sm text-white/50">Total clicks</p>
          <p className="mt-3 text-4xl font-semibold">{analytics?.totalClicks ?? 0}</p>
        </Card>

        <Card>
          <p className="text-sm text-white/50">Unique clicks</p>
          <p className="mt-3 text-4xl font-semibold">{analytics?.uniqueClicks ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Top links</h2>
              <p className="mt-1 text-white/60">Best performing links in this workspace</p>
            </div>
            <Link
              href="/dashboard/links"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              View all
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {topLinks.length === 0 ? (
              <EmptyState
                title="No links yet"
                description="Create your first short link to start seeing top performers here."
              />
            ) : (
              topLinks.map((link, index) => (
                <Link
                  key={link.id}
                  href={`/dashboard/links/${link.id}`}
                  className="block rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-cyan-400/15 px-2 py-1 text-xs text-cyan-200">
                          #{index + 1}
                        </span>
                        <p className="truncate font-medium text-white">
                          {link.title || link.slug}
                        </p>
                      </div>
                      <p className="mt-2 truncate text-sm text-cyan-300">
                        {buildShortUrl(link.slug, link.domain)}
                      </p>
                      <p className="mt-2 truncate text-xs text-white/45">
                        Campaign: {link.campaign || '—'}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70">
                      {link.totalClicks} clicks
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Workspace details</h2>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-white/50">Workspace name</p>
              <p className="mt-1 font-medium text-white">{workspace?.workspace.name}</p>
            </div>
            <div>
              <p className="text-white/50">Plan</p>
              <p className="mt-1 font-medium text-white">{workspace?.workspace.plan}</p>
            </div>
            <div>
              <p className="text-white/50">Role</p>
              <p className="mt-1 font-medium text-white">{formatWorkspaceRole(workspace?.role)}</p>
            </div>
            <div>
              <p className="text-white/50">Slug</p>
              <p className="mt-1 font-medium text-cyan-300">{workspace?.workspace.slug}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Operations pulse</h2>
              <p className="mt-1 text-white/60">Storage, exports, and API access at a glance.</p>
            </div>
            <Link
              href="/dashboard/settings"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              Open settings
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm text-white/50">Object storage</p>
              <p className="mt-2 text-2xl font-semibold uppercase">{ops?.storage.provider || 'local'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm text-white/50">Active API keys</p>
              <p className="mt-2 text-2xl font-semibold">{ops?.activeApiKeys ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm text-white/50">Exports waiting</p>
              <p className="mt-2 text-2xl font-semibold">{ops?.exportHealth.pendingExports ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-sm text-white/50">Failed exports</p>
              <p className="mt-2 text-2xl font-semibold">{ops?.exportHealth.failedExports ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Trust and delivery</h2>
          <p className="mt-1 text-white/60">Recent abuse flags and domain health for this workspace.</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {(ops?.domainHealth || []).length === 0 ? (
              <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/60">No custom domains yet</span>
            ) : (
              (ops?.domainHealth || []).map((item) => (
                <span key={item.status} className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70">
                  {item.status}: {item.count}
                </span>
              ))
            )}
          </div>

          <div className="mt-6 space-y-3">
            {(ops?.recentAbuseSignals || []).length === 0 ? (
              <p className="text-sm text-white/55">No recent abuse signals in this workspace.</p>
            ) : (
              (ops?.recentAbuseSignals || []).map((signal) => (
                <div key={signal.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium text-white">{signal.kind.replace(/_/g, ' ')}</p>
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-200">
                      {signal.actionTaken || 'flagged'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/45">{new Date(signal.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
