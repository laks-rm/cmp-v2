import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createCommentSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment must be 5000 characters or less'),
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

    try {
      verifyAccessToken(token)
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

    // Fetch comments
    const comments = await prisma.comment.findMany({
      where: {
        task_instance_id: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: { comments },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get comments error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching comments',
        },
      },
      { status: 500 }
    )
  }
}

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

    // Parse and validate request body
    const body = await request.json()
    const validation = createCommentSchema.safeParse(body)

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

    // Get task
    const task = await prisma.taskInstance.findUnique({
      where: { id: params.id },
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

    // Create comment
    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          task_instance_id: params.id,
          user_id: decoded.userId,
          text: validation.data.text,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'comment_added',
          module: 'Comment',
          task_instance_id: params.id,
          source_id: task.source_id,
          channel: 'WEB',
          success: true,
        },
      })

      return newComment
    })

    return NextResponse.json(
      {
        success: true,
        data: { comment },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create comment error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while creating comment',
        },
      },
      { status: 500 }
    )
  }
}
