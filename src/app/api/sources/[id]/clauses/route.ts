import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { createClauseSchema } from '@/lib/validators/clause'
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

    // Verify source access
    const source = await prisma.source.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!source) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } },
        { status: 404 }
      )
    }

    // Fetch clauses with task templates
    const clauses = await prisma.clause.findMany({
      where: {
        source_id: params.id,
        is_active: true,
      },
      include: {
        task_templates: {
          where: { is_active: true },
          orderBy: { sequence_order: 'asc' },
        },
      },
      orderBy: { sequence_order: 'asc' },
    })

    return NextResponse.json(
      { success: true, data: { clauses } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get clauses error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while fetching clauses' } },
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
    const validation = createClauseSchema.safeParse(body)
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

    // Fetch source
    const source = await prisma.source.findUnique({
      where: { id: params.id },
      select: { id: true, version_number: true },
    })

    if (!source) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Source not found' } },
        { status: 404 }
      )
    }

    // Check if clause_number is unique within source+version
    const existingClause = await prisma.clause.findFirst({
      where: {
        source_id: params.id,
        source_version: source.version_number,
        clause_number: validation.data.clause_number,
      },
    })

    if (existingClause) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DUPLICATE',
            message: 'Clause number already exists in this source',
            field: 'clause_number',
          },
        },
        { status: 409 }
      )
    }

    // Get max sequence_order
    const maxSequence = await prisma.clause.findFirst({
      where: {
        source_id: params.id,
        source_version: source.version_number,
      },
      orderBy: { sequence_order: 'desc' },
      select: { sequence_order: true },
    })

    const sequence_order = (maxSequence?.sequence_order || 0) + 1

    // Create clause
    const clause = await prisma.$transaction(async (tx) => {
      const newClause = await tx.clause.create({
        data: {
          source_id: params.id,
          source_version: source.version_number,
          clause_number: validation.data.clause_number,
          title: validation.data.title,
          description: validation.data.description,
          sequence_order,
          is_active: validation.data.is_active ?? true,
          ai_generated: validation.data.ai_generated ?? false,
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'clause_created',
          module: 'Clause',
          source_id: params.id,
          clause_id: newClause.id,
          channel: 'WEB',
          success: true,
          new_value: newClause,
        },
      })

      return newClause
    })

    return NextResponse.json(
      { success: true, data: { clause } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create clause error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred while creating clause' } },
      { status: 500 }
    )
  }
}
