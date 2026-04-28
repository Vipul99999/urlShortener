type BucketEntry = {
  count: number
  resetAt: number
}

type BlockEntry = {
  until: number
  reason: string
}

class AbuseGuard {
  private redirectHits = new Map<string, BucketEntry>()
  private redirectMisses = new Map<string, BucketEntry>()
  private suspiciousRedirectHits = new Map<string, BucketEntry>()
  private blockedIps = new Map<string, BlockEntry>()

  private bump(map: Map<string, BucketEntry>, key: string, now: number) {
    const current = map.get(key)
    if (!current || current.resetAt <= now) {
      map.set(key, {
        count: 1,
        resetAt: now + 60_000
      })
      return 1
    }

    current.count += 1
    return current.count
  }

  private block(ip: string, reason: string, durationMs: number) {
    this.blockedIps.set(ip, {
      until: Date.now() + durationMs,
      reason
    })
  }

  assertNotBlocked(ip: string | null, durationMs: number) {
    if (!ip) return

    const blocked = this.blockedIps.get(ip)
    if (!blocked) return

    if (blocked.until <= Date.now()) {
      this.blockedIps.delete(ip)
      return
    }

    const error = new Error(blocked.reason)
    ;(error as Error & { statusCode: number }).statusCode = 429
    throw error
  }

  getBlockEntry(ip: string | null) {
    if (!ip) return null

    const blocked = this.blockedIps.get(ip)
    if (!blocked) return null

    if (blocked.until <= Date.now()) {
      this.blockedIps.delete(ip)
      return null
    }

    return blocked
  }

  registerRedirectHit(params: {
    ip: string | null
    maxPerMinute: number
    blockDurationMs: number
  }) {
    if (!params.ip) return

    this.assertNotBlocked(params.ip, params.blockDurationMs)

    const count = this.bump(this.redirectHits, params.ip, Date.now())
    if (count > params.maxPerMinute) {
      this.block(params.ip, 'Too many redirect requests from this IP', params.blockDurationMs)
      this.assertNotBlocked(params.ip, params.blockDurationMs)
    }
  }

  registerRedirectMiss(params: {
    ip: string | null
    maxMissesPerMinute: number
    blockDurationMs: number
  }) {
    if (!params.ip) return

    const count = this.bump(this.redirectMisses, params.ip, Date.now())
    if (count > params.maxMissesPerMinute) {
      this.block(params.ip, 'Too many invalid short-link lookups from this IP', params.blockDurationMs)
    }
  }

  registerSuspiciousRedirectHit(params: {
    ip: string | null
    maxPerMinute: number
    blockDurationMs: number
  }) {
    if (!params.ip) return

    this.assertNotBlocked(params.ip, params.blockDurationMs)

    const count = this.bump(this.suspiciousRedirectHits, params.ip, Date.now())
    if (count > params.maxPerMinute) {
      this.block(params.ip, 'Too many suspicious redirect requests from this IP', params.blockDurationMs)
      this.assertNotBlocked(params.ip, params.blockDurationMs)
    }
  }
}

export const abuseGuard = new AbuseGuard()
