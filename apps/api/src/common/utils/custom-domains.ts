import { DEFAULT_DOMAIN } from '@repo/shared'

const disallowedHostnames = new Set([
  DEFAULT_DOMAIN,
  'localhost'
])

function stripTrailingDot(value: string) {
  return value.replace(/\.+$/, '')
}

export function isApexLikeHostname(hostname: string) {
  return hostname.split('.').length <= 2
}

export function normalizeHostname(value: string) {
  const normalized = stripTrailingDot(value.trim().toLowerCase())

  if (!normalized) {
    throw new Error('Hostname is required')
  }

  if (normalized.includes('://') || normalized.includes('/')) {
    throw new Error('Enter only the hostname')
  }

  if (normalized.includes(':')) {
    throw new Error('Ports are not allowed in custom domains')
  }

  if (normalized.startsWith('*.')) {
    throw new Error('Wildcard custom domains are not supported')
  }

  if (disallowedHostnames.has(normalized)) {
    throw new Error('This hostname cannot be used as a custom domain')
  }

  if (
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.arpa') ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.test') ||
    normalized.endsWith('.example')
  ) {
    throw new Error('This hostname cannot be used as a custom domain')
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    throw new Error('Use a hostname instead of a raw IP address')
  }

  if (!/^(?=.{1,191}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized)) {
    throw new Error('Enter a valid hostname such as go.example.com')
  }

  if (isApexLikeHostname(normalized)) {
    throw new Error('Use a subdomain such as go.example.com instead of the root domain')
  }

  return normalized
}

export function stripPortFromHost(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()

  if (!trimmed) return null

  if (trimmed.startsWith('[')) {
    const endBracket = trimmed.indexOf(']')
    if (endBracket === -1) return trimmed.toLowerCase()
    return trimmed.slice(1, endBracket).toLowerCase()
  }

  const parts = trimmed.split(':')
  return parts[0]?.toLowerCase() ?? null
}

function configuredHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return stripPortFromHost(value)
  }
}

export function isDefaultShortDomain(hostname: string | null, configuredHosts: string[]) {
  if (!hostname) return true

  return configuredHosts
    .map((host) => configuredHostname(host))
    .filter((host): host is string => Boolean(host))
    .includes(hostname)
}
