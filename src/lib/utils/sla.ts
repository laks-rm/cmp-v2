import { differenceInDays, differenceInBusinessDays, isPast, format } from 'date-fns'

export interface SLAResult {
  remaining_days: number
  is_breached: boolean
  breach_days: number
  status: 'on_time' | 'at_risk' | 'breached'
}

/**
 * Calculate SLA status for a task review
 * @param submittedAt - When the task was submitted for review
 * @param slaDays - Number of days allowed for review (default: 3)
 * @param useBusinessDays - Whether to exclude weekends (default: false for now)
 */
export function calculateSLA(
  submittedAt: Date,
  slaDays: number = 3,
  useBusinessDays: boolean = false
): SLAResult {
  const now = new Date()
  const submitted = new Date(submittedAt)

  // Calculate days elapsed
  const daysElapsed = useBusinessDays
    ? differenceInBusinessDays(now, submitted)
    : differenceInDays(now, submitted)

  // Calculate remaining days
  const remainingDays = slaDays - daysElapsed

  // Determine if breached
  const isBreached = remainingDays < 0

  // Calculate breach days (positive if breached)
  const breachDays = isBreached ? Math.abs(remainingDays) : 0

  // Determine status
  let status: 'on_time' | 'at_risk' | 'breached'
  if (isBreached) {
    status = 'breached'
  } else if (remainingDays <= 1) {
    status = 'at_risk'
  } else {
    status = 'on_time'
  }

  return {
    remaining_days: remainingDays,
    is_breached: isBreached,
    breach_days: breachDays,
    status,
  }
}

/**
 * Format SLA display text
 */
export function formatSLA(sla: SLAResult): string {
  if (sla.is_breached) {
    return `⚠ SLA breached ${sla.breach_days}d ago`
  } else if (sla.remaining_days === 0) {
    return `⚠ Due today`
  } else if (sla.remaining_days === 1) {
    return `⏱ SLA: 1d remaining`
  } else {
    return `⏱ SLA: ${sla.remaining_days}d remaining`
  }
}

/**
 * Get SLA color for display
 */
export function getSLAColor(sla: SLAResult): {
  bg: string
  text: string
  border: string
} {
  switch (sla.status) {
    case 'breached':
      return {
        bg: 'rgba(255, 68, 79, 0.1)',
        text: 'var(--accent-red)',
        border: 'var(--accent-red)',
      }
    case 'at_risk':
      return {
        bg: 'rgba(251, 191, 36, 0.1)',
        text: 'var(--accent-amber)',
        border: 'var(--accent-amber)',
      }
    case 'on_time':
      return {
        bg: 'rgba(52, 211, 153, 0.1)',
        text: 'var(--accent-green)',
        border: 'var(--accent-green)',
      }
  }
}
