import { addDays, addWeeks, addMonths, addYears } from 'date-fns'

/**
 * Calculate the next occurrence date from a given date based on frequency
 */
export function calculateNextOccurrence(currentDate: Date, frequency: string): Date | null {
  switch (frequency) {
    case 'DAILY':
      return addDays(currentDate, 1)
    case 'WEEKLY':
      return addWeeks(currentDate, 1)
    case 'BI_WEEKLY':
      return addWeeks(currentDate, 2)
    case 'MONTHLY':
      return addMonths(currentDate, 1)
    case 'QUARTERLY':
      return addMonths(currentDate, 3)
    case 'SEMI_ANNUALLY':
      return addMonths(currentDate, 6)
    case 'ANNUALLY':
      return addYears(currentDate, 1)
    case 'ONE_TIME':
      return null // No next occurrence
    case 'AD_HOC':
      return null // Never auto-generated
    default:
      return null
  }
}

/**
 * Calculate period_start and period_end for a given due date and frequency
 * period_start = the beginning of the period this due date falls in
 * period_end = the end of that period
 */
export function calculatePeriodForDate(dueDate: Date, frequency: string): { period_start: Date; period_end: Date } {
  // For simplicity and correctness: the period IS the due date for the purpose of grouping
  // period_start = due date, period_end = day before next occurrence (or same day for one-time)
  const nextOccurrence = calculateNextOccurrence(dueDate, frequency)
  return {
    period_start: dueDate,
    period_end: nextOccurrence ? addDays(nextOccurrence, -1) : dueDate,
  }
}
