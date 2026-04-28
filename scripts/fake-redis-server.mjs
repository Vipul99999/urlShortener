import net from 'node:net'

const port = Number(process.env.FAKE_REDIS_PORT || 6381)
const host = process.env.FAKE_REDIS_HOST || '127.0.0.1'
const store = new Map()

function readCommand(buffer, start = 0) {
  if (start >= buffer.length || buffer[start] !== 42) {
    return null
  }

  const lineEnd = buffer.indexOf('\r\n', start)
  if (lineEnd === -1) return null
  const partCount = Number(buffer.toString('utf8', start + 1, lineEnd))

  let offset = lineEnd + 2
  const parts = []

  for (let i = 0; i < partCount; i += 1) {
    if (offset >= buffer.length || buffer[offset] !== 36) return null
    const sizeEnd = buffer.indexOf('\r\n', offset)
    if (sizeEnd === -1) return null

    const size = Number(buffer.toString('utf8', offset + 1, sizeEnd))
    const valueStart = sizeEnd + 2
    const valueEnd = valueStart + size

    if (buffer.length < valueEnd + 2) return null

    parts.push(buffer.toString('utf8', valueStart, valueEnd))
    offset = valueEnd + 2
  }

  return {
    parts,
    nextOffset: offset
  }
}

function encodeSimpleString(value) {
  return `+${value}\r\n`
}

function encodeBulkString(value) {
  if (value == null) {
    return '$-1\r\n'
  }

  return `$${Buffer.byteLength(value)}\r\n${value}\r\n`
}

function encodeInteger(value) {
  return `:${value}\r\n`
}

function encodeError(message) {
  return `-${message}\r\n`
}

function cleanupExpiredKeys() {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      store.delete(key)
    }
  }
}

function getValue(key) {
  cleanupExpiredKeys()
  const entry = store.get(key)
  return entry ? entry.value : null
}

function handleCommand(parts) {
  const [command, ...args] = parts
  const upper = command.toUpperCase()
  console.log(`[fake-redis] ${upper} ${args.join(' ')}`.trim())

  switch (upper) {
    case 'PING':
      return encodeSimpleString('PONG')
    case 'AUTH':
      return encodeSimpleString('OK')
    case 'SELECT':
      return encodeSimpleString('OK')
    case 'GET':
      return encodeBulkString(getValue(args[0]))
    case 'SETEX': {
      const [key, ttlSeconds, value] = args
      store.set(key, {
        value,
        expiresAt: Date.now() + Number(ttlSeconds) * 1000
      })
      return encodeSimpleString('OK')
    }
    case 'DEL': {
      const key = args[0]
      const existed = store.delete(key)
      return encodeInteger(existed ? 1 : 0)
    }
    default:
      return encodeError(`ERR unsupported command ${upper}`)
  }
}

const server = net.createServer((socket) => {
  let buffer = Buffer.alloc(0)

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk])

    while (true) {
      const parsed = readCommand(buffer)
      if (!parsed) {
        break
      }

      const response = handleCommand(parsed.parts)
      socket.write(response)
      buffer = buffer.subarray(parsed.nextOffset)
    }
  })
})

server.listen(port, host, () => {
  console.log(`[fake-redis] listening on ${host}:${port}`)
})

function shutdown(signal) {
  console.log(`[fake-redis] received ${signal}; shutting down`)
  server.close(() => process.exit(0))
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
