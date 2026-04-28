import net from 'node:net'
import tls from 'node:tls'
import { env } from '../../config/env.js'

type RedirectCacheValue = {
  id: string
  domain: string
  slug: string
  destinationUrl: string
  redirectType: 'TEMPORARY' | 'PERMANENT'
  status: string
  expiresAt: string | null
  deletedAt: string | null
}

type RedisValue = string | number | null

type RedisConnectionConfig = {
  host: string
  port: number
  username?: string
  password?: string
  database: number
  tls: boolean
}

function buildCacheKey(domain: string, slug: string) {
  return `redirect:${domain}:${slug}`
}

function encodeCommand(parts: string[]) {
  const chunks = [`*${parts.length}\r\n`]

  for (const part of parts) {
    chunks.push(`$${Buffer.byteLength(part)}\r\n${part}\r\n`)
  }

  return chunks.join('')
}

function parseRedisUrl(value: string): RedisConnectionConfig {
  const url = new URL(value)

  return {
    host: url.hostname,
    port: Number(url.port || (url.protocol === 'rediss:' ? 6380 : 6379)),
    username: url.username || undefined,
    password: url.password || undefined,
    database: url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) || 0 : 0,
    tls: url.protocol === 'rediss:'
  }
}

function readLine(buffer: Buffer, start: number) {
  const end = buffer.indexOf('\r\n', start)
  if (end === -1) return null

  return {
    line: buffer.toString('utf8', start, end),
    nextOffset: end + 2
  }
}

function parseValue(buffer: Buffer, start = 0): { value: RedisValue; nextOffset: number } | null {
  if (start >= buffer.length) return null

  const prefix = String.fromCharCode(buffer[start])

  if (prefix === '+' || prefix === '-' || prefix === ':') {
    const line = readLine(buffer, start + 1)
    if (!line) return null

    if (prefix === '-') {
      throw new Error(line.line)
    }

    return {
      value: prefix === ':' ? Number(line.line) : line.line,
      nextOffset: line.nextOffset
    }
  }

  if (prefix === '$') {
    const line = readLine(buffer, start + 1)
    if (!line) return null

    const size = Number(line.line)
    if (size === -1) {
      return {
        value: null,
        nextOffset: line.nextOffset
      }
    }

    const end = line.nextOffset + size
    if (buffer.length < end + 2) return null

    return {
      value: buffer.toString('utf8', line.nextOffset, end),
      nextOffset: end + 2
    }
  }

  throw new Error(`Unsupported Redis response prefix: ${prefix}`)
}

class MinimalRedisClient {
  constructor(private readonly config: RedisConnectionConfig) {}

  async execute(commands: string[][]) {
    const bootstrapCommands: string[][] = []

    if (this.config.password) {
      if (this.config.username) {
        bootstrapCommands.push(['AUTH', this.config.username, this.config.password])
      } else {
        bootstrapCommands.push(['AUTH', this.config.password])
      }
    }

    if (this.config.database > 0) {
      bootstrapCommands.push(['SELECT', String(this.config.database)])
    }

    const allCommands = [...bootstrapCommands, ...commands]

    return new Promise<RedisValue[]>((resolve, reject) => {
      const socket = this.config.tls
        ? tls.connect({
            host: this.config.host,
            port: this.config.port,
            servername: this.config.host
          })
        : net.createConnection({
            host: this.config.host,
            port: this.config.port
          })

      let buffer = Buffer.alloc(0)
      let parsedCount = 0
      const responses: RedisValue[] = []

      socket.once('error', (error) => {
        socket.destroy()
        reject(error)
      })

      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk])

        try {
          while (parsedCount < allCommands.length) {
            const parsed = parseValue(buffer)
            if (!parsed) break

            responses.push(parsed.value)
            buffer = buffer.subarray(parsed.nextOffset)
            parsedCount += 1
          }

          if (parsedCount === allCommands.length) {
            socket.end()
            resolve(responses.slice(bootstrapCommands.length))
          }
        } catch (error) {
          socket.destroy()
          reject(error)
        }
      })

      socket.once('connect', () => {
        const payload = allCommands.map((command) => encodeCommand(command)).join('')
        socket.write(payload)
      })
    })
  }

  async ping() {
    await this.execute([['PING']])
  }

  async get(key: string) {
    const [value] = await this.execute([['GET', key]])
    return typeof value === 'string' ? value : null
  }

  async setEx(key: string, ttlSeconds: number, value: string) {
    await this.execute([['SETEX', key, String(ttlSeconds), value]])
  }

  async del(key: string) {
    await this.execute([['DEL', key]])
  }
}

