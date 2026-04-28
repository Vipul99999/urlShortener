'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/lib/hooks/use-toast'
import { API_URL } from '@/lib/urls'

type ExportJob = {
  id: string
  workspaceId: string
  requestedById: string
  type: string
  status: string
  fileUrl: string | null
  fileName: string | null
  contentType: string | null
  filtersJson: unknown
  errorMessage: string | null
  completedAt: string | null
  createdAt: string
  downloadUrl: string | null
}

export default function ExportsPage() {
  const { accessToken, workspaceId, hydrate } = useAuthStore()
  const toast = useToast()

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const exportsQuery = useQuery({
    queryKey: ['exports', workspaceId],
    queryFn: () =>
      apiFetch<ExportJob[]>(`/workspaces/${workspaceId}/exports`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  if (exportsQuery.isLoading) {
    return (
      <div className="grid gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (exportsQuery.error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {exportsQuery.error instanceof Error
          ? exportsQuery.error.message
          : 'Failed to load export history'}
      </div>
    )
  }

  const items = exportsQuery.data || []

  const handleDownload = async (item: ExportJob) => {
    if (!accessToken || !workspaceId) return

    try {
      const response = await fetch(
        `${API_URL}/workspaces/${workspaceId}/exports/${item.id}/download`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Export is not ready yet')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.fileName || `export-${item.id}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast.success('Export downloaded.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download export')
    }
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold">Export history</h1>
      <p className="mt-2 text-white/60">Recent CSV export jobs for this workspace.</p>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <EmptyState
            title="No exports yet"
            description="Run your first export from the links page to see history here."
          />
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-white">{item.type}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Created {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70">
                    {item.status}
                  </span>

                  {item.completedAt ? (
                    <span className="text-sm text-white/45">
                      Completed {new Date(item.completedAt).toLocaleString()}
                    </span>
                  ) : null}

                  {item.status === 'COMPLETED' ? (
                    <Button variant="secondary" onClick={() => handleDownload(item)}>
                      <Download size={16} className="mr-2" />
                      Download
                    </Button>
                  ) : null}
                </div>
              </div>

              {item.errorMessage ? (
                <p className="mt-3 text-sm text-red-300">Error: {item.errorMessage}</p>
              ) : null}

              {item.filtersJson ? (
                <div className="mt-3 rounded-xl bg-slate-950/60 p-3 text-xs text-white/55">
                  Filters: {JSON.stringify(item.filtersJson)}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
