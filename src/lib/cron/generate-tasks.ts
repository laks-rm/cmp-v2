import prisma from '@/lib/prisma'
import { addDays, format, startOfDay } from 'date-fns'
import { calculateNextOccurrence, calculatePeriodForDate } from '@/lib/utils/frequency'

interface TaskGenerationResult {
  tasks_created: number
  tasks_skipped: number
  errors: string[]
}

/**
 * Generate task code (T-00001 format)
 */
async function generateTaskCode(tx: any): Promise<string> {
  const lastTask = await tx.taskInstance.findFirst({
    orderBy: { task_code: 'desc' },
    select: { task_code: true },
  })

  const lastNumber = lastTask ? parseInt(lastTask.task_code.split('-')[1] || '0') : 0
  const nextNumber = lastNumber + 1
  return `T-${nextNumber.toString().padStart(5, '0')}`
}

/**
 * Determine PIC based on assignment logic
 */
function determinePIC(
  assignmentLogic: string,
  sourcePIC: string | null,
  departmentId: string
): string | null {
  switch (assignmentLogic) {
    case 'FIXED_PIC':
      return sourcePIC
    case 'DEPARTMENT_QUEUE':
      return null // Unassigned, will be picked up from queue
    case 'ROUND_ROBIN':
      // TODO: Implement round-robin logic in future (requires tracking last assigned user)
      return null
    case 'MANUAL':
      return null
    default:
      return null
  }
}

/**
 * Determine reviewer based on reviewer logic
 */
function determineReviewer(
  reviewerLogic: string | null,
  sourceReviewer: string | null,
  departmentManagerId: string | null
): string | null {
  if (!reviewerLogic) return null

  switch (reviewerLogic) {
    case 'SOURCE_REVIEWER':
      return sourceReviewer
    case 'DEPT_MANAGER':
      return departmentManagerId
    case 'FIXED_USER':
      return sourceReviewer // Fallback to source reviewer for now
    case 'ROUND_ROBIN':
      // TODO: Implement round-robin logic
      return sourceReviewer
    default:
      return null
  }
}

/**
 * Main task generation function — anchor-based
 */
export async function generateTasks(): Promise<TaskGenerationResult> {
  const result: TaskGenerationResult = { tasks_created: 0, tasks_skipped: 0, errors: [] }
  const today = startOfDay(new Date())

  console.log(`🚀 Task generation started — ${format(today, 'yyyy-MM-dd')}`)

  try {
    // Query templates where next_due_date is today or in the past (catch-up for missed days)
    // AND template is active, clause is active, source is ACTIVE
    // AND frequency is not AD_HOC
    const templates = await prisma.taskTemplate.findMany({
      where: {
        is_active: true,
        next_due_date: {
          lte: today, // Due today or overdue (catch-up)
          not: null,
        },
        frequency: { not: 'AD_HOC' },
        clause: {
          is_active: true,
          source: { status: 'ACTIVE' },
        },
      },
      include: {
        clause: {
          include: {
            source: {
              include: {
                entities_in_scope: { include: { entity: true } },
                department: true,
                pic_user: true,
                reviewer_user: true,
              },
            },
          },
        },
      },
    })

    return await processTemplates(templates, result, today)
  } catch (error) {
    const msg = `Fatal: ${error instanceof Error ? error.message : 'Unknown'}`
    console.error(`💥 ${msg}`)
    result.errors.push(msg)
  }

  return result
}

/**
 * Generate tasks for a specific source only
 */
export async function generateTasksForSource(sourceId: string): Promise<TaskGenerationResult> {
  const result: TaskGenerationResult = { tasks_created: 0, tasks_skipped: 0, errors: [] }
  const today = startOfDay(new Date())

  console.log(`🚀 Task generation started for source ${sourceId} — ${format(today, 'yyyy-MM-dd')}`)

  try {
    // Query templates for this specific source
    const templates = await prisma.taskTemplate.findMany({
      where: {
        source_id: sourceId,
        is_active: true,
        next_due_date: {
          lte: today,
          not: null,
        },
        frequency: { not: 'AD_HOC' },
        clause: {
          is_active: true,
          source: { status: 'ACTIVE' },
        },
      },
      include: {
        clause: {
          include: {
            source: {
              include: {
                entities_in_scope: { include: { entity: true } },
                department: true,
                pic_user: true,
                reviewer_user: true,
              },
            },
          },
        },
      },
    })

    return await processTemplates(templates, result, today)
  } catch (error) {
    const msg = `Fatal: ${error instanceof Error ? error.message : 'Unknown'}`
    console.error(`💥 ${msg}`)
    result.errors.push(msg)
  }

  return result
}

