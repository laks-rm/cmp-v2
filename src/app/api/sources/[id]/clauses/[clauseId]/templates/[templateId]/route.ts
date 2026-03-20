import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { updateTemplateSchema } from '@/lib/validators/task-template'
import prisma from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string; templateId: string } }
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

    // Fetch template
    const template = await prisma.taskTemplate.findFirst({
      where: {
        id: params.templateId,
        clause_id: params.clauseId,
        source_id: params.id,
      },
    })

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: { template } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get template error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string; templateId: string } }
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
    const validation = updateTemplateSchema.safeParse(body)
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

    // Fetch existing template
    const existingTemplate = await prisma.taskTemplate.findFirst({
      where: {
        id: params.templateId,
        clause_id: params.clauseId,
        source_id: params.id,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      )
    }

    // Update template
    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.taskTemplate.update({
        where: { id: params.templateId },
        data: {
          title: validation.data.title,
          description: validation.data.description,
          frequency: validation.data.frequency as any,
          frequency_config: validation.data.frequency_config as any,
          due_date_offset_days: validation.data.due_date_offset_days,
          review_required: validation.data.review_required,
          reviewer_logic: validation.data.reviewer_logic as any,
          evidence_required: validation.data.evidence_required,
          evidence_description: validation.data.evidence_description,
          expected_outcome: validation.data.expected_outcome,
          priority: validation.data.priority as any,
          assignment_logic: validation.data.assignment_logic as any,
          reminder_days_before: validation.data.reminder_days_before,
          escalation_days_after: validation.data.escalation_days_after,
          escalation_to: validation.data.escalation_to,
          is_active: validation.data.is_active,
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'template_updated',
          module: 'TaskTemplate',
          source_id: params.id,
          clause_id: params.clauseId,
          channel: 'WEB',
          success: true,
          old_value: existingTemplate,
          new_value: validation.data,
        },
      })

      return updated
    })

    return NextResponse.json(
      { success: true, data: { template } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string; templateId: string } }
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

    // Fetch source
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
            message: 'Cannot delete template from active source. Deactivate instead.',
          },
        },
        { status: 403 }
      )
    }

    // Hard delete (only for Draft sources)
    await prisma.$transaction(async (tx) => {
      await tx.taskTemplate.delete({
        where: { id: params.templateId },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'template_deleted',
          module: 'TaskTemplate',
          source_id: params.id,
          clause_id: params.clauseId,
          channel: 'WEB',
          success: true,
        },
      })
    })

    return NextResponse.json(
      { success: true, message: 'Template deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; clauseId: string; templateId: string } }
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
    const template = await prisma.$transaction(async (tx) => {
      const updated = await tx.taskTemplate.update({
        where: { id: params.templateId },
        data: { is_active: body.is_active },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: body.is_active ? 'template_reactivated' : 'template_deactivated',
          module: 'TaskTemplate',
          source_id: params.id,
          clause_id: params.clauseId,
          channel: 'WEB',
          success: true,
        },
      })

      return updated
    })

    return NextResponse.json(
      { success: true, data: { template } },
      { status: 200 }
    )
  } catch (error) {
    console.error('Toggle template error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}
