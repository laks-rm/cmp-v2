'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { EntityCard } from '@/components/monitoring/EntityCard'

export default function EntitiesPage() {
  const { accessToken } = useAuth()
  const [entities, setEntities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntities = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/monitoring/entities', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setEntities(data.data.entities)
      } else {
        throw new Error(data.error?.message || 'Failed to load entities')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entities')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEntities()
  }, [accessToken])

  // Calculate overall stats
  const stats = {
    total: entities.length,
    healthy: entities.filter((e) => e.compliance_score >= 80).length,
    warning: entities.filter((e) => e.compliance_score >= 60 && e.compliance_score < 80).length,
    critical: entities.filter((e) => e.compliance_score < 60).length,
    avgScore: entities.length > 0
      ? Math.round(entities.reduce((sum, e) => sum + e.compliance_score, 0) / entities.length)
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
        <div className="font-semibold mb-1">Error loading entity monitoring</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
        <button
          onClick={fetchEntities}
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
          Entity Monitoring
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Real-time compliance performance across all entities
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
            {stats.healthy}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Healthy (&gt;80%)
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-amber)' }}>
            {stats.warning}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Warning (60-80%)
          </div>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-red)' }}>
            {stats.critical}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Critical (&lt;60%)
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

      {/* Entity Cards Grid */}
      {entities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entities.map((entity) => (
            <EntityCard key={entity.entity_id} entity={entity} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏢</div>
          <div className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            No entities found
          </div>
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            No entity data is available for monitoring.
          </div>
        </div>
      )}
    </div>
  )
}
