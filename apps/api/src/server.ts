import { buildApp } from './app.js'
import { env } from './config/env.js'
import { sendOperationalAlert } from './common/utils/alerts.js'
import { captureMonitoringError, flushMonitoring } from './common/utils/monitoring.js'

const start = async () => {
  const app = await buildApp()

  try {
    await app.listen({
      port: env.PORT,
      host: env.HOST
    })
  } catch (error) {
    app.log.error(error)
    captureMonitoringError(error, {
      tags: {
        area: 'api',
        phase: 'startup'
      }
    })
    await sendOperationalAlert({
      title: 'API startup failed',
      level: 'critical',
      source: 'api',
      message: error instanceof Error ? error.message : 'Unknown startup failure'
    })
    await flushMonitoring()
    process.exit(1)
  }
}

start()
