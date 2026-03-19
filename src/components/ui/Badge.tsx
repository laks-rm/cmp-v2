type Status = 
  | 'ACTIVE' | 'APPROVED' 
  | 'OVERDUE' 
  | 'PENDING' | 'SUBMITTED' | 'PENDING_REVIEW'
  | 'DRAFT' 
  | 'SUPERSEDED' | 'ARCHIVED'
  | 'NOT_STARTED' | 'IN_PROGRESS'
  | 'RETURNED' | 'REJECTED'
  | 'INACTIVE' | 'CLOSED'

type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

interface StatusBadgeProps {
  status: Status
  className?: string
}

interface PriorityBadgeProps {
  priority: Priority
  className?: string
}

const statusConfig: Record<Status, { color: string; bgColor: string; label: string }> = {
  ACTIVE: { color: 'var(--accent-green)', bgColor: 'rgba(52, 211, 153, 0.1)', label: 'Active' },
  APPROVED: { color: 'var(--accent-green)', bgColor: 'rgba(52, 211, 153, 0.1)', label: 'Approved' },
  OVERDUE: { color: 'var(--accent-red)', bgColor: 'rgba(255, 68, 79, 0.1)', label: 'Overdue' },
  PENDING: { color: 'var(--accent-amber)', bgColor: 'rgba(251, 191, 36, 0.1)', label: 'Pending' },
  SUBMITTED: { color: 'var(--accent-amber)', bgColor: 'rgba(251, 191, 36, 0.1)', label: 'Submitted' },
  PENDING_REVIEW: { color: 'var(--accent-blue)', bgColor: 'rgba(96, 165, 250, 0.1)', label: 'Pending Review' },
  DRAFT: { color: 'var(--text-tertiary)', bgColor: 'var(--bg-tertiary)', label: 'Draft' },
  SUPERSEDED: { color: 'var(--accent-purple)', bgColor: 'rgba(167, 139, 250, 0.1)', label: 'Superseded' },
  ARCHIVED: { color: 'var(--text-tertiary)', bgColor: 'var(--bg-tertiary)', label: 'Archived' },
  NOT_STARTED: { color: 'var(--text-tertiary)', bgColor: 'var(--bg-tertiary)', label: 'Not Started' },
  IN_PROGRESS: { color: 'var(--accent-blue)', bgColor: 'rgba(96, 165, 250, 0.1)', label: 'In Progress' },
  RETURNED: { color: 'var(--accent-amber)', bgColor: 'rgba(251, 191, 36, 0.1)', label: 'Returned' },
  REJECTED: { color: 'var(--accent-red)', bgColor: 'rgba(255, 68, 79, 0.1)', label: 'Rejected' },
  INACTIVE: { color: 'var(--text-tertiary)', bgColor: 'var(--bg-tertiary)', label: 'Inactive' },
  CLOSED: { color: 'var(--text-tertiary)', bgColor: 'var(--bg-tertiary)', label: 'Closed' },
}

const priorityConfig: Record<Priority, { color: string; bgColor: string }> = {
  HIGH: { color: 'var(--accent-red)', bgColor: 'rgba(255, 68, 79, 0.1)' },
  MEDIUM: { color: 'var(--accent-amber)', bgColor: 'rgba(251, 191, 36, 0.1)' },
  LOW: { color: 'var(--accent-green)', bgColor: 'rgba(52, 211, 153, 0.1)' },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${className}`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  )
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${className}`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
      }}
    >
      {priority}
    </span>
  )
}
