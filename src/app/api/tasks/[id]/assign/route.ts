import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const assignSchema = z.object({
  pic_user_id: z.string().optional(),
})

export async function POST(
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

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: true,
      },
    })

    if (!currentUser) {
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

    // Parse request body
    const body = await request.json()
    const validation = assignSchema.safeParse(body)

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
    const isSelfAssign = !data.pic_user_id
    const targetUserId = data.pic_user_id || decoded.userId

    // Fetch task
    const task = await prisma.taskInstance.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        pic_user: true,
        entity: true,
        source: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      )
    }

    // Check if task can be assigned
    if (['APPROVED', 'CLOSED'].includes(task.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TASK_LOCKED',
            message: 'Cannot assign a task that is approved or closed',
          },
        },
        { status: 400 }
      )
    }

    // Self-assign validation
    if (isSelfAssign) {
      // Task must be unassigned
      if (task.assignment_status !== 'UNASSIGNED') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TASK_ALREADY_ASSIGNED',
              message: task.pic_user
                ? `This task was already assigned to ${task.pic_user.name}`
                : 'This task has already been assigned',
            },
          },
          { status: 409 }
        )
      }

      // User must be in task's department
      if (task.department_id !== currentUser.department_id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'WRONG_DEPARTMENT',
              message: 'You can only self-assign tasks from your department',
            },
          },
          { status: 403 }
        )
      }
    } else {
      // Manager assignment validation
      const isManager = ['DEPT_MANAGER', 'CMP_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(
        currentUser.role
      )

      if (!isManager) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Only managers can assign tasks to others',
            },
          },
          { status: 403 }
        )
      }

      // Verify target user exists and is in the same department
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      })

      if (!targetUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'TARGET_USER_NOT_FOUND',
              message: 'Target user not found',
            },
          },
          { status: 404 }
        )
      }

      if (targetUser.department_id !== task.department_id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'WRONG_DEPARTMENT',
              message: 'Cannot assign to user from different department',
            },
          },
          { status: 400 }
        )
      }
    }

    // Determine if this is a reassignment
    const isReassignment = task.assignment_status !== 'UNASSIGNED'
    const oldPicUserId = task.pic_user_id

    // Perform assignment with optimistic concurrency control
    const result = await prisma.$transaction(async (tx) => {
      // For self-assign: use optimistic update with WHERE clause
      if (isSelfAssign) {
        const updateResult = await tx.taskInstance.updateMany({
          where: {
            id: params.id,
            assignment_status: 'UNASSIGNED', // Critical: only update if still unassigned
          },
          data: {
            pic_user_id: targetUserId,
            assignment_status: 'ASSIGNED',
          },
        })

        // If count is 0, someone else grabbed it
        if (updateResult.count === 0) {
          throw new Error('CONCURRENT_ASSIGNMENT')
        }
      } else {
        // For manager assignment: direct update (no race condition)
        await tx.taskInstance.update({
          where: { id: params.id },
          data: {
            pic_user_id: targetUserId,
            assignment_status: isReassignment ? 'REASSIGNED' : 'ASSIGNED',
          },
        })
      }

      // Fetch updated task
      const updatedTask = await tx.taskInstance.findUnique({
        where: { id: params.id },
        include: {
          pic_user: true,
          department: true,
          entity: true,
          source: true,
        },
      })

      if (!updatedTask) {
        throw new Error('Task not found after update')
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: isReassignment ? 'task_reassigned' : 'task_assigned',
          module: 'TaskInstance',
          task_instance_id: params.id,
          source_id: task.source_id,
          channel: 'WEB',
          success: true,
          old_value: oldPicUserId ? { pic_user_id: oldPicUserId } : undefined,
          new_value: { pic_user_id: targetUserId },
        },
      })

      // Send notification to new PIC
      await tx.notification.create({
        data: {
          user_id: targetUserId,
          type: 'TASK_ASSIGNED',
          title: isReassignment
            ? 'Task reassigned to you'
            : isSelfAssign
            ? 'You claimed a task'
            : 'New task assigned to you',
          message: `Task "${task.title}" for ${task.entity.name} has been assigned to you`,
          link_url: `/tasks/${task.id}`,
          related_task_id: task.id,
          related_source_id: task.source_id,
          is_read: false,
        },
      })

      // If reassignment, notify old PIC
      if (isReassignment && oldPicUserId && oldPicUserId !== targetUserId) {
        await tx.notification.create({
          data: {
            user_id: oldPicUserId,
            type: 'TASK_ASSIGNED',
            title: 'Task reassigned',
            message: `Task "${task.title}" has been reassigned to ${updatedTask.pic_user?.name}`,
            link_url: `/tasks/${task.id}`,
            related_task_id: task.id,
            related_source_id: task.source_id,
            is_read: false,
          },
        })
      }

      return updatedTask
    })

    return NextResponse.json(
      {
        success: true,
        data: { task: result },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Assign task error:', error)

    // Handle concurrent assignment error
    if (error instanceof Error && error.message === 'CONCURRENT_ASSIGNMENT') {
      // Fetch task again to get who assigned it
      const task = await prisma.taskInstance.findUnique({
        where: { id: params.id },
        include: {
          pic_user: true,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TASK_ALREADY_ASSIGNED',
            message: task?.pic_user
              ? `This task was already assigned to ${task.pic_user.name}. Please refresh to see changes.`
              : 'This task has already been assigned. Please refresh to see changes.',
          },
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while assigning task',
        },
      },
      { status: 500 }
    )
  }
}
