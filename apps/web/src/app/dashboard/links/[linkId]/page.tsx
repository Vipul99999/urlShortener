'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Pencil, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/select-field'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { useToast } from '@/lib/hooks/use-toast'
import { AnalyticsOverviewChart } from '@/features/analytics/analytics-overview-chart'
import { buildShortUrl } from '@/lib/urls'

type AttachedTag = {
  id: string
  name: string
  color: string | null
  createdAt: string
}

type LinkItem = {
  id: string
  title: string | null
  domain: string
  slug: string
  destinationUrl: string
  description?: string | null
  campaign: string | null
  status: string
  totalClicks: number
  uniqueClicks: number
  createdAt: string
  updatedAt: string
  tags: AttachedTag[]
}

type DailyPoint = {
  date: string
  clicks: number
  uniqueClicks: number
}

type TagItem = {
  id: string
  workspaceId: string
  name: string
  color: string | null
  createdAt: string
}

export default function LinkDetailsPage() {
  const params = useParams<{ linkId: string }>()
  const linkId = params.linkId

  const { accessToken, workspaceId, hydrate } = useAuthStore()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [selectedTagId, setSelectedTagId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const linkQuery = useQuery({
    queryKey: ['link-details', workspaceId, linkId],
    queryFn: () =>
      apiFetch<LinkItem>(`/workspaces/${workspaceId}/links/${linkId}`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId && !!linkId
  })

  const dailyQuery = useQuery({
    queryKey: ['link-daily-details', workspaceId, linkId],
    queryFn: () =>
      apiFetch<DailyPoint[]>(`/workspaces/${workspaceId}/links/${linkId}/analytics/daily`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId && !!linkId
  })

  const tagsQuery = useQuery({
    queryKey: ['workspace-tags', workspaceId],
    queryFn: () =>
      apiFetch<TagItem[]>(`/workspaces/${workspaceId}/tags`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const loading = linkQuery.isLoading || dailyQuery.isLoading || tagsQuery.isLoading
  const error = linkQuery.error || dailyQuery.error || tagsQuery.error

  const availableTagOptions = useMemo(() => {
    const allTags = tagsQuery.data || []
    const attachedIds = new Set((linkQuery.data?.tags || []).map((tag) => tag.id))

    return allTags
      .filter((tag) => !attachedIds.has(tag.id))
      .map((tag) => ({
        label: tag.name,
        value: tag.id
      }))
  }, [tagsQuery.data, linkQuery.data?.tags])

  const refreshLink = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['link-details', workspaceId, linkId]
    })
  }

  const handleAttachTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !workspaceId || !selectedTagId) return

    try {
      setSubmitting(true)

      await apiFetch(`/workspaces/${workspaceId}/links/${linkId}/tags`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({ tagId: selectedTagId })
      })

      setSelectedTagId('')
      toast.success('Tag attached successfully.')
      await refreshLink()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to attach tag')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!accessToken || !workspaceId) return

    try {
      await apiFetch(`/workspaces/${workspaceId}/links/${linkId}/tags/${tagId}`, {
        method: 'DELETE',
        token: accessToken
      })

      toast.success('Tag removed.')
      await refreshLink()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove tag')
    }
  }

  const handleCopy = async () => {
    const link = linkQuery.data
    if (!link) return

    await navigator.clipboard.writeText(buildShortUrl(link.slug, link.domain))
    toast.success('Short URL copied.')
  }

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !linkQuery.data) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {error instanceof Error ? error.message : 'Failed to load link details'}
      </div>
    )
  }

  const link = linkQuery.data

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/50">Link details</p>
              <h1 className="mt-2 text-3xl font-semibold">{link.title || link.slug}</h1>
            </div>

            <Link
              href={`/dashboard/links/${link.id}/edit`}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5"
            >
              <Pencil size={15} />
              Edit
            </Link>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-white/50">Short URL</p>
              <p className="mt-1 text-cyan-300">{buildShortUrl(link.slug, link.domain)}</p>
            </div>

            <div>
              <p className="text-white/50">Destination URL</p>
              <p className="mt-1 break-all text-white">{link.destinationUrl}</p>
            </div>

            {link.description ? (
              <div>
                <p className="text-white/50">Description</p>
                <p className="mt-1 text-white">{link.description}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 pt-2">
              <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
                {link.status}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
                Domain: {link.domain}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
                Campaign: {link.campaign || '—'}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
                Clicks: {link.totalClicks}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1 text-white/70">
                Unique: {link.uniqueClicks}
              </span>
            </div>

            <div className="pt-4">
              <Button onClick={handleCopy}>Copy short URL</Button>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-sm text-white/50">Tag management</p>
          <h2 className="mt-2 text-xl font-semibold">Attached tags</h2>

          <div className="mt-6 flex flex-wrap gap-3">
            {link.tags.length === 0 ? (
              <p className="text-sm text-white/55">No tags attached yet.</p>
            ) : (
              link.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm text-white"
                  style={{ backgroundColor: tag.color || '#334155' }}
                >
                  <span>{tag.name}</span>
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="rounded-full bg-black/20 p-1 hover:bg-black/30"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAttachTag} className="mt-6 space-y-4">
            <SelectField
              label="Attach another tag"
              value={selectedTagId}
              onChange={setSelectedTagId}
              options={availableTagOptions}
            />

            <Button type="submit" disabled={submitting || !selectedTagId} fullWidth>
              {submitting ? 'Attaching...' : 'Attach tag'}
            </Button>
          </form>
        </Card>
      </div>

      <AnalyticsOverviewChart data={dailyQuery.data || []} />
    </div>
  )
}
