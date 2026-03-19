import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { updateClauseSchema } from '@/lib/validators/clause'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    try {
      verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Fetch clause with task templates
    const clause = await prisma.clause.findFirst({
      where: {
        id: params.clauseId,
        source_id: params.id,
      },
      include: {
        task_templates: {
          orderBy: { sequence_order: 'asc' },
        },
      },
    })

    if (!clause) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Clause not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: { clause } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get clause error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = updateClauseSchema.safeParse(body)
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

    // Fetch existing clause
    const existingClause = await prisma.clause.findFirst({
      where: {
        id: params.clauseId,
        source_id: params.id,
      },
    })

    if (!existingClause) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Clause not found' } },
        { status: 404 }
      )
    }

    // Update clause
    const clause = await prisma.$transaction(async (tx) => {
      const updated = await tx.clause.update({
        where: { id: params.clauseId },
        data: validation.data,
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'clause_updated',
          module: 'Clause',
          source_id: params.id,
          clause_id: params.clauseId,
          channel: 'WEB',
          success: true,
          old_value: existingClause,
          new_value: validation.data,
        },
      })

      return updated
    })

    return NextResponse.json(
      { success: true, data: { clause } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update clause error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Fetch source and clause
    const source = await prisma.source.findUnique({
      where: { id: params.id },
      select: { status: true },
    })

    if (!source) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } },
        { status: 404 }
      )
    }

    // If source is Active, block deletion
    if (source.status === 'ACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete clause from active source. Deactivate instead.',
          },
        },
        { status: 403 }
      )
    }

    // Hard delete (only for Draft sources)
    await prisma.$transaction(async (tx) => {
      // Delete task templates first (cascade)
      await tx.taskTemplate.deleteMany({
        where: { clause_id: params.clauseId },
      })

      // Delete clause
      await tx.clause.delete({
        where: { id: params.clauseId },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'clause_deleted',
          module: 'Clause',
          source_id: params.id,
          clause_id: params.clauseId,
          channel: 'WEB',
          success: true,
        },
      })
    })

    return NextResponse.json(
      { success: true, message: 'Clause deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete clause error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Toggle is_active
    const clause = await prisma.$transaction(async (tx) => {
      const updated = await tx.clause.update({
        where: { id: params.clauseId },
        data: { is_active: body.is_active },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: body.is_active ? 'clause_reactivated' : 'clause_deactivated',
          module: 'Clause',
          source_id: params.id,
          clause_id: params.clauseId,
          channel: 'WEB',
          success: true,
        },
      })

      return updated
    })

    return NextResponse.json(
      { success: true, data: { clause } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Toggle clause error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}
