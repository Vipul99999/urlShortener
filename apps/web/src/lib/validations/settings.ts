import { z } from 'zod'

export const apiKeyScopeValues = [
  'links:read',
  'links:write',
  'analytics:read',
  'tags:read',
  'tags:write',
  'exports:read',
  'exports:write'
] as const

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be under 120 characters'),
  avatarUrl: z
    .string()
    .url('Avatar URL must be a valid URL')
    .or(z.literal(''))
})

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(120, 'Workspace name must be under 120 characters'),
  brandingTitle: z
    .string()
    .max(120, 'Branding title must be under 120 characters')
    .or(z.literal(''))
})

export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(2, 'API key name must be at least 2 characters')
    .max(100, 'API key name must be under 100 characters'),
  scopes: z
    .array(z.enum(apiKeyScopeValues))
    .min(1, 'Choose at least one scope')
})
