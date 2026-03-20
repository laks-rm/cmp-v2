import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { sourceService } from '@/lib/services/source.service'
import { updateSourceSchema } from '@/lib/validators/source'

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

    // Fetch source
    const source = await sourceService.getSource(params.id, decoded.userId)

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Source not found or access denied',
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: { source },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get source error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching source',
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

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = updateSourceSchema.partial().safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0].message,
            field: validation.error.errors[0].path[0],
          },
        },
        { status: 400 }
      )
    }

    // Get current source to check status change
    const currentSource = await sourceService.getSource(params.id, decoded.userId)
    if (!currentSource) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Source not found or access denied',
          },
        },
        { status: 404 }
      )
    }

    const oldStatus = currentSource.status
    const newStatus = validation.data.status

    // Update source
    const source = await sourceService.updateSource(params.id, validation.data, decoded.userId)

    // If status changed to ACTIVE, trigger task generation
    if (newStatus === 'ACTIVE' && oldStatus !== 'ACTIVE') {
      console.log(`🚀 Source status changed to ACTIVE, triggering task generation for ${params.id}`)
      
      // Run task generation in the background without blocking the response
      setImmediate(async () => {
        try {
          const { generateTasksForSource } = await import('@/lib/cron/generate-tasks')
          const taskGenResult = await generateTasksForSource(params.id)
          console.log(
            `✅ Task generation complete: ${taskGenResult.tasks_created} tasks created, ${taskGenResult.tasks_skipped} skipped`
          )
        } catch (error) {
          console.error('Task generation error (non-blocking):', error)
        }
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: { source },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update source error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while updating source',
        },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Archive source
    const result = await sourceService.archiveSource(params.id, decoded.userId)

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Archive source error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while archiving source',
        },
      },
      { status: 500 }
    )
  }
}
