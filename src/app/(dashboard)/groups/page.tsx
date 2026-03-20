'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { GroupCard } from '@/components/monitoring/GroupCard'

export default function GroupsPage() {
  const { accessToken } = useAuth()
  const [groups, setGroups] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/monitoring/groups', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setGroups(data.data.groups)
      } else {
        throw new Error(data.error?.message || 'Failed to load groups')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [accessToken])

  // Calculate overall stats
  const stats = {
    total: groups.length,
    totalEntities: groups.reduce((sum, g) => sum + g.entity_count, 0),
    totalSources: groups.reduce((sum, g) => sum + g.source_count, 0),
    totalOverdue: groups.reduce((sum, g) => sum + g.overdue_count, 0),
    avgScore: groups.length > 0
      ? Math.round(groups.reduce((sum, g) => sum + g.compliance_score, 0) / groups.length)
      : 0,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-teal)' }} />
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
        <div className="font-semibold mb-1">Error loading group monitoring</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
        <button
          onClick={fetchGroups}
          className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--accent-red)',
            color: 'white',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Group Monitoring
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Aggregated compliance performance by entity group
        </p>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-blue)' }}>
            {stats.total}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Total Groups
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-purple)' }}>
            {stats.totalEntities}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Total Entities
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
            {stats.totalSources}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Total Sources
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-3xl font-bold mb-1" style={{ color: stats.totalOverdue > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
            {stats.totalOverdue}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Total Overdue
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-teal)' }}>
            {stats.avgScore}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Avg Compliance
          </div>
        </div>
      </div>

      {/* Group Cards */}
      {groups.length > 0 ? (
        <div className="space-y-4">
          {groups.map((group) => (
            <GroupCard key={group.group_id} group={group} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🌍</div>
          <div className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            No groups found
          </div>
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No group data is available for monitoring.
          </div>
        </div>
      )}
    </div>
  )
}
