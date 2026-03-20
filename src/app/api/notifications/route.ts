import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const markReadSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
}).refine((data) => data.ids || data.all, {
  message: 'Either ids or all must be provided',
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

    // Fetch notifications for user
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          user_id: decoded.userId,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 20,
      }),
      prisma.notification.count({
        where: {
          user_id: decoded.userId,
          is_read: false,
        },
      }),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications,
          unread_count: unreadCount,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get notifications error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching notifications',
        },
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const validation = markReadSchema.safeParse(body)

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

    // Build where clause
    const where: any = {
      user_id: decoded.userId,
      is_read: false,
    }

    if (data.ids) {
      where.id = { in: data.ids }
    }

    // Mark notifications as read
    const result = await prisma.notification.updateMany({
      where,
      data: {
        is_read: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          updated_count: result.count,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Mark notifications read error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating notifications',
        },
      },
      { status: 500 }
    )
  }
}
