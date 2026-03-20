'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { SourceDetailHeader } from '@/components/sources/SourceDetailHeader'
import { SourceOverviewTab } from '@/components/sources/SourceOverviewTab'
import { SourceClausesTab } from '@/components/sources/SourceClausesTab'
import { SourceTasksTab } from '@/components/sources/SourceTasksTab'
import { SourceAuditTab } from '@/components/sources/SourceAuditTab'

type Tab = 'overview' | 'clauses' | 'tasks' | 'audit'

export default function SourceDetailPage() {
  const params = useParams()
  const { accessToken } = useAuth()
  const [source, setSource] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const fetchSource = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/sources/${params.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setSource(data.data.source)
      } else {
        setError(data.error?.message || 'Failed to load source')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load source')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSource()
  }, [params.id, accessToken])

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
        <div className="font-semibold mb-1">Error loading source</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
        <button
          onClick={fetchSource}
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

  if (!source) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
        Source not found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <SourceDetailHeader source={source} onUpdate={fetchSource} />

      {/* Tab Navigation */}
      <div
        className="flex items-center gap-1 border-b"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'clauses', label: 'Clauses & Templates' },
          { id: 'tasks', label: 'Tasks' },
          { id: 'audit', label: 'Audit History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className="px-4 py-3 font-medium text-sm transition-colors relative"
            style={{
              color: activeTab === tab.id ? 'var(--accent-red)' : 'var(--text-secondary)',
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: 'var(--accent-red)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <SourceOverviewTab source={source} />}
        {activeTab === 'clauses' && <SourceClausesTab source={source} onUpdate={fetchSource} />}
        {activeTab === 'tasks' && <SourceTasksTab sourceId={source.id} source={source} />}
        {activeTab === 'audit' && <SourceAuditTab sourceId={source.id} />}
      </div>
    </div>
  )
}
