function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false
  }

  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function isIpv4Literal(hostname: string) {
  const parts = hostname.split('.').map((part) => Number(part))
  return parts.length === 4 && parts.every((part) => !Number.isNaN(part) && part >= 0 && part <= 255)
}

function isIpv6Literal(hostname: string) {
  return hostname.includes(':')
}

function isBlockedPseudoDomain(hostname: string) {
  return (
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.arpa') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.example') ||
    hostname.endsWith('.invalid') ||
    hostname.endsWith('.nip.io') ||
    hostname.endsWith('.sslip.io') ||
    hostname.endsWith('.xip.io')
  )
}

export function normalizeUrl(value: string) {
  const url = new URL(value)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https URLs are allowed')
  }

  const hostname = url.hostname.toLowerCase()
  const allowedPorts = new Set(['', '80', '443', '8080', '8443'])

  if (url.username || url.password) {
    throw new Error('Destination URLs cannot contain embedded credentials')
  }

  if (!allowedPorts.has(url.port)) {
    throw new Error('Only standard web ports are allowed')
  }

  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '[::1]' ||
    isPrivateIpv4(hostname) ||
    isIpv4Literal(hostname) ||
    isIpv6Literal(hostname) ||
    isBlockedPseudoDomain(hostname)
  ) {
    throw new Error('Private and local network URLs are not allowed')
  }

  return url.toString()
}
