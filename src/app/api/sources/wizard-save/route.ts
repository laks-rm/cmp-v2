import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

interface WizardClause {
  clause_number: string
  title: string
  description?: string
  is_active?: boolean
  ai_generated?: boolean
  task_templates: WizardTemplate[]
}

interface WizardTemplate {
  title: string
  description?: string
  frequency: string
  frequency_config?: any
  due_date_offset_days: number
  first_execution_date: string
  review_required: boolean
  reviewer_logic?: string | null
  evidence_required: boolean
  evidence_description?: string | null
  expected_outcome?: string | null
  priority?: string
  assignment_logic?: string
  reminder_days_before?: number[]
  escalation_days_after?: number | null
  escalation_to?: string | null
  is_active?: boolean
  ai_generated?: boolean
}

export async function POST(request: NextRequest) {
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
    const { source, clauses, status } = body

    // Validate minimum requirements
    if (!source || !source.title || !source.source_type || !source.department_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Source title, type, and department are required',
          },
        },
        { status: 400 }
      )
    }

    if (!source.entity_ids || source.entity_ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one entity is required',
          },
        },
        { status: 400 }
      )
    }

    // Validate foreign keys exist
    const [department, entities] = await Promise.all([
      prisma.department.findUnique({
        where: { id: source.department_id },
        select: { id: true },
      }),
      prisma.entity.findMany({
        where: { id: { in: source.entity_ids } },
        select: { id: true },
      }),
    ])

    if (!department) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid department selected',
          },
        },
        { status: 400 }
      )
    }

    if (entities.length !== source.entity_ids.length) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'One or more selected entities are invalid',
          },
        },
        { status: 400 }
      )
    }

    // Validate clause numbers are unique
    if (clauses && Array.isArray(clauses)) {
      const clauseNumbers = clauses.map((c: WizardClause) => c.clause_number?.trim()).filter(Boolean)
      const uniqueClauseNumbers = new Set(clauseNumbers)
      if (clauseNumbers.length !== uniqueClauseNumbers.size) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Duplicate clause numbers detected. Each clause must have a unique clause number.',
            },
          },
          { status: 400 }
        )
      }
    }

    // Bulk save in single transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate source code
      const lastSource = await tx.source.findFirst({
        orderBy: { code: 'desc' },
        select: { code: true },
      })

      const lastNumber = lastSource ? parseInt(lastSource.code.split('-')[1] || '0') : 0
      const nextNumber = lastNumber + 1
      const code = `SRC-${nextNumber.toString().padStart(3, '0')}`

      // 2. Create source
      const newSource = await tx.source.create({
        data: {
          code,
          title: source.title,
          source_type: source.source_type,
          category: source.category,
          description: source.description,
          department_id: source.department_id,
          effective_from: new Date(source.effective_from),
          effective_to: source.effective_to ? new Date(source.effective_to) : null,
          pic_user_id: source.pic_user_id,
          reviewer_user_id: source.reviewer_user_id,
          risk_level: source.risk_level || 'NOT_ASSESSED',
          tags: source.tags || [],
          reference_document_url: source.reference_document_url,
          status: status || 'DRAFT',
          version_number: 1,
          created_by: decoded.userId,
        },
      })

      // 3. Create entity associations
      if (source.entity_ids && source.entity_ids.length > 0) {
        await tx.sourceEntity.createMany({
          data: source.entity_ids.map((entity_id: string) => ({
            source_id: newSource.id,
            entity_id,
          })),
        })
      }

      // 4. Create clauses and templates
      let clausesCreated = 0
      let templatesCreated = 0

      if (clauses && Array.isArray(clauses)) {
        for (let i = 0; i < clauses.length; i++) {
          const clauseData = clauses[i] as WizardClause

          // Create clause
          const newClause = await tx.clause.create({
            data: {
              source_id: newSource.id,
              source_version: 1,
              clause_number: clauseData.clause_number,
              title: clauseData.title,
              description: clauseData.description,
              sequence_order: i + 1,
              is_active: clauseData.is_active ?? true,
              ai_generated: clauseData.ai_generated ?? false,
            },
          })

          clausesCreated++

          // Create task templates for this clause
          if (clauseData.task_templates && Array.isArray(clauseData.task_templates)) {
            for (let j = 0; j < clauseData.task_templates.length; j++) {
              const templateData = clauseData.task_templates[j] as WizardTemplate

              await tx.taskTemplate.create({
                data: {
                  clause_id: newClause.id,
                  source_id: newSource.id,
                  title: templateData.title,
                  description: templateData.description,
                  frequency: templateData.frequency as any,
                  frequency_config: templateData.frequency_config,
                  due_date_offset_days: templateData.due_date_offset_days || 0,
                  first_execution_date: new Date(templateData.first_execution_date),
                  next_due_date: new Date(templateData.first_execution_date),
                  review_required: templateData.review_required,
                  reviewer_logic: templateData.reviewer_logic as any,
                  evidence_required: templateData.evidence_required,
                  evidence_description: templateData.evidence_description,
                  expected_outcome: templateData.expected_outcome,
                  priority: (templateData.priority || 'MEDIUM') as any,
                  assignment_logic: (templateData.assignment_logic || 'DEPARTMENT_QUEUE') as any,
                  reminder_days_before: templateData.reminder_days_before || [],
                  escalation_days_after: templateData.escalation_days_after,
                  escalation_to: templateData.escalation_to,
                  is_active: templateData.is_active ?? true,
                  ai_generated: templateData.ai_generated ?? false,
                  sequence_order: j + 1,
                },
              })

              templatesCreated++
            }
          }
        }
      }

      // 5. Write audit logs
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'source_created',
          module: 'Source',
          source_id: newSource.id,
          channel: 'WEB',
          success: true,
          new_value: {
            code: newSource.code,
            title: newSource.title,
            status: newSource.status,
          },
        },
      })

      if (clausesCreated > 0) {
        await tx.auditLog.create({
          data: {
            user_id: decoded.userId,
            action_type: 'clauses_created',
            module: 'Clause',
            source_id: newSource.id,
            channel: 'WEB',
            success: true,
            metadata: {
              count: clausesCreated,
            },
          },
        })
      }

      if (templatesCreated > 0) {
        await tx.auditLog.create({
          data: {
            user_id: decoded.userId,
            action_type: 'templates_created',
            module: 'TaskTemplate',
            source_id: newSource.id,
            channel: 'WEB',
            success: true,
            metadata: {
              count: templatesCreated,
            },
          },
        })
      }

      return {
        source_id: newSource.id,
        code: newSource.code,
        status: newSource.status,
        stats: {
          clauses_created: clausesCreated,
          templates_created: templatesCreated,
        },
      }
    })

    // If source is ACTIVE, trigger task generation immediately
    if (source.status === 'ACTIVE') {
      console.log(`🚀 Source activated, triggering immediate task generation for ${result.source_id}`)
      try {
        const { generateTasksForSource } = await import('@/lib/cron/generate-tasks')
        const taskGenResult = await generateTasksForSource(result.source_id)
        console.log(
          `✅ Task generation complete: ${taskGenResult.tasks_created} tasks created, ${taskGenResult.tasks_skipped} skipped`
        )
      } catch (error) {
        console.error('Task generation error (non-blocking):', error)
        // Don't fail the source creation if task generation fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Wizard save error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while saving wizard data',
        },
      },
      { status: 500 }
    )
  }
}
