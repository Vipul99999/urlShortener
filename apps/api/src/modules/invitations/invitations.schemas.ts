import { z } from 'zod'

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER'])
})

export const acceptInvitationSchema = z.object({
  token: z.string().min(10)
})

export const previewInvitationSchema = z.object({
  token: z.string().min(10)
})
