type BucketEntry = {
  count: number
  resetAt: number
  lockedUntil: number | null
}

type FailureResult = {
  count: number
  lockedUntil: number | null
}

class SecurityGuard {
  private buckets = new Map<string, BucketEntry>()

  private getOrCreateBucket(key: string, windowMs: number, now: number) {
    const current = this.buckets.get(key)
    if (!current || current.resetAt <= now) {
      const next = {
        count: 0,
        resetAt: now + windowMs,
        lockedUntil: null
      }
      this.buckets.set(key, next)
      return next
    }

    return current
  }

  getLock(key: string) {
    const current = this.buckets.get(key)
    if (!current) {
      return null
    }

    if (current.lockedUntil && current.lockedUntil > Date.now()) {
      return current.lockedUntil
    }

    if (current.lockedUntil && current.lockedUntil <= Date.now()) {
      current.lockedUntil = null
      current.count = 0
    }

    return null
  }

  recordFailure(params: {
    key: string
    windowMs: number
    maxAttempts: number
    lockDurationMs: number
  }): FailureResult {
    const now = Date.now()
    const bucket = this.getOrCreateBucket(params.key, params.windowMs, now)

    if (bucket.lockedUntil && bucket.lockedUntil > now) {
      return {
        count: bucket.count,
        lockedUntil: bucket.lockedUntil
      }
    }

    bucket.count += 1
    if (bucket.count >= params.maxAttempts) {
      bucket.lockedUntil = now + params.lockDurationMs
    }

    return {
      count: bucket.count,
      lockedUntil: bucket.lockedUntil
    }
  }

  clear(key: string) {
    this.buckets.delete(key)
  }
}

export const securityGuard = new SecurityGuard()
