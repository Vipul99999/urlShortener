import { z } from 'zod'

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).optional()
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(20).optional()
})

export const attachTagSchema = z.object({
  tagId: z.string().uuid()
})