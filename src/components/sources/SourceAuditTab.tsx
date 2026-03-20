'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

interface SourceAuditTabProps {
  sourceId: string
}

export function SourceAuditTab({ sourceId }: SourceAuditTabProps) {
  const { accessToken } = useAuth()
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAuditLogs = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)
        setError(null)

        // This endpoint will be created later
        // For now, mock some data
        const mockLogs = [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            action_type: 'source_created',
            user: { name: 'Laks R.' },
            channel: 'WEB',
            success: true,
          },
        ]

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500))

        setAuditLogs(mockLogs)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuditLogs()
  }, [sourceId, accessToken])

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('created')) return '✨'
    if (actionType.includes('updated') || actionType.includes('edited')) return '✏️'
    if (actionType.includes('deleted') || actionType.includes('archived')) return '🗑️'
    if (actionType.includes('activated')) return '✅'
    if (actionType.includes('deactivated')) return '⏸️'
    return '📝'
  }

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'WEB':
        return 'var(--accent-blue)'
      case 'AI':
        return 'var(--accent-purple)'
      case 'SLACK':
        return 'var(--accent-amber)'
      case 'SYSTEM':
        return 'var(--text-tertiary)'
      case 'API':
        return 'var(--accent-teal)'
      default:
        return 'var(--text-secondary)'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-red)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border-l-4 text-sm"
        style={{
          backgroundColor: 'rgba(255, 68, 79, 0.1)',
          borderColor: 'var(--accent-red)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="font-semibold mb-1">Error loading audit logs</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
      </div>
    )
  }

  if (auditLogs.length === 0) {
    return (
      <div
        className="rounded-lg border p-12 text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="text-4xl mb-3">📋</div>
        <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No audit history yet
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          All changes to this source will be logged here
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
        {auditLogs.map((log) => (
          <div key={log.id} className="p-4 hover:bg-opacity-50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="text-2xl mt-0.5">{getActionIcon(log.action_type)}</div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {log.action_type.replace(/_/g, ' ')}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-mono font-medium"
                    style={{
                      backgroundColor: `${getChannelColor(log.channel)}20`,
                      color: getChannelColor(log.channel),
                    }}
                  >
                    {log.channel}
                  </span>
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

                <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  by <span className="font-medium">{log.user?.name || 'System'}</span>
                </div>

                <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(log.timestamp).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
