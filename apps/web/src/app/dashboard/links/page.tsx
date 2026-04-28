'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, QrCode, Search, Tag, Trash2, Copy, X, Pencil } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { FormMessage } from '@/components/ui/form-message'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { useToast } from '@/lib/hooks/use-toast'
import { createLinkFormSchema, createTagFormSchema } from '@/lib/validations/links'
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
  campaign: string | null
  status: string
  totalClicks: number
  uniqueClicks?: number
  createdAt: string
  tags: AttachedTag[]
}

type TagItem = {
  id: string
  workspaceId: string
  name: string
  color: string | null
  createdAt: string
}

type DomainItem = {
  id: string
  hostname: string
  status: string
  shortBaseUrl: string
}

type QrResponse = {
  shortUrl: string
  format: string
  svg: string
}

export default function LinksPage() {
  const { accessToken, workspaceId, hydrate } = useAuthStore()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const [title, setTitle] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [domain, setDomain] = useState('default')
  const [slug, setSlug] = useState('')
  const [campaign, setCampaign] = useState('')

  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState('#22c55e')

  const [createLinkErrors, setCreateLinkErrors] = useState<Record<string, string>>({})
  const [createTagErrors, setCreateTagErrors] = useState<Record<string, string>>({})

  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrSvg, setQrSvg] = useState('')
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const linksQuery = useQuery({
    queryKey: ['links', workspaceId],
    queryFn: () =>
      apiFetch<LinkItem[]>(`/workspaces/${workspaceId}/links`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const tagsQuery = useQuery({
    queryKey: ['tags', workspaceId],
    queryFn: () =>
      apiFetch<TagItem[]>(`/workspaces/${workspaceId}/tags`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const domainsQuery = useQuery({
    queryKey: ['domains', workspaceId],
    queryFn: () =>
      apiFetch<DomainItem[]>(`/workspaces/${workspaceId}/domains`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const loading = linksQuery.isLoading || tagsQuery.isLoading || domainsQuery.isLoading
  const error = linksQuery.error || tagsQuery.error || domainsQuery.error

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    const links = linksQuery.data || []

    if (!q) return links

    return links.filter((link) => {
      const tagMatch = (link.tags || []).some((tag) => tag.name.toLowerCase().includes(q))

      return (
        (link.title || '').toLowerCase().includes(q) ||
        link.slug.toLowerCase().includes(q) ||
        link.destinationUrl.toLowerCase().includes(q) ||
        (link.campaign || '').toLowerCase().includes(q) ||
        tagMatch
      )
    })
  }, [linksQuery.data, search])

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !workspaceId) return

    setCreateLinkErrors({})
    setFormError('')
    setFormSuccess('')

    const parsed = createLinkFormSchema.safeParse({
      title,
      destinationUrl,
      domain,
      slug,
      campaign
    })

    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
      )
      setCreateLinkErrors(fieldErrors)
      setFormError(parsed.error.issues[0]?.message || 'Invalid input')
      return
    }

    try {
      setSubmitting(true)

      await apiFetch(`/workspaces/${workspaceId}/links`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify({
          ...parsed.data,
          redirectType: 'TEMPORARY'
        })
      })

      setTitle('')
      setDestinationUrl('')
      setDomain('default')
      setSlug('')
      setCampaign('')
      setFormSuccess('Link created successfully.')
      toast.success('Link created successfully.')

      await queryClient.invalidateQueries({ queryKey: ['links', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['workspace-summary', workspaceId] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create link'
      setFormError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !workspaceId) return

    setCreateTagErrors({})
    setFormError('')
    setFormSuccess('')

    const parsed = createTagFormSchema.safeParse({
      name: tagName,
      color: tagColor
    })

    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
      )
      setCreateTagErrors(fieldErrors)
      setFormError(parsed.error.issues[0]?.message || 'Invalid input')
      return
    }

    try {
      await apiFetch(`/workspaces/${workspaceId}/tags`, {
        method: 'POST',
        token: accessToken,
        body: JSON.stringify(parsed.data)
      })

      setTagName('')
      setTagColor('#22c55e')
      setFormSuccess('Tag created successfully.')
      toast.success('Tag created successfully.')
      await queryClient.invalidateQueries({ queryKey: ['tags', workspaceId] })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tag'
      setFormError(message)
      toast.error(message)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!accessToken || !workspaceId) return
    if (!window.confirm('Delete this link?')) return

    try {
      await apiFetch(`/workspaces/${workspaceId}/links/${linkId}`, {
        method: 'DELETE',
        token: accessToken
      })

      toast.success('Link deleted.')
      await queryClient.invalidateQueries({ queryKey: ['links', workspaceId] })
      await queryClient.invalidateQueries({ queryKey: ['workspace-summary', workspaceId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete link')
    }
  }

  const handleGenerateQr = async (linkId: string) => {
    if (!accessToken || !workspaceId) return

    try {
      const data = await apiFetch<QrResponse>(`/workspaces/${workspaceId}/links/${linkId}/qr`, {
        method: 'POST',
        token: accessToken
      })

      setQrSvg(data.svg)
      setQrUrl(data.shortUrl)
      setQrModalOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate QR')
    }
  }

  const handleExport = async () => {
    if (!accessToken || !workspaceId) return

    try {
      await apiFetch(`/workspaces/${workspaceId}/exports/links`, {
        method: 'POST',
        token: accessToken
      })

      toast.success('Export queued. Check Export history for download when it completes.')
      await queryClient.invalidateQueries({ queryKey: ['exports', workspaceId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export CSV')
    }
  }

  const handleCopy = async (slugValue: string, domainValue: string) => {
    await navigator.clipboard.writeText(buildShortUrl(slugValue, domainValue))
    toast.success('Short URL copied.')
  }

  const handleDownloadQr = () => {
    if (!qrSvg) return

    const blob = new Blob([qrSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qr-code.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  const assignableDomains = (domainsQuery.data || []).filter(
    (item) => item.hostname === 'default' || item.status === 'VERIFIED'
  )
  const pendingDomains = (domainsQuery.data || []).filter(
    (item) => item.hostname !== 'default' && item.status !== 'VERIFIED'
  )

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {error instanceof Error ? error.message : 'Failed to load links'}
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <FormMessage error={formError} success={formSuccess} />

      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(103,232,249,0.1),rgba(8,19,36,0.92)_38%,rgba(8,19,36,0.98))] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">Link studio</p>
            <h1 className="mt-4 text-3xl font-semibold">Ship new links fast, keep the workspace tidy.</h1>
            <p className="mt-2 max-w-2xl text-white/64">
              Create short URLs, assign trusted domains, organize tags, queue exports, and hand QR assets to marketing without leaving this screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-white/65">
            <span className="rounded-full bg-white/5 px-4 py-2">Links: {linksQuery.data?.length || 0}</span>
            <span className="rounded-full bg-white/5 px-4 py-2">Tags: {tagsQuery.data?.length || 0}</span>
            <span className="rounded-full bg-white/5 px-4 py-2">
              Verified domains: {assignableDomains.filter((item) => item.hostname !== 'default').length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
          <p className="text-sm text-white/50">Best first move</p>
          <h3 className="mt-2 text-lg font-semibold">Start with one campaign link</h3>
          <p className="mt-2 text-sm text-white/55">
            A single well-named link with a campaign label makes the rest of the dashboard much more useful.
          </p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
          <p className="text-sm text-white/50">Trust signal</p>
          <h3 className="mt-2 text-lg font-semibold">Use a verified domain when you can</h3>
          <p className="mt-2 text-sm text-white/55">
            Branded short links usually feel safer to end users and perform better in campaigns.
          </p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5">
          <p className="text-sm text-white/50">Operational note</p>
          <h3 className="mt-2 text-lg font-semibold">Exports and QR stay one click away</h3>
          <p className="mt-2 text-sm text-white/55">
            Keep this screen as your daily workspace for launch, copy, QR handoff, and quick cleanup.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-200">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Create short link</h3>
              <p className="text-white/60">Launch a new short URL for any campaign.</p>
            </div>
          </div>

          <form onSubmit={handleCreateLink} className="space-y-4">
            <TextField
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Portfolio link"
              error={createLinkErrors.title}
            />
            <TextField
              label="Destination URL"
              value={destinationUrl}
              onChange={setDestinationUrl}
              placeholder="https://example.com"
              error={createLinkErrors.destinationUrl}
            />
            <label className="block text-sm text-white/80">
              <span className="mb-2 block">Short domain</span>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              >
                {assignableDomains.map((item) => (
                  <option key={item.id} value={item.hostname}>
                    {item.hostname === 'default' ? 'Default domain' : item.hostname}
                  </option>
                ))}
              </select>
              {createLinkErrors.domain ? (
                <span className="mt-2 block text-sm text-red-300">{createLinkErrors.domain}</span>
              ) : null}
              {pendingDomains.length > 0 ? (
                <span className="mt-2 block text-xs text-white/55">
                  Pending or disabled domains must be fixed in Settings before they can be used for new links.
                </span>
              ) : null}
            </label>
            <TextField
              label="Custom slug"
              value={slug}
              onChange={setSlug}
              placeholder="portfolio-demo"
              error={createLinkErrors.slug}
            />
            <TextField
              label="Campaign"
              value={campaign}
              onChange={setCampaign}
              placeholder="launch"
              error={createLinkErrors.campaign}
            />

            <Button type="submit" disabled={submitting} fullWidth>
              {submitting ? 'Creating...' : 'Create link'}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-200">
              <Tag size={18} />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Create tag</h3>
              <p className="text-white/60">Keep links organized by campaign or category.</p>
            </div>
          </div>

          <form onSubmit={handleCreateTag} className="space-y-4">
            <TextField
              label="Tag name"
              value={tagName}
              onChange={setTagName}
              placeholder="marketing"
              error={createTagErrors.name}
            />
            <TextField
              label="Color"
              value={tagColor}
              onChange={setTagColor}
              placeholder="#22c55e"
              error={createTagErrors.color}
            />

            <Button type="submit" fullWidth>
              Create tag
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            {(tagsQuery.data || []).length === 0 ? (
              <p className="text-sm text-white/55">No tags yet.</p>
            ) : (
              (tagsQuery.data || []).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full px-3 py-1 text-sm text-white"
                  style={{ backgroundColor: tag.color || '#334155' }}
                >
                  {tag.name}
                </span>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-semibold">Your links</h3>
            <p className="mt-1 text-white/60">
              Search, copy, export, and manage short URLs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search links or tags"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-white outline-none sm:w-64"
              />
            </div>

            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {filteredLinks.length === 0 ? (
          <EmptyState
            title="No links yet"
            description="Create your first short link to start tracking clicks and campaigns."
          />
        ) : (
          <div className="space-y-4">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-medium text-white">
                      {link.title || link.slug}
                    </h4>
                    <p className="mt-1 truncate text-cyan-300">
                      {buildShortUrl(link.slug, link.domain)}
                    </p>
                    <p className="mt-2 truncate text-sm text-white/55">
                      {link.destinationUrl}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                      <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/65">
                      <span className="rounded-full bg-white/5 px-3 py-1">
                        {link.status}
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1">
                        Domain: {link.domain}
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1">
                        Clicks: {link.totalClicks}
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1">
                        Campaign: {link.campaign || '—'}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(link.tags || []).length === 0 ? (
                        <span className="text-xs text-white/40">No tags</span>
                      ) : (
                        link.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full px-3 py-1 text-xs text-white"
                            style={{ backgroundColor: tag.color || '#334155' }}
                          >
                            {tag.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/links/${link.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
                    >
                      View
                    </Link>

                    <Link
                      href={`/dashboard/links/${link.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
                    >
                      <Pencil size={15} />
                      Edit
                    </Link>

                    <button
                      onClick={() => handleCopy(link.slug, link.domain)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
                    >
                      <Copy size={15} />
                      Copy
                    </button>

                    <button
                      onClick={() => handleGenerateQr(link.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5"
                    >
                      <QrCode size={15} />
                      QR
                    </button>

                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-500/20 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {qrModalOpen && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-10 sm:items-center sm:px-6">
    <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold">QR Code</h3>
          <p className="truncate text-sm text-white/55">{qrUrl}</p>
        </div>

        <button
          onClick={() => setQrModalOpen(false)}
          className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/75"
        >
          <X size={16} />
        </button>
      </div>

      <div
        className="overflow-hidden rounded-2xl bg-white p-4"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => setQrModalOpen(false)}>
          Close
        </Button>
        <Button onClick={handleDownloadQr}>Download QR</Button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}
