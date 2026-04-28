import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(120)
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  brandingTitle: z.string().min(1).max(120).optional()
})