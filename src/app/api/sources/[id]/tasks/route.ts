import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

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

    // Fetch task instances for this source
    const tasks = await prisma.taskInstance.findMany({
      where: {
        source_id: params.id,
      },
      include: {
        clause: true,
        entity: true,
        pic_user: true,
        task_template: true,
      },
      orderBy: {
        due_date: 'asc',
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: { tasks },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Fetch tasks error:', error)

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
