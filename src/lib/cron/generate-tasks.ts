import prisma from '@/lib/prisma'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addDays,
  differenceInWeeks,
  differenceInMonths,
  isFirstDayOfMonth,
  isMonday,
  format,
} from 'date-fns'

interface TaskGenerationResult {
  tasks_created: number
  tasks_skipped: number
  errors: string[]
}

/**
 * Calculate period start and end dates based on frequency
 */
function calculatePeriod(frequency: string, referenceDate: Date = new Date()): {
  period_start: Date
  period_end: Date
  shouldGenerate: boolean
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (frequency) {
    case 'DAILY':
      return {
        period_start: today,
        period_end: today,
        shouldGenerate: true, // Generate every day
      }

    case 'WEEKLY':
      return {
        period_start: startOfWeek(today, { weekStartsOn: 1 }), // Monday
        period_end: endOfWeek(today, { weekStartsOn: 1 }),
        shouldGenerate: isMonday(today), // Only generate on Mondays
      }

    case 'BI_WEEKLY': {
      // Calculate bi-weekly periods starting from a reference date (e.g., Jan 1, 2024)
      const referenceStart = new Date(2024, 0, 1) // Jan 1, 2024 (Monday)
      const weeksSinceReference = differenceInWeeks(today, referenceStart)
      const biWeeklyPeriod = Math.floor(weeksSinceReference / 2)
      const periodStart = addDays(referenceStart, biWeeklyPeriod * 14)
      
      return {
        period_start: periodStart,
        period_end: addDays(periodStart, 13),
        shouldGenerate: today.getTime() === periodStart.getTime(),
      }
    }

    case 'MONTHLY':
      return {
        period_start: startOfMonth(today),
        period_end: endOfMonth(today),
        shouldGenerate: isFirstDayOfMonth(today),
      }

    case 'QUARTERLY':
      return {
        period_start: startOfQuarter(today),
        period_end: endOfQuarter(today),
        shouldGenerate: today.getDate() === 1 && [0, 3, 6, 9].includes(today.getMonth()),
      }

    case 'SEMI_ANNUALLY': {
      const month = today.getMonth()
      const year = today.getFullYear()
      const isFirstHalf = month < 6
      
      return {
        period_start: new Date(year, isFirstHalf ? 0 : 6, 1),
        period_end: new Date(year, isFirstHalf ? 5 : 11, isFirstHalf ? 30 : 31),
        shouldGenerate: today.getDate() === 1 && (month === 0 || month === 6),
      }
    }

    case 'ANNUALLY':
      return {
        period_start: startOfYear(today),
        period_end: endOfYear(today),
        shouldGenerate: today.getDate() === 1 && today.getMonth() === 0, // Jan 1
      }

    case 'ONE_TIME':
      // For one-time tasks, use the source's effective_from date
      return {
        period_start: referenceDate,
        period_end: referenceDate,
        shouldGenerate: true, // Will be checked against template is_active
      }

    default:
      return {
        period_start: today,
        period_end: today,
        shouldGenerate: false,
      }
  }
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
 * Main task generation function
 */
export async function generateTasks(): Promise<TaskGenerationResult> {
  const result: TaskGenerationResult = {
    tasks_created: 0,
    tasks_skipped: 0,
    errors: [],
  }

  console.log('🚀 Starting task generation...')
  console.log(`📅 Date: ${format(new Date(), 'yyyy-MM-dd')}`)

  try {
    // Query all active task templates with active clauses and active sources
    const templates = await prisma.taskTemplate.findMany({
      where: {
        is_active: true,
        frequency: {
          not: 'AD_HOC', // Exclude ad-hoc tasks
        },
        clause: {
          is_active: true,
          source: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        clause: {
          include: {
            source: {
              include: {
                entities_in_scope: {
                  include: {
                    entity: true,
                  },
                },
                department: true,
                pic_user: true,
                reviewer_user: true,
              },
            },
          },
        },
      },
    })

    console.log(`📋 Found ${templates.length} active templates to process`)

    // Process each template
    for (const template of templates) {
      const source = template.clause.source

      try {
        // Calculate period for this frequency
        const { period_start, period_end, shouldGenerate } = calculatePeriod(
          template.frequency,
          new Date(source.effective_from)
        )

        if (!shouldGenerate) {
          console.log(
            `⏭️  Skipping template ${template.id} (${template.frequency}): Not the first day of period`
          )
          continue
        }

        console.log(
          `✅ Processing template: ${template.title} (${template.frequency}) for source: ${source.code}`
        )

        // For ONE_TIME tasks, deactivate the template after generation
        let shouldDeactivate = false
        if (template.frequency === 'ONE_TIME') {
          // Check if already generated
          const existingOneTime = await prisma.taskInstance.findFirst({
            where: {
              task_template_id: template.id,
            },
          })

          if (existingOneTime) {
            console.log(`⏭️  ONE_TIME task already generated for template ${template.id}`)
            result.tasks_skipped++
            continue
          }

          shouldDeactivate = true
        }

        // Generate tasks for each entity in scope
        for (const sourceEntity of source.entities_in_scope) {
          const entity = sourceEntity.entity

          // Idempotency check
          const existingTask = await prisma.taskInstance.findFirst({
            where: {
              task_template_id: template.id,
              period_start: period_start,
              entity_id: entity.id,
            },
          })

          if (existingTask) {
            console.log(
              `⏭️  Task already exists for template ${template.id}, entity ${entity.code}, period ${format(period_start, 'yyyy-MM-dd')}`
            )
            result.tasks_skipped++
            continue
          }

          // Calculate due date
          const due_date = addDays(period_start, template.due_date_offset_days)

          // Determine assignments
          const pic_user_id = determinePIC(
            template.assignment_logic,
            source.pic_user_id,
            source.department_id
          )
          const reviewer_user_id = template.review_required
            ? determineReviewer(template.reviewer_logic, source.reviewer_user_id, null)
            : null

          // Create task in transaction with retry logic for race conditions
          let retries = 0
          const maxRetries = 3
          let taskCreated = false

          while (!taskCreated && retries < maxRetries) {
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
                    due_date,
                    priority: template.priority,
                    review_required: template.review_required,
                    evidence_required: template.evidence_required,
                    evidence_status: template.evidence_required ? 'MISSING' : 'NOT_REQUIRED',
                    expected_outcome: template.expected_outcome,
                    reminder_sent_dates: [],
                  },
                })

                // Write audit log
                await tx.auditLog.create({
                  data: {
                    action_type: 'task_created',
                    module: 'TaskInstance',
                    task_instance_id: task.id,
                    source_id: source.id,
                    entity_id: entity.id,
                    department_id: source.department_id,
                    channel: 'SYSTEM',
                    success: true,
                    new_value: {
                      task_code: task.task_code,
                      title: task.title,
                      entity: entity.code,
                      due_date: format(due_date, 'yyyy-MM-dd'),
                    },
                  },
                })

                console.log(
                  `✨ Created task ${task.task_code} for entity ${entity.code} (due: ${format(due_date, 'yyyy-MM-dd')})`
                )
                result.tasks_created++
                taskCreated = true
              })
            } catch (error: any) {
              if (error.code === 'P2002' && retries < maxRetries - 1) {
                console.log(
                  `⚠️  Task code collision detected, retrying (attempt ${retries + 1}/${maxRetries})...`
                )
                retries++
                await new Promise((resolve) => setTimeout(resolve, 100))
              } else {
                throw error
              }
            }
          }
        }

        // Deactivate ONE_TIME template
        if (shouldDeactivate) {
          await prisma.taskTemplate.update({
            where: { id: template.id },
            data: { is_active: false },
          })
          console.log(`🔒 Deactivated ONE_TIME template ${template.id}`)
        }
      } catch (error) {
        const errorMsg = `Failed to process template ${template.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    console.log('\n📊 Task Generation Summary:')
    console.log(`   ✅ Created: ${result.tasks_created}`)
    console.log(`   ⏭️  Skipped: ${result.tasks_skipped}`)
    console.log(`   ❌ Errors: ${result.errors.length}`)
  } catch (error) {
    const errorMsg = `Fatal error in task generation: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`💥 ${errorMsg}`)
    result.errors.push(errorMsg)
  }

  return result
}
