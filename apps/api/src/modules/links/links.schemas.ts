import { z } from 'zod'

export const createLinkSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  destinationUrl: z.string().url(),
  domain: z.string().min(3).max(191).optional(),
  slug: z.string().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/).optional(),
  description: z.string().max(500).optional(),
  campaign: z.string().max(120).optional(),
  expiresAt: z.string().datetime().optional(),
  redirectType: z.enum(['TEMPORARY', 'PERMANENT']).default('TEMPORARY')
})

export const updateLinkSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  destinationUrl: z.string().url().optional(),
  domain: z.string().min(3).max(191).optional(),
  description: z.string().max(500).optional(),
  campaign: z.string().max(120).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  redirectType: z.enum(['TEMPORARY', 'PERMANENT']).optional()
})
