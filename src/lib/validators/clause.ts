import { z } from 'zod'

// Create clause schema
export const createClauseSchema = z.object({
  clause_number: z.string().min(1, 'Clause number is required').max(50),
  title: z.string().min(3, 'Title must be at least 3 characters').max(300),
  description: z.string().max(5000).optional(),
  is_active: z.boolean().optional().default(true),
  ai_generated: z.boolean().optional().default(false),
})

// Update clause schema (partial)
export const updateClauseSchema = createClauseSchema.partial()

// Reorder clauses schema
export const reorderClausesSchema = z.array(
  z.object({
    id: z.string().uuid(),
    sequence_order: z.number().int().positive(),
  })
)

export type CreateClauseInput = z.infer<typeof createClauseSchema>
export type UpdateClauseInput = z.infer<typeof updateClauseSchema>
export type ReorderClausesInput = z.infer<typeof reorderClausesSchema>
