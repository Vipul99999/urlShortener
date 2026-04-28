'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'

type AuditLogItem = {
  id: string
  actorType: string
  action: string
  entityType: string
  entityId: string | null
  metadataJson: unknown
  ipAddress: string | null
  createdAt: string
  actorUser: {
    id: string
    email: string
    name: string | null
  } | null
}

export default function AuditLogsPage() {
  const { accessToken, workspaceId, hydrate } = useAuthStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const auditQuery = useQuery({
    queryKey: ['audit-logs', workspaceId],
    queryFn: () =>
      apiFetch<AuditLogItem[]>(`/workspaces/${workspaceId}/audit-logs`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const filtered = useMemo(() => {
    const items = auditQuery.data || []
    const q = search.trim().toLowerCase()
    if (!q) return items

    return items.filter((item) => {
      const actor = item.actorUser?.name || item.actorUser?.email || item.actorType
      return (
        item.action.toLowerCase().includes(q) ||
        item.entityType.toLowerCase().includes(q) ||
        actor.toLowerCase().includes(q) ||
        (item.entityId || '').toLowerCase().includes(q)
      )
    })
  }, [auditQuery.data, search])

  if (auditQuery.isLoading) {
    return (
      <div className="grid gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (auditQuery.error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {auditQuery.error instanceof Error
          ? auditQuery.error.message
          : 'Failed to load audit logs'}
      </div>
    )
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Audit logs</h3>
          <p className="mt-2 text-white/60">Recent workspace activity and changes.</p>
        </div>

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-white outline-none md:w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No matching audit logs"
            description="Try a different search or wait for more workspace activity."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-white">
                    {item.action} · {item.entityType}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    By {item.actorUser?.name || item.actorUser?.email || item.actorType}
                  </p>
                </div>

                <span className="text-sm text-white/45">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>

              {item.entityId && (
                <p className="mt-3 text-sm text-cyan-300">Entity ID: {item.entityId}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}