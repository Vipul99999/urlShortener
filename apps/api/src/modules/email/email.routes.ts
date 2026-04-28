import crypto from 'node:crypto'
import type { Prisma } from '@repo/db'
import type { FastifyPluginAsync } from 'fastify'

function normalizeHeader(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name]
  return Array.isArray(value) ? value[0] : value
}

function verifySvixSignature(payload: string, headers: Record<string, string | string[] | undefined>, secret: string) {
  const id = normalizeHeader(headers, 'svix-id')
  const timestamp = normalizeHeader(headers, 'svix-timestamp')
  const signature = normalizeHeader(headers, 'svix-signature')

  if (!id || !timestamp || !signature) {
    throw new Error('Missing webhook signature headers')
  }

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber)) {
    throw new Error('Invalid webhook timestamp')
  }

  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
    throw new Error('Webhook timestamp is too old')
  }

  const signedContent = `${id}.${timestamp}.${payload}`
  const secretValue = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const key = Buffer.from(secretValue, 'base64')
  const expected = crypto.createHmac('sha256', key).update(signedContent).digest('base64')

  const signatures = signature
    .split(' ')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.split(','))
    .filter((parts) => parts[0] === 'v1' && typeof parts[1] === 'string')
    .map((parts) => parts[1])

  return signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate)
    const expectedBuffer = Buffer.from(expected)

    if (candidateBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
  })
}

export const emailRoutes: FastifyPluginAsync = async (app) => {
  app.register(async (emailApp) => {
    emailApp.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
      done(null, body)
    })

    emailApp.post('/webhooks/resend', async (request, reply) => {
      const secret = process.env.RESEND_WEBHOOK_SECRET
      if (!secret) {
        return reply.status(503).send({ message: 'Webhook secret is not configured' })
      }

      const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {})

      if (!verifySvixSignature(rawBody, request.headers, secret)) {
        return reply.status(400).send({ message: 'Invalid webhook signature' })
      }

      const payload = JSON.parse(rawBody) as {
        type?: string
        created_at?: string
        data?: Record<string, unknown>
      }

      const eventType = payload.type || 'unknown'
      const providerMessageId =
        (payload.data?.email_id as string | undefined) ||
        (payload.data?.id as string | undefined) ||
        null

      const recipient =
        (payload.data?.to as string | undefined) ||
        (payload.data?.email as string | undefined) ||
        null

      const status = eventType.includes('.') ? eventType.split('.').pop() || eventType : eventType

      await app.prisma.emailDeliveryEvent.create({
        data: {
          provider: 'resend',
          emailType: String(payload.data?.['type'] || 'transactional'),
          recipient,
          providerMessageId,
          eventType,
          status,
          payloadJson: payload as Prisma.InputJsonValue
        }
      })

      app.log.info({ eventType, providerMessageId }, 'Processed Resend webhook')

      return reply.send({ ok: true })
    })
  })
}
