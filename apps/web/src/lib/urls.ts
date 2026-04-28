export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
export const SHORT_URL_BASE = process.env.NEXT_PUBLIC_SHORT_URL_BASE || API_URL

export function buildShortUrl(slug: string, domain = 'default') {
  const base = SHORT_URL_BASE.replace(/\/+$/, '')

  if (domain === 'default') {
    return `${base}/${slug}`
  }

  if (domain.includes('.')) {
    return `https://${domain}/${slug}`
  }

  return `${base}/r/${domain}/${slug}`
}
