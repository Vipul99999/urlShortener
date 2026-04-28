'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/lib/store/auth-store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { FormMessage } from '@/components/ui/form-message'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import { useToast } from '@/lib/hooks/use-toast'
import { createLinkFormSchema } from '@/lib/validations/links'

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
  tags?: Array<{
    id: string
    name: string
    color: string | null
    createdAt: string
  }>
}

type DomainItem = {
  id: string
  hostname: string
  status: string
}

export default function EditLinkPage() {
  const params = useParams<{ linkId: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const toast = useToast()

  const { accessToken, workspaceId, hydrate } = useAuthStore()

  const [title, setTitle] = useState('')
  const [destinationUrl, setDestinationUrl] = useState('')
  const [domain, setDomain] = useState('default')
  const [campaign, setCampaign] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const linkQuery = useQuery({
    queryKey: ['edit-link', workspaceId, params.linkId],
    queryFn: () =>
      apiFetch<LinkItem>(`/workspaces/${workspaceId}/links/${params.linkId}`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId && !!params.linkId
  })

  const domainsQuery = useQuery({
    queryKey: ['domains', workspaceId],
    queryFn: () =>
      apiFetch<DomainItem[]>(`/workspaces/${workspaceId}/domains`, {
        token: accessToken || undefined
      }),
    enabled: !!accessToken && !!workspaceId
  })

  const assignableDomains = (domainsQuery.data || []).filter(
    (item) => item.hostname === 'default' || item.status === 'VERIFIED' || item.hostname === domain
  )

  useEffect(() => {
    if (linkQuery.data) {
      setTitle(linkQuery.data.title || '')
      setDestinationUrl(linkQuery.data.destinationUrl || '')
      setDomain(linkQuery.data.domain || 'default')
      setCampaign(linkQuery.data.campaign || '')
    }
  }, [linkQuery.data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !workspaceId) return

    setErrors({})
    setFormError('')
    setFormSuccess('')

    const parsed = createLinkFormSchema.safeParse({
      title,
      destinationUrl,
      domain,
      slug: '',
      campaign
    })

    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
      )
      setErrors(fieldErrors)
      setFormError(parsed.error.issues[0]?.message || 'Invalid input')
      return
    }

    try {
      setSubmitting(true)

      await apiFetch(`/workspaces/${workspaceId}/links/${params.linkId}`, {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify({
          title: parsed.data.title || undefined,
          destinationUrl: parsed.data.destinationUrl,
          domain: parsed.data.domain,
          campaign: parsed.data.campaign || undefined
        })
      })

      setFormSuccess('Link updated successfully.')
      toast.success('Link updated successfully.')

      await queryClient.invalidateQueries({ queryKey: ['links', workspaceId] })
      await queryClient.invalidateQueries({
        queryKey: ['link-details', workspaceId, params.linkId]
      })

      router.push(`/dashboard/links/${params.linkId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update link'
      setFormError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (linkQuery.isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (linkQuery.error || !linkQuery.data) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
        {linkQuery.error instanceof Error ? linkQuery.error.message : 'Failed to load link'}
      </div>
    )
  }

  return (
    <Card className="max-w-3xl">
      <p className="text-sm text-white/50">Edit link</p>
      <h1 className="mt-2 text-3xl font-semibold">
        {linkQuery.data.title || linkQuery.data.slug}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormMessage error={formError} success={formSuccess} />

        <TextField
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Portfolio link"
          error={errors.title}
        />

        <TextField
          label="Destination URL"
          value={destinationUrl}
          onChange={setDestinationUrl}
          placeholder="https://example.com"
          error={errors.destinationUrl}
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
                {item.status === 'VERIFIED' ? '' : ' (Pending verification)'}
              </option>
            ))}
          </select>
          {errors.domain ? (
            <span className="mt-2 block text-sm text-red-300">{errors.domain}</span>
          ) : null}
          <span className="mt-2 block text-xs text-white/55">
            Only verified domains can be assigned to links. Use Settings to check DNS and verification status.
          </span>
        </label>

        <TextField
          label="Campaign"
          value={campaign}
          onChange={setCampaign}
          placeholder="launch"
          error={errors.campaign}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save changes'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/dashboard/links/${params.linkId}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
