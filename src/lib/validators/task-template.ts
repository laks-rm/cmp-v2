import { z } from 'zod'

// Enums
export const taskFrequencyEnum = z.enum([
  'DAILY',
  'WEEKLY',
  'BI_WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUALLY',
  'ANNUALLY',
  'ONE_TIME',
  'AD_HOC',
])

export const reviewerLogicEnum = z.enum([
  'FIXED_USER',
  'SOURCE_REVIEWER',
  'DEPT_MANAGER',
  'ROUND_ROBIN',
])

export const assignmentLogicEnum = z.enum([
  'FIXED_PIC',
  'DEPARTMENT_QUEUE',
  'ROUND_ROBIN',
  'MANUAL',
])

export const priorityEnum = z.enum(['HIGH', 'MEDIUM', 'LOW'])

// Create task template schema
export const createTemplateSchema = z
  .object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(300),
    description: z.string().max(5000).optional(),
    frequency: taskFrequencyEnum,
    frequency_config: z.record(z.any()).optional().nullable(),
    due_date_offset_days: z.number().int().min(0, 'Due date offset must be 0 or more').default(0),
    first_execution_date: z.string().optional(),
    review_required: z.boolean(),
    reviewer_logic: reviewerLogicEnum.optional().nullable(),
    evidence_required: z.boolean(),
    evidence_description: z.string().max(5000).optional().nullable(),
    expected_outcome: z.string().max(5000).optional().nullable(),
    priority: priorityEnum.optional().default('MEDIUM'),
    assignment_logic: assignmentLogicEnum.optional().default('DEPARTMENT_QUEUE'),
    reminder_days_before: z.array(z.number().int().positive()).optional().default([]),
    escalation_days_after: z.number().int().positive().optional().nullable(),
    escalation_to: z.string().optional().nullable(),
    is_active: z.boolean().optional().default(true),
    ai_generated: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      // If review_required is true, reviewer_logic must be set
      if (data.review_required && !data.reviewer_logic) {
        return false
      }
      return true
    },
    {
      message: 'Reviewer logic is required when review is required',
      path: ['reviewer_logic'],
    }
  )
  .refine(
    (data) => {
      // If escalation_days_after is set, escalation_to must be set
      if (data.escalation_days_after && data.escalation_days_after > 0 && !data.escalation_to) {
        return false
      }
      return true
    },
    {
      message: 'Escalation target is required when escalation days are set',
      path: ['escalation_to'],
    }
  )

// Update template schema (make base schema fields optional, then apply same refinements)
const baseTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less').optional(),
  frequency: taskFrequencyEnum,
  frequency_config: z.record(z.any()).optional(),
  due_date_offset_days: z.number().int().positive('Due date offset must be a positive number'),
  review_required: z.boolean(),
  reviewer_logic: reviewerLogicEnum.optional().nullable(),
  evidence_required: z.boolean(),
  evidence_description: z.string().max(1000).optional().nullable(),
  expected_outcome: z.string().max(2000).optional().nullable(),
  priority: priorityEnum.default('MEDIUM'),
  assignment_logic: assignmentLogicEnum.default('DEPARTMENT_QUEUE'),
  reminder_days_before: z.array(z.number().int().positive()).default([]),
  escalation_days_after: z.number().int().positive().optional().nullable(),
  escalation_to: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  ai_generated: z.boolean().default(false),
})

export const updateTemplateSchema = baseTemplateSchema.partial()

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>