class InMemoryRedirectCache {
  private readonly store = new Map<string, { value: string; expiresAt: number }>()

  async get(key: string) {
    const entry = this.store.get(key)
    if (!entry) return null

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }

    return entry.value
  }

  async setEx(key: string, ttlSeconds: number, value: string) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    })
  }

  async del(key: string) {
    this.store.delete(key)
  }
}

class RedirectCache {
  private readonly fallback = new InMemoryRedirectCache()
  private readonly redisClient = env.REDIS_URL ? new MinimalRedisClient(parseRedisUrl(env.REDIS_URL)) : null
  private redisUnavailable = false
  private warnedUnavailable = false
  private recoveryLogged = false
  private lastReconnectAttemptAt = 0
  private reconnectPromise: Promise<boolean> | null = null

  async verifyConnection() {
    if (!this.redisClient) return

    try {
      await this.redisClient.ping()
      this.markRedisAvailable()
    } catch (error) {
      this.redisUnavailable = true
      this.warnOnce(error)
    }
  }

  async get(domain: string, slug: string): Promise<RedirectCacheValue | null> {
    const key = buildCacheKey(domain, slug)
    const raw = await this.getRaw(key)
    if (!raw) return null

    try {
      return JSON.parse(raw) as RedirectCacheValue
    } catch {
      await this.delete(domain, slug)
      return null
    }
  }

  async set(value: RedirectCacheValue) {
    const key = buildCacheKey(value.domain, value.slug)
    const payload = JSON.stringify(value)
    await this.setRaw(key, payload)
  }

  async delete(domain: string, slug: string) {
    const key = buildCacheKey(domain, slug)

    if (await this.canUseRedis()) {
      const redisClient = this.redisClient
      try {
        await redisClient?.del(key)
      } catch (error) {
        this.redisUnavailable = true
        this.warnOnce(error)
      }
    }

    await this.fallback.del(key)
  }

  private async getRaw(key: string) {
    if (await this.canUseRedis()) {
      const redisClient = this.redisClient
      try {
        return await redisClient?.get(key)
      } catch (error) {
        this.redisUnavailable = true
        this.warnOnce(error)
      }
    }

    return this.fallback.get(key)
  }

  private async setRaw(key: string, value: string) {
    if (await this.canUseRedis()) {
      const redisClient = this.redisClient
      try {
        await redisClient?.setEx(key, env.REDIS_CACHE_TTL_SECONDS, value)
        return
      } catch (error) {
        this.redisUnavailable = true
        this.warnOnce(error)
      }
    }

    await this.fallback.setEx(key, env.REDIS_CACHE_TTL_SECONDS, value)
  }

  private async canUseRedis() {
    if (!this.redisClient) return false
    if (!this.redisUnavailable) return true

    return this.tryReconnect()
  }

  private async tryReconnect() {
    const now = Date.now()
    if (this.reconnectPromise) {
      return this.reconnectPromise
    }

    if (now - this.lastReconnectAttemptAt < env.REDIS_RECONNECT_INTERVAL_MS) {
      return false
    }

    this.lastReconnectAttemptAt = now
    const redisClient = this.redisClient
    this.reconnectPromise = (async () => {
      try {
        await redisClient?.ping()
        this.markRedisAvailable()
        return true
      } catch (error) {
        this.redisUnavailable = true
        this.warnOnce(error)
        return false
      } finally {
        this.reconnectPromise = null
      }
    })()

    return this.reconnectPromise
  }

  private markRedisAvailable() {
    const wasUnavailable = this.redisUnavailable
    this.redisUnavailable = false
    this.warnedUnavailable = false

    if (wasUnavailable && !this.recoveryLogged) {
      this.recoveryLogged = true
      console.info('Redis cache connection restored; resuming Redis-backed cache operations.')
    }

    if (!wasUnavailable) {
      this.recoveryLogged = false
    }
  }

  private warnOnce(error: unknown) {
    if (this.warnedUnavailable) return

    this.warnedUnavailable = true
    this.recoveryLogged = false
    console.warn('Redis cache unavailable; using in-memory fallback.', error)
  }
}

export const redirectCache = new RedirectCache()
export type { RedirectCacheValue }
