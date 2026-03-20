import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { calculateSLA } from '@/lib/utils/sla'

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

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    // Parse filter from query params
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'pending'

    // Build where clause based on role and filter
    const where: any = {}

    // Status filter
    if (filter === 'pending') {
      where.status = 'PENDING_REVIEW'
    } else if (filter === 'returned') {
      where.status = 'RETURNED'
    } else if (filter === 'approved') {
      where.status = 'APPROVED'
      where.reviewed_at = {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      }
    }

    // Reviewer filter: assigned to this user OR user is CMP_MANAGER/ADMIN
    const isManager = ['SUPER_ADMIN', 'ADMIN', 'CMP_MANAGER'].includes(user.role)
    if (!isManager) {
      where.reviewer_user_id = decoded.userId
    }

    // Fetch tasks
    const tasks = await prisma.taskInstance.findMany({
      where,
      include: {
        source: {
          select: {
            id: true,
            code: true,
            title: true,
            version_number: true,
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
        evidence_files: {
          select: {
            id: true,
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        // SLA breached tasks first (will be sorted by submitted_at in client)
        { submitted_at: 'asc' },
      ],
    })

    // Calculate SLA for each task
    const tasksWithSLA = tasks.map((task) => {
      const sla = task.submitted_at ? calculateSLA(task.submitted_at) : null

      return {
        ...task,
        evidence_count: task.evidence_files.length,
        comment_count: task.comments.length,
        sla,
        // Remove the full arrays to reduce payload size
        evidence_files: undefined,
        comments: undefined,
      }
    })

    // Sort: SLA breached first, then oldest first
    tasksWithSLA.sort((a, b) => {
      // Breached tasks first
      if (a.sla?.is_breached && !b.sla?.is_breached) return -1
      if (!a.sla?.is_breached && b.sla?.is_breached) return 1

      // Then by submission time (oldest first)
      if (a.submitted_at && b.submitted_at) {
        return a.submitted_at.getTime() - b.submitted_at.getTime()
      }

      return 0
    })

    // Calculate stats
    const stats = {
      pending: await prisma.taskInstance.count({
        where: {
          status: 'PENDING_REVIEW',
          ...(isManager ? {} : { reviewer_user_id: decoded.userId }),
        },
      }),
      returned: await prisma.taskInstance.count({
        where: {
          status: 'RETURNED',
          ...(isManager ? {} : { reviewer_user_id: decoded.userId }),
        },
      }),
      approved_last_7d: await prisma.taskInstance.count({
        where: {
          status: 'APPROVED',
          reviewed_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          ...(isManager ? {} : { reviewed_by: decoded.userId }),
        },
      }),
      sla_breach: tasksWithSLA.filter((t) => t.sla?.is_breached).length,
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          tasks: tasksWithSLA,
          stats,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Review queue error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching review queue',
        },
      },
      { status: 500 }
    )
  }
}
