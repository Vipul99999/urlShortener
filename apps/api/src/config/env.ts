import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  CUSTOM_DOMAIN_TARGET_HOST: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  REDIS_RECONNECT_INTERVAL_MS: z.coerce.number().default(30000),
  OBJECT_STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
  EXPORT_STORAGE_DIR: z.string().default('.data/exports'),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  EMAIL_PROVIDER: z.enum(['smtp', 'resend']).default('smtp'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0.1),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  ALERT_WEBHOOK_BEARER_TOKEN: z.string().optional(),
  AUTH_LOGIN_WINDOW_MS: z.coerce.number().default(900000),
  AUTH_LOGIN_MAX_ATTEMPTS: z.coerce.number().default(8),
  AUTH_LOGIN_LOCK_DURATION_MS: z.coerce.number().default(1800000),
  API_KEY_DEFAULT_TTL_DAYS: z.coerce.number().default(90),
  API_KEY_MAX_TTL_DAYS: z.coerce.number().default(365),
  API_KEY_INVALID_WINDOW_MS: z.coerce.number().default(300000),
  API_KEY_INVALID_MAX_ATTEMPTS: z.coerce.number().default(10),
  API_KEY_INVALID_LOCK_DURATION_MS: z.coerce.number().default(1800000),
  ABUSE_REDIRECT_MAX_PER_MINUTE: z.coerce.number().default(240),
  ABUSE_SUSPICIOUS_REDIRECT_MAX_PER_MINUTE: z.coerce.number().default(90),
  ABUSE_REDIRECT_MISS_MAX_PER_MINUTE: z.coerce.number().default(40),
  ABUSE_BLOCK_DURATION_MS: z.coerce.number().default(900000),
  ABUSE_IP_BLOCKLIST: z.string().optional(),
  ABUSE_USER_AGENT_BLOCK_PATTERNS: z.string().optional()
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== 'production') {
    return
  }

  const weakSecretPatterns = [/change-this/i, /super-secret/i, /example/i, /localhost/i]

  for (const [key, secret] of [
    ['JWT_ACCESS_SECRET', value.JWT_ACCESS_SECRET],
    ['JWT_REFRESH_SECRET', value.JWT_REFRESH_SECRET]
  ] as const) {
    if (weakSecretPatterns.some((pattern) => pattern.test(secret))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} must be a strong production secret`
      })
    }
  }

  for (const [key, url] of [
    ['APP_URL', value.APP_URL],
    ['API_URL', value.API_URL]
  ] as const) {
    if (!url.startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} must use https in production`
      })
    }
  }

  if (!value.REDIS_URL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['REDIS_URL'],
      message: 'REDIS_URL is required in production'
    })
  }

  if (value.OBJECT_STORAGE_PROVIDER === 'local') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OBJECT_STORAGE_PROVIDER'],
      message: 'Use shared object storage in production instead of local storage'
    })
  }

  if (value.OBJECT_STORAGE_PROVIDER === 'r2') {
    for (const key of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT'] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when OBJECT_STORAGE_PROVIDER=r2`
        })
      }
    }
  }

  if (value.EMAIL_PROVIDER === 'resend') {
    for (const key of ['RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET'] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when EMAIL_PROVIDER=resend`
        })
      }
    }
  }
})

export const env = envSchema.parse(process.env)
