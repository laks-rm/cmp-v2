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

    // Fetch all groups with their entities
    const groups = await prisma.group.findMany({
      include: {
        entities: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Calculate performance stats for each group
    const groupStats = await Promise.all(
      groups.map(async (group) => {
        // Get all entities in this group
        const entityStats = await Promise.all(
          group.entities.map(async (entity) => {
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

            // Calculate compliance score
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

        // Aggregate group-level stats
        const groupTotalTasks = entityStats.reduce((sum, e) => sum + e.total_tasks, 0)
        const groupApprovedTasks = entityStats.reduce((sum, e) => sum + e.approved_count, 0)
        const groupOverdueTasks = entityStats.reduce((sum, e) => sum + e.overdue_count, 0)
        const groupPendingReviewTasks = entityStats.reduce(
          (sum, e) => sum + e.pending_review_count,
          0
        )
        const groupReturnedTasks = entityStats.reduce((sum, e) => sum + e.exception_count, 0)

        // Calculate group compliance score (average of entity scores)
        const groupComplianceScore =
          entityStats.length > 0
            ? Math.round(
                entityStats.reduce((sum, e) => sum + e.compliance_score, 0) / entityStats.length
              )
            : 100

        // Count unique sources across all entities
        const sourceIds = new Set<string>()
        await Promise.all(
          group.entities.map(async (entity) => {
            const sources = await prisma.source.findMany({
              where: {
                entities_in_scope: {
                  some: {
                    entity_id: entity.id,
                  },
                },
                status: 'ACTIVE',
              },
              select: {
                id: true,
              },
            })
            sources.forEach((s) => sourceIds.add(s.id))
          })
        )

        return {
          group_id: group.id,
          group_name: group.name,
          group_code: group.code,
          group_emoji: '🌍',
          compliance_score: groupComplianceScore,
          source_count: sourceIds.size,
          total_tasks: groupTotalTasks,
          approved_count: groupApprovedTasks,
          overdue_count: groupOverdueTasks,
          pending_review_count: groupPendingReviewTasks,
          exception_count: groupReturnedTasks,
          entity_count: entityStats.length,
          entities: entityStats,
        }
      })
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          groups: groupStats,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get group monitoring error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching group monitoring data',
        },
      },
      { status: 500 }
    )
  }
}
