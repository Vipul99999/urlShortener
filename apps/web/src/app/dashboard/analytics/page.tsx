'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { AnalyticsSummaryBars } from '@/features/analytics/analytics-summary-bars'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import {
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

type AnalyticsSummary = {
  totalLinks: number
  totalClicks: number
  uniqueClicks: number
  topLinks: Array<{
    id: string
    title: string | null
    slug: string
    domain: string
    totalClicks: number
    uniqueClicks: number
  }>
  topReferrers: Array<{
    referrerHost: string
    clicks: number
  }>
  deviceBreakdown: Array<{
    deviceType: string
    clicks: number
  }>
  countryBreakdown: Array<{
    country: string
    clicks: number
  }>
  recentClicks: Array<{
    id: string
    clickedAt: string
    country: string | null
    city: string | null
    referrerHost: string | null
    deviceType: string | null
    browser: string | null
    os: string | null
    isBot: boolean
    link: {
      id: string
      title: string | null
      slug: string
      domain: string
    }
  }>
}

type LinkItem = {
  id: string
  title: string | null
  slug: string
  destinationUrl: string
  campaign: string | null
  status: string
  totalClicks: number
  createdAt: string
}

export default function AnalyticsPage() {
  const { accessToken, workspaceId, hydrate } = useAuthStore()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const summaryQuery = useQuery({
    queryKey: ['workspace-overview', workspaceId],
    queryFn: () =>
      apiFetch<AnalyticsSummary>(`/workspaces/${workspaceId}/analytics/overview`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const linksQuery = useQuery({
    queryKey: ['links', workspaceId],
    queryFn: () =>
      apiFetch<LinkItem[]>(`/workspaces/${workspaceId}/links`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const loading = summaryQuery.isLoading || linksQuery.isLoading
  const error = summaryQuery.error || linksQuery.error

  const topLinksData = useMemo(() => {
    return [...(summaryQuery.data?.topLinks || linksQuery.data || [])]
      .sort((a, b) => b.totalClicks - a.totalClicks)
      .slice(0, 6)
      .map((link) => ({
        name: (link.title || link.slug).slice(0, 18),
        clicks: link.totalClicks
      }))
  }, [linksQuery.data, summaryQuery.data?.topLinks])

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
        {error instanceof Error ? error.message : 'Failed to load analytics'}
      </div>
    )
  }

  const summary = summaryQuery.data || {
    totalLinks: 0,
    totalClicks: 0,
    uniqueClicks: 0,
    topLinks: [],
    topReferrers: [],
    deviceBreakdown: [],
    countryBreakdown: [],
    recentClicks: []
  }
  const topReferrer = summary.topReferrers[0]
  const topCountry = summary.countryBreakdown[0]
  const topDevice = summary.deviceBreakdown[0]

  return (
    <div className="grid gap-6">
      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(103,232,249,0.12),rgba(8,19,36,0.92)_40%,rgba(8,19,36,0.98))] p-6">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Analytics overview</p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">See what&apos;s driving clicks right now.</h1>
            <p className="mt-2 max-w-2xl text-white/65">
              Watch top-performing links, referrers, device mix, and the newest traffic patterns across your workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/65">
            <span className="rounded-full bg-white/5 px-4 py-2">Top links: {summary.topLinks.length}</span>
            <span className="rounded-full bg-white/5 px-4 py-2">Recent clicks: {summary.recentClicks.length}</span>
            <span className="rounded-full bg-white/5 px-4 py-2">Countries: {summary.countryBreakdown.length}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/50">Total links</p>
          <p className="mt-3 text-4xl font-semibold">{summary.totalLinks}</p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/50">Total clicks</p>
          <p className="mt-3 text-4xl font-semibold">{summary.totalClicks}</p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-white/50">Unique clicks</p>
          <p className="mt-3 text-4xl font-semibold">{summary.uniqueClicks}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
          <p className="text-sm text-white/50">Leading source</p>
          <p className="mt-3 text-xl font-semibold text-white">
            {topReferrer?.referrerHost || 'Direct / Unknown'}
          </p>
          <p className="mt-2 text-sm text-white/55">
            {topReferrer ? `${topReferrer.clicks} clicks are coming from this referrer.` : 'Once traffic arrives, your strongest acquisition source will show here.'}
          </p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
          <p className="text-sm text-white/50">Most active country</p>
          <p className="mt-3 text-xl font-semibold text-white">{topCountry?.country || 'No data yet'}</p>
          <p className="mt-2 text-sm text-white/55">
            {topCountry ? `${topCountry.clicks} visits were recorded from this country.` : 'Country trends will appear as soon as visitors arrive through your links.'}
          </p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
          <p className="text-sm text-white/50">Primary device</p>
          <p className="mt-3 text-xl font-semibold capitalize text-white">{topDevice?.deviceType || 'Unknown'}</p>
          <p className="mt-2 text-sm text-white/55">
            {topDevice ? `${topDevice.clicks} clicks came from this device type.` : 'Your device mix will show up here once click events have been processed.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsSummaryBars
          totalLinks={summary.totalLinks}
          totalClicks={summary.totalClicks}
          uniqueClicks={summary.uniqueClicks}
        />

        <div className="h-[320px] w-full rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Top link comparison</h3>
            <p className="text-sm text-white/55">Highest-click links in this workspace</p>
          </div>

          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={topLinksData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.45)" />
              <YAxis stroke="rgba(255,255,255,0.45)" />
              <Tooltip
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  color: 'white'
                }}
              />
              <Bar dataKey="clicks" fill="#22d3ee" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold text-white">Top referrers</h3>
          <div className="mt-4 space-y-3">
            {summary.topReferrers.length === 0 ? (
              <p className="text-sm text-white/55">No referrer data yet.</p>
            ) : (
              summary.topReferrers.map((item) => (
                <div key={item.referrerHost} className="flex items-center justify-between gap-4">
                  <span className="truncate text-sm text-white/75">{item.referrerHost}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70">
                    {item.clicks}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold text-white">Devices</h3>
          {summary.deviceBreakdown.length === 0 ? (
            <p className="mt-4 text-sm text-white/55">No device data yet.</p>
          ) : (
            <div className="mt-2 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.deviceBreakdown}
                      dataKey="clicks"
                      nameKey="deviceType"
                      innerRadius={42}
                      outerRadius={72}
                    >
                      {summary.deviceBreakdown.map((item, index) => (
                        <Cell
                          key={item.deviceType}
                          fill={['#67e8f9', '#22c55e', '#f59e0b', '#f97316'][index % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {summary.deviceBreakdown.map((item) => (
                  <div key={item.deviceType} className="flex items-center justify-between gap-4">
                    <span className="capitalize text-sm text-white/75">{item.deviceType}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70">
                      {item.clicks}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold text-white">Countries</h3>
          <div className="mt-4 space-y-3">
            {summary.countryBreakdown.length === 0 ? (
              <p className="text-sm text-white/55">No country data yet.</p>
            ) : (
              summary.countryBreakdown.map((item) => (
                <div key={item.country} className="flex items-center justify-between gap-4">
                  <span className="truncate text-sm text-white/75">{item.country}</span>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70">
                    {item.clicks}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <h3 className="text-lg font-semibold text-white">Recent clicks</h3>
        <p className="mt-1 text-sm text-white/55">Latest visits recorded across your workspace.</p>

        <div className="mt-5 space-y-3">
          {summary.recentClicks.length === 0 ? (
            <p className="text-sm text-white/55">No click events yet.</p>
          ) : (
            summary.recentClicks.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">
                    {item.link.title || item.link.slug}
                  </p>
                  <p className="mt-1 truncate text-sm text-cyan-300">
                    {item.referrerHost || 'Direct / Unknown'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-white/60">
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    {item.country || 'Unknown country'}
                  </span>
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    {item.deviceType || 'unknown'} / {item.browser || 'Unknown'}
                  </span>
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    {new Date(item.clickedAt).toLocaleString()}
                  </span>
                  {item.isBot ? (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-300">
                      Bot
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
