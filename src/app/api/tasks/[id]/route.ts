import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  due_date: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  pic_user_id: z.string().optional().nullable(),
  actual_outcome: z.string().max(5000).optional(),
})

const taskActionSchema = z.object({
  action: z.enum(['start', 'submit', 'approve', 'return', 'reject', 'close']),
  comment: z.string().optional(),
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

    // Fetch task with all relations
    const task = await prisma.taskInstance.findUnique({
      where: { id: params.id },
      include: {
        source: true,
        clause: true,
        entity: true,
        department: true,
        pic_user: true,
        reviewer_user: true,
        reviewed_by_user: true,
        task_template: true,
        evidence_files: {
          orderBy: {
            created_at: 'desc',
          },
        },
        comments: {
          include: {
            user: true,
          },
          orderBy: {
            created_at: 'asc',
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { task },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get task error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching task',
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

    // Parse and validate request body
    const body = await request.json()
    const validation = updateTaskSchema.safeParse(body)

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

    // Fetch existing task
    const existingTask = await prisma.taskInstance.findUnique({
      where: { id: params.id },
    })

    if (!existingTask) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      )
    }

    // Permission check: PIC can edit before submission, managers can always edit
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    const isPIC = existingTask.pic_user_id === decoded.userId
    const isManager = ['SUPER_ADMIN', 'ADMIN', 'CMP_MANAGER', 'DEPT_MANAGER'].includes(
      user?.role || ''
    )

    // PIC can only edit title/description/actual_outcome before submission
    if (isPIC && !isManager) {
      if (existingTask.status !== 'NOT_STARTED' && existingTask.status !== 'IN_PROGRESS' && existingTask.status !== 'RETURNED') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot edit task after submission',
            },
          },
          { status: 403 }
        )
      }

      // Only allow title, description, actual_outcome
      const allowedFields = ['title', 'description', 'actual_outcome']
      const requestedFields = Object.keys(validation.data)
      const unauthorized = requestedFields.filter((f) => !allowedFields.includes(f))

      if (unauthorized.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: `You can only edit: ${allowedFields.join(', ')}`,
            },
          },
          { status: 403 }
        )
      }
    } else if (!isManager) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to edit this task',
          },
        },
        { status: 403 }
      )
    }

    // Update task
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.taskInstance.update({
        where: { id: params.id },
        data: {
          ...validation.data,
          due_date: validation.data.due_date ? new Date(validation.data.due_date) : undefined,
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'task_updated',
          module: 'TaskInstance',
          task_instance_id: params.id,
          source_id: existingTask.source_id,
          channel: 'WEB',
          success: true,
          old_value: existingTask,
          new_value: validation.data,
        },
      })

      return updated
    })

    return NextResponse.json(
      {
        success: true,
        data: { task: updatedTask },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update task error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while updating task',
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

    // Parse and validate request body
    const body = await request.json()
    const validation = taskActionSchema.safeParse(body)

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

    const { action, comment } = validation.data

    // Fetch existing task
    const task = await prisma.taskInstance.findUnique({
      where: { id: params.id },
      include: {
        evidence_files: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      )
    }

    // Validate transitions and permissions
    let newStatus: string
    let requiresComment = false

    switch (action) {
      case 'start':
        if (task.status !== 'NOT_STARTED') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TRANSITION',
                message: 'Task can only be started from NOT_STARTED status',
              },
            },
            { status: 400 }
          )
        }
        if (task.pic_user_id !== decoded.userId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Only the assigned PIC can start this task',
              },
            },
            { status: 403 }
          )
        }
        newStatus = 'IN_PROGRESS'
        break

      case 'submit':
        if (!['IN_PROGRESS', 'RETURNED'].includes(task.status)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TRANSITION',
                message: 'Task can only be submitted from IN_PROGRESS or RETURNED status',
              },
            },
            { status: 400 }
          )
        }
        if (task.pic_user_id !== decoded.userId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Only the assigned PIC can submit this task',
              },
            },
            { status: 403 }
          )
        }
        // Check evidence requirement
        if (task.evidence_required && task.evidence_files.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'EVIDENCE_REQUIRED',
                message: 'Evidence is required. Please upload at least one file.',
              },
            },
            { status: 400 }
          )
        }
        newStatus = task.review_required ? 'PENDING_REVIEW' : 'APPROVED'
        break

      case 'approve':
        if (task.status !== 'PENDING_REVIEW') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TRANSITION',
                message: 'Task can only be approved from PENDING_REVIEW status',
              },
            },
            { status: 400 }
          )
        }
        if (task.reviewer_user_id !== decoded.userId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Only the assigned reviewer can approve this task',
              },
            },
            { status: 403 }
          )
        }
        newStatus = 'APPROVED'
        break

      case 'return':
        if (task.status !== 'PENDING_REVIEW') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TRANSITION',
                message: 'Task can only be returned from PENDING_REVIEW status',
              },
            },
            { status: 400 }
          )
        }
        if (task.reviewer_user_id !== decoded.userId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Only the assigned reviewer can return this task',
              },
            },
            { status: 403 }
          )
        }
        if (!comment) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'COMMENT_REQUIRED',
                message: 'Please provide feedback.',
              },
            },
            { status: 400 }
          )
        }
        newStatus = 'RETURNED'
        requiresComment = true
        break

      case 'reject':
        if (task.status !== 'PENDING_REVIEW') {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TRANSITION',
                message: 'Task can only be rejected from PENDING_REVIEW status',
              },
            },
            { status: 400 }
          )
        }
        if (task.reviewer_user_id !== decoded.userId) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Only the assigned reviewer can reject this task',
              },
            },
            { status: 403 }
          )
        }
        if (!comment) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'COMMENT_REQUIRED',
                message: 'Please provide feedback.',
              },
            },
            { status: 400 }
          )
        }
        newStatus = 'REJECTED'
        requiresComment = true
        break

      case 'close':
        if (!['APPROVED', 'REJECTED'].includes(task.status)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_TRANSITION',
                message: 'Task can only be closed from APPROVED or REJECTED status',
              },
            },
            { status: 400 }
          )
        }
        newStatus = 'CLOSED'
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: 'Invalid action',
            },
          },
          { status: 400 }
        )
    }

    // Update task status
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updates: any = {
        status: newStatus as any,
      }

      if (action === 'submit') {
        updates.submitted_at = new Date()
      }

      if (['approve', 'return', 'reject'].includes(action)) {
        updates.reviewed_at = new Date()
        updates.reviewed_by = decoded.userId
        updates.review_decision = action === 'approve' ? 'APPROVED' : action === 'return' ? 'RETURNED' : 'REJECTED'
        if (comment) {
          updates.review_comments = comment
        }
      }

      if (action === 'close') {
        updates.closed_at = new Date()
      }

      const updated = await tx.taskInstance.update({
        where: { id: params.id },
        data: updates,
      })

      // Add comment if provided
      if (comment && requiresComment) {
        await tx.comment.create({
          data: {
            task_instance_id: params.id,
            user_id: decoded.userId,
            text: comment,
          },
        })
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: `task_${action}`,
          module: 'TaskInstance',
          task_instance_id: params.id,
          source_id: task.source_id,
          channel: 'WEB',
          success: true,
          old_value: { status: task.status },
          new_value: { status: newStatus, action },
        },
      })

      // Create notification for relevant users
      if (action === 'submit' && task.reviewer_user_id) {
        await tx.notification.create({
          data: {
            user_id: task.reviewer_user_id,
            type: 'REVIEW_NEEDED',
            title: 'Task Ready for Review',
            message: `Task "${task.title}" has been submitted for your review`,
            link_url: `/tasks/${task.id}`,
            related_task_id: task.id,
            related_source_id: task.source_id,
          },
        })
      }

      if (['return', 'reject', 'approve'].includes(action) && task.pic_user_id) {
        await tx.notification.create({
          data: {
            user_id: task.pic_user_id,
            type: 'TASK_OVERDUE',
            title: `Task ${action === 'approve' ? 'Approved' : action === 'return' ? 'Returned' : 'Rejected'}`,
            message: `Task "${task.title}" has been ${action}ed`,
            link_url: `/tasks/${task.id}`,
            related_task_id: task.id,
            related_source_id: task.source_id,
          },
        })
      }

      return updated
    })

    return NextResponse.json(
      {
        success: true,
        data: { task: updatedTask },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Task action error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while processing action',
        },
      },
      { status: 500 }
    )
  }
}
