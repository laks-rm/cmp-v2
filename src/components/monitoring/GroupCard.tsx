'use client'

import { useState } from 'react'
import { EntityCard } from './EntityCard'

interface GroupCardProps {
  group: {
    group_id: string
    group_name: string
    group_code: string
    group_emoji: string
    compliance_score: number
    source_count: number
    overdue_count: number
    pending_review_count: number
    entity_count: number
    entities: any[]
  }
}

export function GroupCard({ group }: GroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'rgba(52, 211, 153, 0.1)', text: 'var(--accent-green)', bar: 'var(--accent-green)' }
    if (score >= 60) return { bg: 'rgba(251, 191, 36, 0.1)', text: 'var(--accent-amber)', bar: 'var(--accent-amber)' }
    return { bg: 'rgba(255, 68, 79, 0.1)', text: 'var(--accent-red)', bar: 'var(--accent-red)' }
  }

  const scoreColor = getScoreColor(group.compliance_score)

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Group Header */}
      <div
        className="p-6 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          {/* Group Emoji */}
          <div className="text-4xl">{group.group_emoji}</div>

          {/* Group Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>
                {group.group_name}
              </h3>
              <button
                className="text-sm font-medium"
                style={{ color: 'var(--accent-teal)' }}
              >
                {isExpanded ? '▼' : '▶'} {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {group.group_code}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {group.entity_count} {group.entity_count === 1 ? 'Entity' : 'Entities'}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 mb-4">
              {/* Compliance Score */}
              <div>
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ color: scoreColor.text }}
                >
                  {group.compliance_score}%
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Overall Score
                </div>
              </div>

              {/* Source Count */}
              <div>
                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-blue)' }}>
                  {group.source_count}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Sources
                </div>
              </div>

              {/* Overdue Count */}
              <div>
                <div
                  className="text-2xl font-bold mb-1"
                  style={{ color: group.overdue_count > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}
                >
                  {group.overdue_count}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Overdue
                </div>
              </div>

              {/* Review Backlog */}
              <div>
                <div
                  className="text-2xl font-bold mb-1"
                  style={{ color: group.pending_review_count > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)' }}
                >
                  {group.pending_review_count}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Review Backlog
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${group.compliance_score}%`,
                  background: `linear-gradient(90deg, ${scoreColor.bar} 0%, ${scoreColor.bar}99 100%)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: Member Entities */}
      {isExpanded && (
        <div
          className="border-t p-6"
          style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
        >
          <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Member Entities
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.entities.map((entity) => (
              <EntityCard key={entity.entity_id} entity={entity} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
