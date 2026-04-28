import { z } from 'zod'

export const createDomainSchema = z.object({
  hostname: z.string().min(3).max(191)
})

export const updateDomainStatusSchema = z.object({
  status: z.enum(['VERIFIED', 'DISABLED', 'PENDING'])
})
