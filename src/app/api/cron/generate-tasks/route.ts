import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { generateTasks } from '@/lib/cron/generate-tasks'

export async function POST(request: NextRequest) {
  try {
    // Check for cron secret key (for production cloud scheduler)
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      console.log('✅ Authenticated via cron secret')
      
      const result = await generateTasks()
      
      return NextResponse.json(
        {
          success: true,
          data: result,
        },
        { status: 200 }
      )
    }

    // Otherwise, require SUPER_ADMIN or ADMIN role
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required. Use cron secret header or admin JWT token.',
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

    // Check if user is SUPER_ADMIN or ADMIN
    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only SUPER_ADMIN or ADMIN can manually trigger task generation',
          },
        },
        { status: 403 }
      )
    }

    console.log(`✅ Authenticated as ${decoded.role} (user: ${decoded.userId})`)

    // Run task generation
    const result = await generateTasks()

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Task generation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred during task generation',
        },
      },
      { status: 500 }
    )
  }
}
