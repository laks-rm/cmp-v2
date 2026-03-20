import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const taskQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  entity_id: z.string().optional(),
  department_id: z.string().optional(),
  source_id: z.string().optional(),
  clause_id: z.string().optional(),
  pic_user_id: z.string().optional(),
  reviewer_user_id: z.string().optional(),
  assignment_status: z.string().optional(),
  evidence_status: z.string().optional(),
  due_date_from: z.string().optional(),
  due_date_to: z.string().optional(),
  overdue: z.string().optional(),
  review_required: z.string().optional(),
  sort_by: z.string().optional().default('due_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
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
    const validation = taskQuerySchema.safeParse(query)

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

    // Get user's entity access scope
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
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

    // Build where clause
    const where: any = {}

    // Entity access scope filter
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      const accessibleEntityIds = user.entity_access.map((ea) => ea.entity_id)
      if (accessibleEntityIds.length > 0) {
        where.entity_id = { in: accessibleEntityIds }
      } else {
        // No entity access - return empty
        return NextResponse.json({
          success: true,
          data: {
            tasks: [],
            total: 0,
            page,
            limit,
          },
        })
      }
    }

    // Search filter
    if (params.search) {
      where.OR = [
        { task_code: { contains: params.search, mode: 'insensitive' } },
        { title: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    // Status filter
    if (params.status) {
      where.status = params.status
    }

    // Priority filter
    if (params.priority) {
      where.priority = params.priority
    }

    // Entity filter
    if (params.entity_id) {
      where.entity_id = params.entity_id
    }

    // Department filter
    if (params.department_id) {
      where.department_id = params.department_id
    }

    // Source filter
    if (params.source_id) {
      where.source_id = params.source_id
    }

    // Clause filter
    if (params.clause_id) {
      where.clause_id = params.clause_id
    }

    // PIC filter
    if (params.pic_user_id) {
      where.pic_user_id = params.pic_user_id
    }

    // Reviewer filter
    if (params.reviewer_user_id) {
      where.reviewer_user_id = params.reviewer_user_id
    }

    // Assignment status filter
    if (params.assignment_status) {
      where.assignment_status = params.assignment_status
    }

    // Evidence status filter
    if (params.evidence_status) {
      where.evidence_status = params.evidence_status
    }

    // Due date range filter
    if (params.due_date_from || params.due_date_to) {
      where.due_date = {}
      if (params.due_date_from) {
        where.due_date.gte = new Date(params.due_date_from)
      }
      if (params.due_date_to) {
        where.due_date.lte = new Date(params.due_date_to)
      }
    }

    // Overdue filter
    if (params.overdue === 'true') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.due_date = { lt: today }
      where.status = { in: ['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE'] }
    }

    // Review required filter
    if (params.review_required === 'true') {
      where.review_required = true
    }

    // Build order by
    const orderBy: any = {}
    orderBy[params.sort_by] = params.sort_order

    // Fetch tasks
    const [tasks, total] = await Promise.all([
      prisma.taskInstance.findMany({
        where,
        include: {
          source: {
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
          clause: {
            select: {
              id: true,
              clause_number: true,
              title: true,
            },
          },
          entity: {
            select: {
              id: true,
              name: true,
              code: true,
              country_flag_emoji: true,
            },
          },
          pic_user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewer_user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.taskInstance.count({ where }),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          tasks,
          total,
          page,
          limit,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List tasks error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching tasks',
        },
      },
      { status: 500 }
    )
  }
}
