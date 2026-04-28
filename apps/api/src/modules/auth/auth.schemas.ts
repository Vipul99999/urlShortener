import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(120).optional()
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100)
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(10)
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address')
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid token'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100)
})

export const resendVerificationSchema = z.object({
  email: z.string().email('Enter a valid email address')
})

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Invalid token')
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100)
})