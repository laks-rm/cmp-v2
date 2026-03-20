import prisma from '@/lib/prisma'
import { addDays, format } from 'date-fns'

interface ReminderResult {
  reminders_sent: number
  errors: string[]
}

/**
 * Send reminders for tasks that are due soon
 */
export async function sendReminders(): Promise<ReminderResult> {
  const result: ReminderResult = {
    reminders_sent: 0,
    errors: [],
  }

  console.log('📬 Starting reminder processing...')
  console.log(`📅 Date: ${format(new Date(), 'yyyy-MM-dd')}`)

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all tasks that are not completed and have a future due date
    const tasks = await prisma.taskInstance.findMany({
      where: {
        status: {
          in: ['NOT_STARTED', 'IN_PROGRESS', 'OVERDUE'],
        },
        due_date: {
          gte: today, // Due date is today or in the future
        },
      },
      include: {
        task_template: true,
        pic_user: true,
        department: true,
        entity: true,
        source: true,
      },
    })

    console.log(`📋 Found ${tasks.length} tasks to check for reminders`)

    for (const task of tasks) {
      try {
        const template = task.task_template
        const reminderDaysBefore = template.reminder_days_before || []

        if (reminderDaysBefore.length === 0) {
          continue // No reminders configured
        }

        // Check each reminder threshold
        for (const daysBefore of reminderDaysBefore) {
          const reminderDate = addDays(task.due_date, -daysBefore)
          reminderDate.setHours(0, 0, 0, 0)

          // Is today the reminder date?
          if (reminderDate.getTime() === today.getTime()) {
            // Check if this reminder was already sent
            const reminderDateStr = format(today, 'yyyy-MM-dd')
            const alreadySent = task.reminder_sent_dates.some(
              (sentDate) => format(new Date(sentDate), 'yyyy-MM-dd') === reminderDateStr
            )

            if (alreadySent) {
              console.log(
                `⏭️  Reminder already sent for task ${task.task_code} (${daysBefore}d before)`
              )
              continue
            }

            // Send reminder
            await prisma.$transaction(async (tx) => {
              // Create notification for PIC (or department if unassigned)
              if (task.pic_user_id) {
                await tx.notification.create({
                  data: {
                    user_id: task.pic_user_id,
                    type: 'REMINDER',
                    title: `Reminder: Task due in ${daysBefore} ${daysBefore === 1 ? 'day' : 'days'}`,
                    message: `Task "${task.title}" for ${task.entity.name} is due on ${format(task.due_date, 'MMM dd, yyyy')}`,
                    link_url: `/tasks/${task.id}`,
                    related_task_id: task.id,
                    related_source_id: task.source_id,
                    is_read: false,
                  },
                })
              }

              // Update reminder_sent_dates
              await tx.taskInstance.update({
                where: { id: task.id },
                data: {
                  reminder_sent_dates: {
                    push: today,
                  },
                },
              })

              // Write audit log
              await tx.auditLog.create({
                data: {
                  action_type: 'reminder_sent',
                  module: 'TaskInstance',
                  task_instance_id: task.id,
                  source_id: task.source_id,
                  user_id: task.pic_user_id,
                  channel: 'SYSTEM',
                  success: true,
                  metadata: {
                    days_before: daysBefore,
                    due_date: format(task.due_date, 'yyyy-MM-dd'),
                  },
                },
              })

              console.log(
                `📬 Sent reminder for task ${task.task_code} (${daysBefore}d before due)`
              )
              result.reminders_sent++
            })
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process reminders for task ${task.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    console.log('\n📊 Reminder Processing Summary:')
    console.log(`   ✅ Sent: ${result.reminders_sent}`)
    console.log(`   ❌ Errors: ${result.errors.length}`)
  } catch (error) {
    const errorMsg = `Fatal error in reminder processing: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`💥 ${errorMsg}`)
    result.errors.push(errorMsg)
  }

  return result
}
