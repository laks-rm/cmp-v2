import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[0-9])(?=.*[!@#$%^&*])/,
      'Password must contain at least one number and one special character'
    ),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  department_id: z.string().uuid('Invalid department ID'),
  role: z.enum([
    'SUPER_ADMIN',
    'ADMIN',
    'CMP_MANAGER',
    'DEPT_MANAGER',
    'REVIEWER',
    'PIC',
    'READ_ONLY',
    'AI_ACTION_USER',
    'AI_READ_ONLY',
  ]),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
