import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  department_id: z.string().optional(),
  team: z.string().optional(),
  role: z
    .enum([
      'SUPER_ADMIN',
      'ADMIN',
      'CMP_MANAGER',
      'DEPT_MANAGER',
      'REVIEWER',
      'PIC',
      'READ_ONLY',
      'AI_ACTION_USER',
      'AI_READ_ONLY',
    ])
    .optional(),
  entity_access: z.array(z.string()).optional(),
  ai_permission_level: z.string().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
            message: 'Only administrators can access user details',
          },
        },
        { status: 403 }
      )
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        entity_access: {
          include: {
            entity: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { user },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user',
        },
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
            message: 'Only administrators can update users',
          },
        },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateUserSchema.safeParse(body)

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

    const data = validation.data

    // Fetch existing user
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    // Update user in transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: params.id },
        data: {
          name: data.name,
          email: data.email,
          department_id: data.department_id,
          team: data.team,
          role: data.role,
          ai_permission_level: data.ai_permission_level,
        },
      })

      // Update entity access if provided
      if (data.entity_access !== undefined) {
        // Delete existing access
        await tx.userEntityAccess.deleteMany({
          where: { user_id: params.id },
        })

        // Create new access
        if (data.entity_access.length > 0) {
          await tx.userEntityAccess.createMany({
            data: data.entity_access.map((entity_id) => ({
              user_id: params.id,
              entity_id,
            })),
          })
        }
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'user_updated',
          module: 'User',
          affected_user_id: params.id,
          channel: 'WEB',
          success: true,
          old_value: existingUser,
          new_value: data,
        },
      })

      return updated
    })

    return NextResponse.json(
      {
        success: true,
        data: { user: updatedUser },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update user error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while updating user',
        },
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
            message: 'Only administrators can activate/deactivate users',
          },
        },
        { status: 403 }
      )
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    // If deactivating, check for active tasks
    if (user.is_active) {
      const activeTasks = await prisma.taskInstance.count({
        where: {
          pic_user_id: params.id,
          status: {
            in: ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW'],
          },
        },
      })

      if (activeTasks > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'HAS_ACTIVE_TASKS',
              message: `User has ${activeTasks} active tasks. Please reassign tasks before deactivating.`,
              active_tasks: activeTasks,
            },
          },
          { status: 400 }
        )
      }
    }

    // Toggle is_active
    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: params.id },
        data: {
          is_active: !user.is_active,
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: user.is_active ? 'user_deactivated' : 'user_activated',
          module: 'User',
          affected_user_id: params.id,
          channel: 'WEB',
          success: true,
          old_value: { is_active: user.is_active },
          new_value: { is_active: !user.is_active },
        },
      })

      return updated
    })

    return NextResponse.json(
      {
        success: true,
        data: { user: updatedUser },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Toggle user status error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while updating user status',
        },
      },
      { status: 500 }
    )
  }
}
