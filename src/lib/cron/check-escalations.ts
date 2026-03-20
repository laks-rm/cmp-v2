import prisma from '@/lib/prisma'
import { differenceInDays, format } from 'date-fns'

interface EscalationResult {
  escalations_triggered: number
  errors: string[]
}

/**
 * Check for tasks that need escalation
 */
export async function checkEscalations(): Promise<EscalationResult> {
  const result: EscalationResult = {
    escalations_triggered: 0,
    errors: [],
  }

  console.log('🚨 Starting escalation check...')
  console.log(`📅 Date: ${format(new Date(), 'yyyy-MM-dd')}`)

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all overdue tasks that haven't been escalated yet
    const tasks = await prisma.taskInstance.findMany({
      where: {
        status: 'OVERDUE',
        escalation_sent_at: null,
      },
      include: {
        task_template: true,
        pic_user: true,
        department: true,
        entity: true,
        source: true,
      },
    })

    console.log(`📋 Found ${tasks.length} overdue tasks to check for escalation`)

    for (const task of tasks) {
      try {
        const template = task.task_template

        // Check if template has escalation configured
        if (!template.escalation_days_after || !template.escalation_to) {
          continue
        }

        // Calculate days since due date
        const daysSinceDue = differenceInDays(today, task.due_date)

        // Should we escalate?
        if (daysSinceDue >= template.escalation_days_after) {
          await prisma.$transaction(async (tx) => {
            // Update task status
            await tx.taskInstance.update({
              where: { id: task.id },
              data: {
                assignment_status: 'ESCALATED',
                escalation_sent_at: new Date(),
              },
            })

            // Find escalation target user
            // escalation_to could be a user ID or a role like "DEPT_MANAGER" or "CMP_MANAGER"
            let escalationUserId: string | null = null

            if (template.escalation_to && template.escalation_to.startsWith('user_')) {
              // Direct user ID
              escalationUserId = template.escalation_to.replace('user_', '')
            } else if (template.escalation_to === 'DEPT_MANAGER') {
              // Find department manager
              const deptManager = await tx.user.findFirst({
                where: {
                  department_id: task.department_id,
                  role: 'DEPT_MANAGER',
                  is_active: true,
                },
              })
              escalationUserId = deptManager?.id || null
            } else if (template.escalation_to === 'CMP_MANAGER') {
              // Find CMP manager
              const cmpManager = await tx.user.findFirst({
                where: {
                  role: 'CMP_MANAGER',
                  is_active: true,
                },
              })
              escalationUserId = cmpManager?.id || null
            }

            // Create notification for escalation target
            if (escalationUserId) {
              await tx.notification.create({
                data: {
                  user_id: escalationUserId,
                  type: 'ESCALATION',
                  title: 'Task Escalated',
                  message: `Task "${task.title}" for ${task.entity.name} is ${daysSinceDue} days overdue and has been escalated to you`,
                  link_url: `/tasks/${task.id}`,
                  related_task_id: task.id,
                  related_source_id: task.source_id,
                  is_read: false,
                },
              })
            }

            // Write audit log
            await tx.auditLog.create({
              data: {
                action_type: 'escalation_triggered',
                module: 'TaskInstance',
                task_instance_id: task.id,
                source_id: task.source_id,
                user_id: escalationUserId,
                affected_user_id: task.pic_user_id,
                channel: 'SYSTEM',
                success: true,
                metadata: {
                  days_overdue: daysSinceDue,
                  escalation_target: template.escalation_to,
                  due_date: format(task.due_date, 'yyyy-MM-dd'),
                },
              },
            })

            console.log(
              `🚨 Escalated task ${task.task_code} (${daysSinceDue} days overdue) to ${template.escalation_to}`
            )
            result.escalations_triggered++
          })
        }
      } catch (error) {
        const errorMsg = `Failed to process escalation for task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    console.log('\n📊 Escalation Check Summary:')
    console.log(`   ✅ Escalated: ${result.escalations_triggered}`)
    console.log(`   ❌ Errors: ${result.errors.length}`)
  } catch (error) {
    const errorMsg = `Fatal error in escalation check: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`💥 ${errorMsg}`)
    result.errors.push(errorMsg)
  }

  return result
}
