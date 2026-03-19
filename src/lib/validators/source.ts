import { z } from 'zod'

// Enums matching Prisma schema
export const sourceTypeEnum = z.enum([
  'REGULATION',
  'INTERNAL_AUDIT',
  'EXTERNAL_AUDIT',
  'POLICY',
  'SOP',
  'OTHER',
])

export const sourceCategoryEnum = z.enum([
  'AML',
  'SANCTIONS',
  'REGULATORY_REPORTING',
  'LICENSE',
  'DATA_PROTECTION',
  'CONSUMER_PROTECTION',
  'IT_SECURITY',
  'GOVERNANCE',
  'OTHER',
])

export const sourceStatusEnum = z.enum([
  'DRAFT',
  'ACTIVE',
  'PENDING_ASSIGNMENT',
  'INACTIVE',
  'ARCHIVED',
])

export const riskLevelEnum = z.enum(['HIGH', 'MEDIUM', 'LOW', 'NOT_ASSESSED'])

// Create source schema
export const createSourceSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  source_type: sourceTypeEnum,
  category: sourceCategoryEnum,
  description: z.string().max(5000).optional(),
  department_id: z.string().uuid('Invalid department ID'),
  effective_from: z.string().or(z.date()),
  effective_to: z.string().or(z.date()).optional().nullable(),
  pic_user_id: z.string().uuid().optional().nullable(),
  reviewer_user_id: z.string().uuid().optional().nullable(),
  risk_level: riskLevelEnum.optional().default('NOT_ASSESSED'),
  tags: z.array(z.string()).optional().default([]),
  reference_document_url: z.string().url().optional().nullable(),
  status: sourceStatusEnum.optional().default('DRAFT'),
  entity_ids: z.array(z.string().uuid()).min(1, 'At least one entity is required'),
})

// Update source schema (all fields optional except id)
export const updateSourceSchema = createSourceSchema.partial().extend({
  id: z.string().uuid(),
})

// Query schema for list endpoint
export const sourceQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
  status: sourceStatusEnum.optional(),
  source_type: sourceTypeEnum.optional(),
  category: sourceCategoryEnum.optional(),
  department_id: z.string().uuid().optional(),
  entity_id: z.string().uuid().optional(),
  risk_level: riskLevelEnum.optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'title', 'code', 'effective_from']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type CreateSourceInput = z.infer<typeof createSourceSchema>
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>
export type SourceQueryInput = z.infer<typeof sourceQuerySchema>
