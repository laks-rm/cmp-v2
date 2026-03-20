'use client'

import { useRouter } from 'next/navigation'

interface EntityCardProps {
  entity: {
    entity_id: string
    entity_code: string
    entity_name: string
    legal_name: string
    country_flag_emoji: string
    group_name: string
    compliance_score: number
    source_count: number
    overdue_count: number
    open_task_count: number
    pending_review_count: number
  }
}

export function EntityCard({ entity }: EntityCardProps) {
  const router = useRouter()

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'rgba(52, 211, 153, 0.1)', text: 'var(--accent-green)', bar: 'var(--accent-green)' }
    if (score >= 60) return { bg: 'rgba(251, 191, 36, 0.1)', text: 'var(--accent-amber)', bar: 'var(--accent-amber)' }
    return { bg: 'rgba(255, 68, 79, 0.1)', text: 'var(--accent-red)', bar: 'var(--accent-red)' }
  }

  const scoreColor = getScoreColor(entity.compliance_score)

  return (
    <div
      onClick={() => router.push(`/tasks?entity_id=${entity.entity_id}`)}
      className="rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-teal)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-primary)'
      }}
    >
      {/* Card Content */}
      <div className="p-6">
        {/* Header: Flag + Name */}
        <div className="flex items-start gap-3 mb-4">
          <div className="text-4xl">{entity.country_flag_emoji}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              {entity.legal_name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {entity.entity_code}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {entity.group_name}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Compliance Score */}
          <div>
            <div
              className="text-3xl font-bold mb-1"
              style={{ color: scoreColor.text }}
            >
              {entity.compliance_score}%
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Compliance Score
            </div>
          </div>

          {/* Source Count */}
          <div>
            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-blue)' }}>
              {entity.source_count}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Sources
            </div>
          </div>

          {/* Overdue Count */}
          <div>
            <div
              className="text-2xl font-bold mb-1"
              style={{ color: entity.overdue_count > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}
            >
              {entity.overdue_count}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Overdue
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <div>
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {entity.open_task_count}
            </span>{' '}
            Open
          </div>
          <div>
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
              {entity.pending_review_count}
            </span>{' '}
            Pending Review
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${entity.compliance_score}%`,
            background: `linear-gradient(90deg, ${scoreColor.bar} 0%, ${scoreColor.bar}99 100%)`,
          }}
        />
      </div>
    </div>
  )
}