/**
 * Shared logic to process templates and generate tasks
 */
async function processTemplates(
  templates: any[],
  result: TaskGenerationResult,
  today: Date
): Promise<TaskGenerationResult> {
  console.log(`📋 Found ${templates.length} templates ready for generation`)

  for (const template of templates) {
    const source = template.clause.source

    try {
      const dueDate = template.next_due_date!
      const { period_start, period_end } = calculatePeriodForDate(dueDate, template.frequency)

      console.log(
        `✅ Processing: "${template.title}" (${template.frequency}) — due ${format(dueDate, 'yyyy-MM-dd')}`
      )

        // Generate one task per entity in scope
        for (const sourceEntity of source.entities_in_scope) {
          const entity = sourceEntity.entity

          // Idempotency: check if task already exists for this template + period + entity
          const existing = await prisma.taskInstance.findFirst({
            where: {
              task_template_id: template.id,
              period_start: period_start,
              entity_id: entity.id,
            },
          })

          if (existing) {
            console.log(
              `⏭️  Already exists: ${template.title} / ${entity.code} / ${format(period_start, 'yyyy-MM-dd')}`
            )
            result.tasks_skipped++
            continue
          }

          // Determine PIC and reviewer
          const pic_user_id = determinePIC(
            template.assignment_logic,
            source.pic_user_id,
            source.department_id
          )
          const reviewer_user_id = template.review_required
            ? determineReviewer(template.reviewer_logic, source.reviewer_user_id, null)
            : null

          // Create task with retry for task_code collision
          let created = false
          for (let attempt = 0; attempt < 3 && !created; attempt++) {
            try {
              await prisma.$transaction(async (tx) => {
                const task_code = await generateTaskCode(tx)

                const task = await tx.taskInstance.create({
                  data: {
                    task_code,
                    task_template_id: template.id,
                    clause_id: template.clause_id,
                    source_id: source.id,
                    title: template.title,
                    description: template.description,
                    entity_id: entity.id,
                    department_id: source.department_id,
                    pic_user_id,
                    reviewer_user_id,
                    status: 'NOT_STARTED',
                    assignment_status: pic_user_id ? 'ASSIGNED' : 'UNASSIGNED',
                    period_start,
                    period_end,
                    due_date: dueDate,
                    priority: template.priority,
                    review_required: template.review_required,
                    evidence_required: template.evidence_required,
                    evidence_status: template.evidence_required ? 'MISSING' : 'NOT_REQUIRED',
                    expected_outcome: template.expected_outcome,
                    reminder_sent_dates: [],
                  },
                })

                await tx.auditLog.create({
                  data: {
                    action_type: 'task_created',
                    module: 'TaskInstance',
                    task_instance_id: task.id,
                    source_id: source.id,
                    entity_id: entity.id,
                    department_id: source.department_id,
                    channel: 'CRON',
                    success: true,
                    new_value: {
                      task_code: task.task_code,
                      title: task.title,
                      entity: entity.code,
                      due_date: format(dueDate, 'yyyy-MM-dd'),
                    },
                  },
                })

                console.log(
                  `✨ Created ${task.task_code} for ${entity.code} (due: ${format(dueDate, 'yyyy-MM-dd')})`
                )
                result.tasks_created++
                created = true
              })
            } catch (err: any) {
              if (err.code === 'P2002' && attempt < 2) {
                await new Promise((r) => setTimeout(r, 100))
              } else {
                throw err
              }
            }
          }
        }

        // Advance next_due_date to the next occurrence
        const nextDue = calculateNextOccurrence(dueDate, template.frequency)

        await prisma.taskTemplate.update({
          where: { id: template.id },
          data: {
            next_due_date: nextDue,
            // For ONE_TIME: deactivate the template
            ...(template.frequency === 'ONE_TIME' ? { is_active: false } : {}),
          },
        })

        if (nextDue) {
          console.log(`📅 Next due for "${template.title}": ${format(nextDue, 'yyyy-MM-dd')}`)
        } else {
          console.log(`🔒 Template "${template.title}" completed (${template.frequency})`)
        }
      }
    } catch (error) {
      const msg = `Failed: template ${template.id} — ${error instanceof Error ? error.message : 'Unknown'}`
      console.error(`❌ ${msg}`)
      result.errors.push(msg)
    }
  }

  console.log(
    `\n📊 Summary: ${result.tasks_created} created, ${result.tasks_skipped} skipped, ${result.errors.length} errors`
  )

  return result
}
