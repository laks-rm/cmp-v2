import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subDays, startOfDay, format } from 'date-fns'

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

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Fetch all dashboard data in parallel
    const [
      activeSources,
      tasksCompletedThisMonth,
      overdueTasks,
      pendingReviewTasks,
      entitiesMonitored,
      allTasks,
      entities,
      recentActivity,
    ] = await Promise.all([
      // Active sources count
      prisma.source.count({
        where: { status: 'ACTIVE' },
      }),

      // Tasks completed this month
      prisma.taskInstance.count({
        where: {
          status: 'APPROVED',
          reviewed_at: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),

      // Overdue tasks
      prisma.taskInstance.count({
        where: { status: 'OVERDUE' },
      }),

      // Pending review tasks
      prisma.taskInstance.count({
        where: {
          status: {
            in: ['PENDING_REVIEW', 'RETURNED'],
          },
        },
      }),

      // Active entities count
      prisma.entity.count({
        where: { is_active: true },
      }),

      // All tasks for breakdown
      prisma.taskInstance.findMany({
        select: {
          status: true,
          created_at: true,
        },
      }),

      // Top 5 entities by task count
      prisma.entity.findMany({
        where: { is_active: true },
        include: {
          task_instances: {
            select: {
              status: true,
              due_date: true,
            },
          },
        },
        take: 100, // Get all, will sort and limit after calculation
      }),

      // Recent activity (last 10 audit logs)
      prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: 10,
      }),
    ])

    // Task breakdown
    const taskBreakdown = {
      completed: allTasks.filter((t) => t.status === 'APPROVED').length,
      in_progress: allTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      pending_review: allTasks.filter((t) =>
        ['PENDING_REVIEW', 'RETURNED'].includes(t.status)
      ).length,
      overdue: allTasks.filter((t) => t.status === 'OVERDUE').length,
      not_started: allTasks.filter((t) => t.status === 'NOT_STARTED').length,
    }

    // Entity performance (top 5 by task count with scores)
    const entityPerformance = entities
      .map((entity) => {
        const tasks = entity.task_instances
        const totalTasks = tasks.length
        const approvedTasks = tasks.filter((t) => t.status === 'APPROVED').length
        const dueTasks = tasks.filter(
          (t) => t.due_date && new Date(t.due_date) <= now
        ).length
        const complianceScore =
          dueTasks > 0 ? Math.round((approvedTasks / dueTasks) * 100) : 100

        return {
          entity_id: entity.id,
          entity_name: entity.name,
          entity_code: entity.code,
          country_flag_emoji: entity.country_flag_emoji,
          task_count: totalTasks,
          compliance_score: complianceScore,
        }
      })
      .sort((a, b) => b.task_count - a.task_count)
      .slice(0, 5)

    // Weekly activity (last 5 business days)
    const weeklyActivity = []
    for (let i = 4; i >= 0; i--) {
      const date = startOfDay(subDays(now, i))
      const nextDate = startOfDay(subDays(now, i - 1))

      const created = allTasks.filter((t) => {
        const createdAt = new Date(t.created_at)
        return createdAt >= date && createdAt < nextDate
      }).length

      const completed = allTasks.filter((t) => {
        const createdAt = new Date(t.created_at)
        return (
          t.status === 'APPROVED' &&
          createdAt >= date &&
          createdAt < nextDate
        )
      }).length

      weeklyActivity.push({
        date: format(date, 'MMM dd'),
        created,
        completed,
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          stats: {
            active_sources_count: activeSources,
            tasks_completed_count: tasksCompletedThisMonth,
            overdue_count: overdueTasks,
            pending_review_count: pendingReviewTasks,
            entities_monitored_count: entitiesMonitored,
          },
          task_breakdown: taskBreakdown,
          entity_performance: entityPerformance,
          recent_activity: recentActivity,
          weekly_activity: weeklyActivity,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get dashboard error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching dashboard data',
        },
      },
      { status: 500 }
    )
  }
}
