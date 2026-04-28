export async function sendOperationalAlert(input: {
  title: string
  level?: 'info' | 'warning' | 'error' | 'critical'
  source: 'api' | 'worker' | 'web'
  message: string
  details?: Record<string, unknown>
}) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.ALERT_WEBHOOK_BEARER_TOKEN
          ? {
              Authorization: `Bearer ${process.env.ALERT_WEBHOOK_BEARER_TOKEN}`
            }
          : {})
      },
      body: JSON.stringify({
        title: input.title,
        level: input.level || 'error',
        source: input.source,
        message: input.message,
        details: input.details || {}
      })
    })
  } catch (error) {
    console.error('[alerts] failed to send operational alert', error)
  }
}
