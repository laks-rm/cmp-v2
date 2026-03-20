import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    // Fetch all entities with their groups
    const entities = await prisma.entity.findMany({
      include: {
        group: true,
      },
      orderBy: [
        { group: { name: 'asc' } },
        { name: 'asc' },
      ],
    })

    // Calculate performance stats for each entity
    const entityStats = await Promise.all(
      entities.map(async (entity) => {
        // Count sources
        const sourceCount = await prisma.source.count({
          where: {
            entities_in_scope: {
              some: {
                entity_id: entity.id,
              },
            },
            status: 'ACTIVE',
          },
        })

        // Get all tasks for this entity
        const tasks = await prisma.taskInstance.findMany({
          where: {
            entity_id: entity.id,
          },
          select: {
            status: true,
            due_date: true,
          },
        })

        const totalTasks = tasks.length
        const approvedTasks = tasks.filter((t) => t.status === 'APPROVED').length
        const overdueTasks = tasks.filter((t) => t.status === 'OVERDUE').length
        const openTasks = tasks.filter((t) =>
          ['NOT_STARTED', 'IN_PROGRESS'].includes(t.status)
        ).length
        const pendingReviewTasks = tasks.filter((t) =>
          ['PENDING_REVIEW', 'RETURNED'].includes(t.status)
        ).length
        const returnedTasks = tasks.filter((t) => t.status === 'RETURNED').length

        // Calculate compliance score (approved / total due tasks)
        const dueTasks = tasks.filter(
          (t) => t.due_date && new Date(t.due_date) <= new Date()
        ).length
        const complianceScore =
          dueTasks > 0 ? Math.round((approvedTasks / dueTasks) * 100) : 100

        return {
          entity_id: entity.id,
          entity_code: entity.code,
          entity_name: entity.name,
          legal_name: entity.name,
          country_flag_emoji: entity.country_flag_emoji,
          group_id: entity.group.id,
          group_name: entity.group.name,
          group_emoji: '🌍',
          compliance_score: complianceScore,
          source_count: sourceCount,
          total_tasks: totalTasks,
          approved_count: approvedTasks,
          overdue_count: overdueTasks,
          open_task_count: openTasks,
          pending_review_count: pendingReviewTasks,
          exception_count: returnedTasks,
        }
      })
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          entities: entityStats,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get entity monitoring error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching entity monitoring data',
        },
      },
      { status: 500 }
    )
  }
}
