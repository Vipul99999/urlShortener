import * as Sentry from '@sentry/node'

let initialized = false

export function initMonitoring() {
  if (initialized || !process.env.SENTRY_DSN) {
    return
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
    disableInstrumentationWarnings: true
  })

  initialized = true
}

export function captureMonitoringError(
  error: unknown,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
  }
) {
  if (!process.env.SENTRY_DSN) return

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value)
      }
    }

    if (context?.extra) {
      for (const [key, value] of Object.entries(context.extra)) {
        scope.setExtra(key, value)
      }
    }

    Sentry.captureException(error)
  })
}

export async function flushMonitoring(timeoutMs = 2000) {
  if (!process.env.SENTRY_DSN) return
  await Sentry.flush(timeoutMs)
}
