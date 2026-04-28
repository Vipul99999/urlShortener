import 'dotenv/config'

const nodeEnv = process.env.NODE_ENV

if (nodeEnv && !['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production',
  DATABASE_URL: process.env.DATABASE_URL,
  JOB_POLL_INTERVAL_MS: Number(process.env.JOB_POLL_INTERVAL_MS || 1000),
  JOB_STALE_LOCK_TIMEOUT_MS: Number(process.env.JOB_STALE_LOCK_TIMEOUT_MS || 300000),
  WORKER_ERROR_BACKOFF_MS: Number(process.env.WORKER_ERROR_BACKOFF_MS || 5000),
  WORKER_HEALTH_HOST: process.env.WORKER_HEALTH_HOST || '127.0.0.1',
  WORKER_HEALTH_PORT: Number(process.env.WORKER_HEALTH_PORT || 4010),
  WORKER_ID: process.env.WORKER_ID || `worker-${process.pid}`,
  OBJECT_STORAGE_PROVIDER: (process.env.OBJECT_STORAGE_PROVIDER || 'local') as 'local' | 'r2',
  EXPORT_STORAGE_DIR: process.env.EXPORT_STORAGE_DIR || '.data/exports',
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || 'smtp') as 'smtp' | 'resend',
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  SENTRY_TRACES_SAMPLE_RATE: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL,
  ALERT_WEBHOOK_BEARER_TOKEN: process.env.ALERT_WEBHOOK_BEARER_TOKEN
}
