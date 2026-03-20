import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const auditQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('50'),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  user_id: z.string().optional(),
  action_type: z.string().optional(),
  module: z.string().optional(),
  channel: z.string().optional(),
  source_id: z.string().optional(),
  task_instance_id: z.string().optional(),
  entity_id: z.string().optional(),
  department_id: z.string().optional(),
  success: z.string().optional(),
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const query = Object.fromEntries(searchParams.entries())
    const validation = auditQuerySchema.safeParse(query)

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

    // Date range filter
    if (params.date_from || params.date_to) {
      where.timestamp = {}
      if (params.date_from) {
        where.timestamp.gte = new Date(params.date_from)
      }
      if (params.date_to) {
        where.timestamp.lte = new Date(params.date_to)
      }
    }

    // User filter
    if (params.user_id) {
      where.user_id = params.user_id
    }

    // Action type filter
    if (params.action_type) {
      where.action_type = params.action_type
    }

    // Module filter
    if (params.module) {
      where.module = params.module
    }

    // Channel filter
    if (params.channel) {
      where.channel = params.channel
    }

    // Source filter
    if (params.source_id) {
      where.source_id = params.source_id
    }

    // Task filter
    if (params.task_instance_id) {
      where.task_instance_id = params.task_instance_id
    }

    // Entity filter
    if (params.entity_id) {
      where.entity_id = params.entity_id
    }

    // Department filter
    if (params.department_id) {
      where.department_id = params.department_id
    }

    // Success filter
    if (params.success) {
      where.success = params.success === 'true'
    }

    // Search filter
    if (params.search) {
      where.OR = [
        { action_type: { contains: params.search, mode: 'insensitive' } },
        { user: { name: { contains: params.search, mode: 'insensitive' } } },
      ]
    }

    // Fetch audit logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          source: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
          task_instance: {
            select: {
              id: true,
              task_code: true,
              title: true,
            },
          },
          entity: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          logs,
          total,
          page,
          limit,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Audit logs error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching audit logs',
        },
      },
      { status: 500 }
    )
  }
}
