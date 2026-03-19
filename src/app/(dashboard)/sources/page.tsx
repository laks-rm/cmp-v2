'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'

interface Source {
  id: string
  code: string
  title: string
  source_type: string
  category: string
  status: string
  risk_level: string
  department: {
    id: string
    name: string
    code: string
  }
  pic_user: {
    id: string
    name: string
  } | null
  entities: Array<{
    id: string
    code: string
    country_flag_emoji: string
  }>
  clauses_count: number
}

interface Statistics {
  total: number
  active: number
  pending_assignment: number
  draft: number
}

export default function SourcesPage() {
  const router = useRouter()
  const { accessToken } = useAuth()
  
  const [sources, setSources] = useState<Source[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [activeView, setActiveView] = useState('all')

  useEffect(() => {
    fetchStatistics()
    fetchSources()
  }, [page, search, activeView])

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/sources/statistics', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStatistics(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const fetchSources = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (search) {
        params.append('search', search)
      }

      if (activeView !== 'all') {
        params.append('status', activeView.toUpperCase().replace(' ', '_'))
      }

      const response = await fetch(`/api/sources?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch sources')
      }

      const data = await response.json()
      if (data.success) {
        setSources(data.data.sources)
        setTotal(data.data.total)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleViewChange = (view: string) => {
    setActiveView(view)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Source Management
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Manage compliance sources, clauses, and task templates
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => router.push('/sources/create')}
        >
          <span className="text-lg mr-1">+</span> New Source
        </Button>
      </div>

      {/* Statistics Strip */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Sources"
            value={statistics.total}
            color="var(--accent-blue)"
          />
          <StatCard
            label="Active"
            value={statistics.active}
            color="var(--accent-green)"
          />
          <StatCard
            label="Pending Assignment"
            value={statistics.pending_assignment}
            color="var(--accent-amber)"
          />
          <StatCard
            label="Draft"
            value={statistics.draft}
            color="var(--text-tertiary)"
          />
        </div>
      )}

      {/* Quick View Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'pending_assignment', label: 'Pending Assignment' },
          { id: 'draft', label: 'Draft' },
          { id: 'inactive', label: 'Inactive' },
          { id: 'archived', label: 'Archived' },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => handleViewChange(view.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeView === view.id ? 'rgba(255, 68, 79, 0.1)' : 'var(--bg-tertiary)',
              color: activeView === view.id ? 'var(--accent-red)' : 'var(--text-secondary)',
              border: activeView === view.id ? '1px solid var(--accent-red)' : '1px solid var(--border-primary)',
            }}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by source name or code..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 input-primary"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Data Table */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchSources} />
      ) : sources.length === 0 ? (
        <EmptyDisplay onCreateClick={() => router.push('/sources/create')} />
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-primary)',
                }}
              >
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Entities
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    PIC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}>
                    Clauses
                  </th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr
                    key={source.id}
                    onClick={() => router.push(`/sources/${source.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      borderBottom: '1px solid var(--border-primary)',
                    }}
                  >
                    <td className="px-4 py-3">
                      <code
                        className="font-mono text-sm"
                        style={{ color: 'var(--accent-teal)' }}
                      >
                        {source.code}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {source.title}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {source.source_type.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {source.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {source.entities.slice(0, 3).map((entity) => (
                          <span key={entity.id} className="text-lg">
                            {entity.country_flag_emoji}
                          </span>
                        ))}
                        {source.entities.length > 3 && (
                          <span
                            className="text-xs ml-1"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            +{source.entities.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {source.department.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {source.pic_user ? (
                        <span
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {source.pic_user.name}
                        </span>
                      ) : (
                        <span
                          className="text-xs italic"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={source.status as any} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {source.clauses_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                borderTop: '1px solid var(--border-primary)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} sources
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        />
      ))}
    </div>
  )
}

function ErrorDisplay({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="p-6 rounded-lg border text-center"
      style={{
        backgroundColor: 'rgba(255, 68, 79, 0.05)',
        borderColor: 'var(--accent-red)',
      }}
    >
      <div className="text-4xl mb-3">⚠️</div>
      <div className="text-lg font-medium mb-2" style={{ color: 'var(--accent-red)' }}>
        {message}
      </div>
      <Button variant="primary" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

function EmptyDisplay({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div
      className="p-12 rounded-lg border text-center"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <div className="text-6xl mb-4">📋</div>
      <div className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        No sources yet
      </div>
      <div className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Get started by creating your first compliance source
      </div>
      <Button variant="primary" onClick={onCreateClick}>
        <span className="text-lg mr-1">+</span> Create Source
      </Button>
    </div>
  )
}
