import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const userQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  role: z.string().optional(),
  department_id: z.string().optional(),
  is_active: z.string().optional(),
})

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department_id: z.string().min(1, 'Department is required'),
  team: z.string().optional(),
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
  entity_access: z.array(z.string()).optional().default([]),
  ai_permission_level: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      )
    }

    // Check if user is SUPER_ADMIN or ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can access user management',
          },
        },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validation = userQuerySchema.safeParse(query)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    const params = validation.data
    const page = parseInt(params.page)
    const limit = parseInt(params.limit)
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    if (params.role) {
      where.role = params.role
    }

    if (params.department_id) {
      where.department_id = params.department_id
    }

    if (params.is_active) {
      where.is_active = params.is_active === 'true'
    }

    // Fetch users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          entity_access: {
            include: {
              entity: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  country_flag_emoji: true,
                },
              },
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    // Calculate stats
    const stats = {
      total: await prisma.user.count(),
      active: await prisma.user.count({ where: { is_active: true } }),
      roles: 9, // Fixed number of roles
      pending_invites: 0, // Placeholder for future invite system
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          users,
          total,
          page,
          limit,
          stats,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List users error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching users',
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      )
    }

    // Check if user is SUPER_ADMIN or ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only administrators can create users',
          },
        },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createUserSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0].message,
            field: validation.error.errors[0].path[0],
          },
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'A user with this email already exists',
          },
        },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(data.password)

    // Create user in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          password_hash: passwordHash,
          department_id: data.department_id,
          team: data.team,
          role: data.role,
          ai_permission_level: data.ai_permission_level,
          is_active: true,
        },
      })

      // Create entity access
      if (data.entity_access && data.entity_access.length > 0) {
        await tx.userEntityAccess.createMany({
          data: data.entity_access.map((entity_id) => ({
            user_id: newUser.id,
            entity_id,
          })),
        })
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'user_created',
          module: 'User',
          affected_user_id: newUser.id,
          channel: 'WEB',
          success: true,
          new_value: {
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
          },
        },
      })

      return newUser
    })

    return NextResponse.json(
      {
        success: true,
        data: { user },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create user error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while creating user',
        },
      },
      { status: 500 }
    )
  }
}
