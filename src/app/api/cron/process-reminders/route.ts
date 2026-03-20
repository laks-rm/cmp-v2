import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { sendReminders } from '@/lib/cron/send-reminders'
import { checkOverdue } from '@/lib/cron/check-overdue'
import { checkEscalations } from '@/lib/cron/check-escalations'

export async function POST(request: NextRequest) {
  try {
    // Check for cron secret key (for production cloud scheduler)
    const cronSecret = request.headers.get('x-cron-secret')
    if (cronSecret && cronSecret === process.env.CRON_SECRET) {
      console.log('✅ Authenticated via cron secret')
      
      // Run all reminder/overdue/escalation checks in sequence
      const reminderResult = await sendReminders()
      const overdueResult = await checkOverdue()
      const escalationResult = await checkEscalations()
      
      return NextResponse.json(
        {
          success: true,
          data: {
            reminders: reminderResult,
            overdue: overdueResult,
            escalations: escalationResult,
            summary: {
              total_actions: 
                reminderResult.reminders_sent + 
                overdueResult.tasks_marked_overdue + 
                escalationResult.escalations_triggered,
              total_errors: 
                reminderResult.errors.length + 
                overdueResult.errors.length + 
                escalationResult.errors.length,
            },
          },
        },
        { status: 200 }
      )
    }

    // Otherwise, require SUPER_ADMIN or ADMIN role
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required. Use cron secret header or admin JWT token.',
          },
        },
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      )
    }

    // Check if user is SUPER_ADMIN or ADMIN
    if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only SUPER_ADMIN or ADMIN can manually trigger reminder processing',
          },
        },
        { status: 403 }
      )
    }

    console.log(`✅ Authenticated as ${decoded.role} (user: ${decoded.userId})`)

    // Run all reminder/overdue/escalation checks in sequence
    const reminderResult = await sendReminders()
    const overdueResult = await checkOverdue()
    const escalationResult = await checkEscalations()

    return NextResponse.json(
      {
        success: true,
        data: {
          reminders: reminderResult,
          overdue: overdueResult,
          escalations: escalationResult,
          summary: {
            total_actions: 
              reminderResult.reminders_sent + 
              overdueResult.tasks_marked_overdue + 
              escalationResult.escalations_triggered,
            total_errors: 
              reminderResult.errors.length + 
              overdueResult.errors.length + 
              escalationResult.errors.length,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reminder processing error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred during reminder processing',
        },
      },
      { status: 500 }
    )
  }
}
