import { z } from 'zod'

export const createLinkFormSchema = z.object({
  title: z
    .string()
    .max(160, 'Title must be under 160 characters')
    .optional()
    .or(z.literal('')),
  destinationUrl: z
    .string()
    .min(1, 'Destination URL is required')
    .url('Enter a valid URL starting with http:// or https://'),
  domain: z
    .string()
    .min(1, 'Select a domain')
    .max(191, 'Domain must be under 191 characters'),
  slug: z
    .string()
    .regex(/^[A-Za-z0-9_-]*$/, 'Slug can only contain letters, numbers, hyphens, and underscores')
    .max(80, 'Slug must be under 80 characters')
    .optional()
    .or(z.literal('')),
  campaign: z
    .string()
    .max(120, 'Campaign must be under 120 characters')
    .optional()
    .or(z.literal(''))
})

export const createTagFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(50, 'Tag name must be under 50 characters'),
  color: z
    .string()
    .min(1, 'Color is required')
    .max(20, 'Color must be under 20 characters')
})
