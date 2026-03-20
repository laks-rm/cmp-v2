'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface AuditEntryProps {
  log: {
    id: string
    timestamp: Date
    action_type: string
    module: string
    channel: string
    success: boolean
    user?: {
      name: string
    } | null
    source?: {
      id: string
      code: string
      title: string
    } | null
    task_instance?: {
      id: string
      task_code: string
      title: string
    } | null
    entity?: {
      name: string
    } | null
    old_value?: any
    new_value?: any
  }
}

export function AuditEntry({ log }: AuditEntryProps) {
  const router = useRouter()

  // Icon mapping based on action type
  const getIcon = (actionType: string): { emoji: string; color: string } => {
    if (actionType.includes('create')) return { emoji: '✓', color: 'var(--accent-green)' }
    if (actionType.includes('update') || actionType.includes('edit'))
      return { emoji: '📝', color: 'var(--accent-blue)' }
    if (actionType.includes('approve')) return { emoji: '✓', color: 'var(--accent-green)' }
    if (actionType.includes('reject')) return { emoji: '✕', color: 'var(--accent-red)' }
    if (actionType.includes('assign')) return { emoji: '👤', color: 'var(--accent-teal)' }
    if (actionType.includes('upload') || actionType.includes('evidence'))
      return { emoji: '📎', color: 'var(--accent-blue)' }
    if (actionType.includes('escalation')) return { emoji: '⏰', color: 'var(--accent-amber)' }
    if (actionType.includes('login')) return { emoji: '🔑', color: 'var(--text-tertiary)' }
    if (actionType.includes('delete') || actionType.includes('archive'))
      return { emoji: '🗑️', color: 'var(--accent-red)' }
    if (actionType.includes('reminder')) return { emoji: '📬', color: 'var(--accent-blue)' }
    if (actionType.includes('overdue')) return { emoji: '⏰', color: 'var(--accent-red)' }
    if (log.channel === 'AI') return { emoji: '🤖', color: 'var(--accent-purple)' }
    if (log.channel === 'SLACK') return { emoji: '💬', color: 'var(--accent-green)' }
    if (log.channel === 'CRON') return { emoji: '⚙', color: 'var(--text-tertiary)' }
    return { emoji: '📝', color: 'var(--accent-blue)' }
  }

  // Channel badge colors
  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'WEB':
        return { bg: 'rgba(96, 165, 250, 0.1)', text: 'var(--accent-blue)' }
      case 'AI':
        return { bg: 'rgba(167, 139, 250, 0.1)', text: 'var(--accent-purple)' }
      case 'SLACK':
        return { bg: 'rgba(52, 211, 153, 0.1)', text: 'var(--accent-green)' }
      case 'SYSTEM':
        return { bg: 'rgba(251, 191, 36, 0.1)', text: 'var(--accent-amber)' }
      case 'CRON':
        return { bg: 'rgba(139, 151, 176, 0.1)', text: 'var(--text-tertiary)' }
      case 'API':
        return { bg: 'rgba(133, 172, 176, 0.1)', text: 'var(--accent-teal)' }
      default:
        return { bg: 'rgba(139, 151, 176, 0.1)', text: 'var(--text-tertiary)' }
    }
  }

  // Format action text with linked references
  const formatActionText = () => {
    const actionText = log.action_type.replace(/_/g, ' ')
    const parts: React.ReactNode[] = [actionText]

    // Add source link if present
    if (log.source) {
      parts.push(' on ')
      parts.push(
        <button
          key="source"
          onClick={() => router.push(`/sources/${log.source!.id}`)}
          className="font-mono font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent-teal)' }}
        >
          {log.source.code}
        </button>
      )
    }

    // Add task link if present
    if (log.task_instance) {
      parts.push(' ')
      parts.push(
        <button
          key="task"
          onClick={() => router.push(`/tasks/${log.task_instance!.id}`)}
          className="font-mono font-semibold hover:opacity-80 transition-opacity"
          style={{ color: 'var(--accent-teal)' }}
        >
          {log.task_instance.task_code}
        </button>
      )
    }

    // Add entity if present
    if (log.entity) {
      parts.push(` for ${log.entity.name}`)
    }

    return <span>{parts}</span>
  }

  const icon = getIcon(log.action_type)
  const channelColors = getChannelColor(log.channel)

  return (
    <div className="flex items-start gap-4 py-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${icon.color}20`, color: icon.color }}
      >
        {icon.emoji}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {/* Action text with links */}
          <span style={{ color: 'var(--text-primary)' }}>{formatActionText()}</span>

          {/* Channel badge */}
          <span
            className="px-2 py-0.5 rounded text-xs font-medium uppercase"
            style={{
              backgroundColor: channelColors.bg,
              color: channelColors.text,
            }}
          >
            {log.channel}
          </span>

          {/* Failure indicator */}
          {!log.success && (
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: 'rgba(255, 68, 79, 0.1)',
                color: 'var(--accent-red)',
              }}
            >
              Failed
            </span>
          )}
        </div>

        {/* User and timestamp */}
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          by <span className="font-semibold">{log.user?.name || 'System'}</span>
          {' • '}
          <span className="font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
          </span>
        </div>

        {/* Old/New value display (if present) */}
        {(log.old_value || log.new_value) && (
          <details className="mt-2">
            <summary
              className="text-xs cursor-pointer hover:opacity-80"
              style={{ color: 'var(--text-tertiary)' }}
            >
              View changes
            </summary>
            <div
              className="mt-2 p-3 rounded text-xs font-mono"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              {log.old_value && (
                <div className="mb-2">
                  <div className="font-semibold mb-1" style={{ color: 'var(--accent-red)' }}>
                    Old:
                  </div>
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(log.old_value, null, 2)}
                  </pre>
                </div>
              )}
              {log.new_value && (
                <div>
                  <div className="font-semibold mb-1" style={{ color: 'var(--accent-green)' }}>
                    New:
                  </div>
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(log.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
