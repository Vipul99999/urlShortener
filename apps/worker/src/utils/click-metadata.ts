function safeHostFromUrl(value: string | null) {
  if (!value) return null

  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return null
  }
}

export function detectIsBot(userAgent: string | null) {
  if (!userAgent) return false
  return /bot|crawl|spider|preview|facebookexternalhit|slurp|pingdom|monitor|uptime|headless|phantom|python-requests|axios|wget|curl|httpclient/i.test(userAgent)
}

export function detectDeviceType(userAgent: string | null) {
  if (!userAgent) return 'unknown'
  if (detectIsBot(userAgent)) return 'bot'
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  if (/mobile|iphone|android/i.test(userAgent)) return 'mobile'
  return 'desktop'
}

export function detectBrowser(userAgent: string | null) {
  if (!userAgent) return 'Unknown'
  if (/edg\//i.test(userAgent)) return 'Edge'
  if (/chrome\//i.test(userAgent) && !/edg\//i.test(userAgent)) return 'Chrome'
  if (/firefox\//i.test(userAgent)) return 'Firefox'
  if (/safari\//i.test(userAgent) && !/chrome\//i.test(userAgent)) return 'Safari'
  if (/opr\//i.test(userAgent) || /opera/i.test(userAgent)) return 'Opera'
  return 'Other'
}

export function detectOs(userAgent: string | null) {
  if (!userAgent) return 'Unknown'
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/android/i.test(userAgent)) return 'Android'
  if (/iphone|ipad|ios/i.test(userAgent)) return 'iOS'
  if (/mac os x|macintosh/i.test(userAgent)) return 'macOS'
  if (/linux/i.test(userAgent)) return 'Linux'
  return 'Other'
}

export function extractReferrerHost(referrer: string | null) {
  return safeHostFromUrl(referrer)
}
