import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { createTemplateSchema } from '@/lib/validators/task-template'
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

    // Fetch templates
    const templates = await prisma.taskTemplate.findMany({
      where: {
        clause_id: params.clauseId,
        source_id: params.id,
      },
      orderBy: { sequence_order: 'asc' },
    })

    return NextResponse.json(
      { success: true, data: { templates } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const validation = createTemplateSchema.safeParse(body)
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

    // Get max sequence_order
    const maxSequence = await prisma.taskTemplate.findFirst({
      where: {
        clause_id: params.clauseId,
      },
      orderBy: { sequence_order: 'desc' },
      select: { sequence_order: true },
    })

    const sequence_order = (maxSequence?.sequence_order || 0) + 1

    // Create template
    const template = await prisma.$transaction(async (tx) => {
      const newTemplate = await tx.taskTemplate.create({
        data: {
          clause_id: params.clauseId,
          source_id: params.id,
          title: validation.data.title,
          description: validation.data.description,
          frequency: validation.data.frequency,
          frequency_config: validation.data.frequency_config,
          due_date_offset_days: validation.data.due_date_offset_days,
          review_required: validation.data.review_required,
          reviewer_logic: validation.data.reviewer_logic,
          evidence_required: validation.data.evidence_required,
          evidence_description: validation.data.evidence_description,
          expected_outcome: validation.data.expected_outcome,
          priority: validation.data.priority || 'MEDIUM',
          assignment_logic: validation.data.assignment_logic || 'DEPARTMENT_QUEUE',
          reminder_days_before: validation.data.reminder_days_before || [],
          escalation_days_after: validation.data.escalation_days_after,
          escalation_to: validation.data.escalation_to,
          is_active: validation.data.is_active ?? true,
          ai_generated: validation.data.ai_generated ?? false,
          sequence_order,
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'template_created',
          module: 'TaskTemplate',
          source_id: params.id,
          clause_id: params.clauseId,
          channel: 'WEB',
          success: true,
          new_value: newTemplate,
        },
      })

      return newTemplate
    })

    return NextResponse.json(
      { success: true, data: { template } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}
