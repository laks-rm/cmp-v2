import prisma from '@/lib/prisma'
import { format } from 'date-fns'

interface OverdueResult {
  tasks_marked_overdue: number
  errors: string[]
}

/**
 * Mark tasks as overdue if their due date has passed
 */
export async function checkOverdue(): Promise<OverdueResult> {
  const result: OverdueResult = {
    tasks_marked_overdue: 0,
    errors: [],
  }

  console.log('⏰ Starting overdue check...')
  console.log(`📅 Date: ${format(new Date(), 'yyyy-MM-dd')}`)

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all tasks that are past due and not completed
    const tasks = await prisma.taskInstance.findMany({
      where: {
        due_date: {
          lt: today, // Due date is in the past
        },
        status: {
          in: ['NOT_STARTED', 'IN_PROGRESS'],
        },
      },
      include: {
        pic_user: true,
        entity: true,
        source: true,
      },
    })

    console.log(`📋 Found ${tasks.length} tasks that are overdue`)

    for (const task of tasks) {
      try {
        await prisma.$transaction(async (tx) => {
          // Mark task as overdue
          await tx.taskInstance.update({
            where: { id: task.id },
            data: {
              status: 'OVERDUE',
              overdue_flagged_at: new Date(),
            },
          })

          // Create notification for PIC
          if (task.pic_user_id) {
            await tx.notification.create({
              data: {
                user_id: task.pic_user_id,
                type: 'TASK_OVERDUE',
                title: 'Task Overdue',
                message: `Task "${task.title}" for ${task.entity.name} was due on ${format(task.due_date, 'MMM dd, yyyy')}`,
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
              action_type: 'task_overdue_flagged',
              module: 'TaskInstance',
              task_instance_id: task.id,
              source_id: task.source_id,
              user_id: task.pic_user_id,
              channel: 'SYSTEM',
              success: true,
              metadata: {
                due_date: format(task.due_date, 'yyyy-MM-dd'),
                days_overdue: Math.floor((today.getTime() - task.due_date.getTime()) / (1000 * 60 * 60 * 24)),
              },
            },
          })

          console.log(
            `⏰ Marked task ${task.task_code} as overdue (was due: ${format(task.due_date, 'yyyy-MM-dd')})`
          )
          result.tasks_marked_overdue++
        })
      } catch (error) {
        const errorMsg = `Failed to mark task ${task.id} as overdue: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(`❌ ${errorMsg}`)
        result.errors.push(errorMsg)
      }
    }

    console.log('\n📊 Overdue Check Summary:')
    console.log(`   ✅ Marked overdue: ${result.tasks_marked_overdue}`)
    console.log(`   ❌ Errors: ${result.errors.length}`)
  } catch (error) {
    const errorMsg = `Fatal error in overdue check: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(`💥 ${errorMsg}`)
    result.errors.push(errorMsg)
  }

  return result
}
