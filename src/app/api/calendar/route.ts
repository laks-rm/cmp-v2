import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateNextOccurrence } from '@/lib/utils/frequency'
import { startOfDay } from 'date-fns'

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

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const entity_id = searchParams.get('entity_id')
    const source_id = searchParams.get('source_id')
    const department_id = searchParams.get('department_id')

    if (!from || !to) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'from and to date parameters are required',
          },
        },
        { status: 400 }
      )
    }

    const fromDate = startOfDay(new Date(from))
    const toDate = startOfDay(new Date(to))

    // Get user's accessible entities for scope filtering
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
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    const accessibleEntityIds = user.entity_access.map((ae) => ae.entity_id)

    // Build filter for user's entity access
    const entityFilter =
      user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
        ? entity_id
          ? { entity_id }
          : {}
        : {
            entity_id: entity_id
              ? { in: [entity_id, ...accessibleEntityIds] }
              : { in: accessibleEntityIds },
          }

    // 1. Fetch generated tasks (real TaskInstances)
    const generatedTasks = await prisma.taskInstance.findMany({
      where: {
        due_date: {
          gte: fromDate,
          lte: toDate,
        },
        ...entityFilter,
        ...(source_id ? { source_id } : {}),
        ...(department_id ? { department_id } : {}),
      },
      include: {
        source: {
          select: {
            code: true,
            title: true,
          },
        },
        clause: {
          select: {
            clause_number: true,
            title: true,
          },
        },
        entity: {
          select: {
            name: true,
            code: true,
            country_flag_emoji: true,
          },
        },
        pic_user: {
          select: {
            name: true,
          },
        },
      },
    })

    const formattedGeneratedTasks = generatedTasks.map((task) => ({
      id: task.id,
      task_code: task.task_code,
      title: task.title,
      due_date: task.due_date.toISOString().split('T')[0],
      status: task.status,
      priority: task.priority,
      entity: {
        name: task.entity.name,
        code: task.entity.code,
        country_flag_emoji: task.entity.country_flag_emoji,
      },
      source: {
        code: task.source.code,
        title: task.source.title,
      },
      clause: {
        clause_number: task.clause.clause_number,
        title: task.clause.title,
      },
      pic_user: task.pic_user
        ? {
            name: task.pic_user.name,
          }
        : null,
    }))

    // 2. Generate projected tasks (future occurrences from active templates)
    const activeTemplates = await prisma.taskTemplate.findMany({
      where: {
        is_active: true,
        next_due_date: {
          not: null,
        },
        frequency: {
          not: 'AD_HOC',
        },
        clause: {
          is_active: true,
          source: {
            status: 'ACTIVE',
            ...(source_id ? { id: source_id } : {}),
            ...(department_id ? { department_id } : {}),
          },
        },
      },
      include: {
        clause: {
          include: {
            source: {
              include: {
                entities_in_scope: {
                  where:
                    user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
                      ? entity_id
                        ? { entity_id }
                        : {}
                      : entity_id
                      ? { entity_id: { in: [entity_id, ...accessibleEntityIds] } }
                      : { entity_id: { in: accessibleEntityIds } },
                  include: {
                    entity: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        country_flag_emoji: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const projectedTasks: any[] = []

    for (const template of activeTemplates) {
      const source = template.clause.source

      for (const sourceEntity of source.entities_in_scope) {
        const entity = sourceEntity.entity

        // Starting from next_due_date, calculate up to 4 future occurrences
        let currentDueDate = template.next_due_date!
        let iterationCount = 0

        while (iterationCount < 4) {
          // Check if this due date falls within the requested range
          const dueDateObj = startOfDay(new Date(currentDueDate))
          if (dueDateObj >= fromDate && dueDateObj <= toDate) {
            projectedTasks.push({
              template_id: template.id,
              source_code: source.code,
              source_title: source.title,
              clause_number: template.clause.clause_number,
              clause_title: template.clause.title,
              task_title: template.title,
              entity_code: entity.code,
              entity_name: entity.name,
              entity_flag: entity.country_flag_emoji,
              projected_due_date: currentDueDate.toISOString().split('T')[0],
              frequency: template.frequency,
              priority: template.priority,
            })
          }

          // Calculate next occurrence
          const nextOccurrence = calculateNextOccurrence(dueDateObj, template.frequency)
          if (!nextOccurrence) break // ONE_TIME or AD_HOC

          currentDueDate = nextOccurrence
          iterationCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        generated_tasks: formattedGeneratedTasks,
        projected_tasks: projectedTasks,
        date_range: {
          from,
          to,
        },
      },
    })
  } catch (error) {
    console.error('Calendar API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}
