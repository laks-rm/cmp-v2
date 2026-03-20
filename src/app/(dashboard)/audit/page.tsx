'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AuditEntry } from '@/components/audit/AuditEntry'

export default function AuditLogsPage() {
  const { accessToken } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeChip, setActiveChip] = useState<'all' | 'source' | 'task' | 'admin' | 'ai' | 'slack'>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Advanced filters
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    user_id: '',
    action_type: '',
    channel: '',
    module: '',
    entity_id: '',
    success: '',
  })

  const fetchAuditLogs = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })

      if (search) params.append('search', search)

      // Apply chip filters
      if (activeChip === 'source') {
        params.append('module', 'Source')
      } else if (activeChip === 'task') {
        params.append('module', 'TaskInstance')
      } else if (activeChip === 'admin') {
        params.append('module', 'User')
      } else if (activeChip === 'ai') {
        params.append('channel', 'AI')
      } else if (activeChip === 'slack') {
        params.append('channel', 'SLACK')
      }

      // Apply advanced filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/audit?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs)
        setTotal(data.data.total)
      } else {
        throw new Error(data.error?.message || 'Failed to load audit logs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [page, search, activeChip, filters, accessToken])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handleChipChange = (chip: typeof activeChip) => {
    setActiveChip(chip)
    setPage(1)
  }

  const totalPages = Math.ceil(total / 50)

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--accent-red)' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Audit Logs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Complete traceability of all system actions
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          Export
        </button>
      </div>

      {/* Quick View Chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'source', label: 'Source' },
          { id: 'task', label: 'Task' },
          { id: 'admin', label: 'Admin' },
          { id: 'ai', label: 'AI Actions' },
          { id: 'slack', label: 'Slack' },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => handleChipChange(chip.id as typeof activeChip)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                activeChip === chip.id ? 'var(--accent-red)' : 'var(--bg-tertiary)',
              color: activeChip === chip.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by action or user..."
          className="flex-1 px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
            border: '1px solid',
          }}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: showFilters ? 'var(--accent-red)' : 'var(--bg-tertiary)',
            color: showFilters ? 'white' : 'var(--text-primary)',
            border: `1px solid ${showFilters ? 'var(--accent-red)' : 'var(--border-primary)'}`,
          }}
        >
          Filters {showFilters ? '▲' : '▼'}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div
          className="rounded-lg border p-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Date From
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Date To
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Channel
              </label>
              <select
                value={filters.channel}
                onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid',
                }}
              >
                <option value="">All Channels</option>
                <option value="WEB">Web</option>
                <option value="AI">AI</option>
                <option value="SLACK">Slack</option>
                <option value="SYSTEM">System</option>
                <option value="CRON">Cron</option>
                <option value="API">API</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Module
              </label>
              <select
                value={filters.module}
                onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid',
                }}
              >
                <option value="">All Modules</option>
                <option value="Source">Source</option>
                <option value="Clause">Clause</option>
                <option value="TaskTemplate">Task Template</option>
                <option value="TaskInstance">Task Instance</option>
                <option value="User">User</option>
                <option value="Comment">Comment</option>
                <option value="EvidenceFile">Evidence File</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Status
              </label>
              <select
                value={filters.success}
                onChange={(e) => setFilters({ ...filters, success: e.target.value })}
                className="w-full px-3 py-2 rounded text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid',
                }}
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failure</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setFilters({
                  date_from: '',
                  date_to: '',
                  user_id: '',
                  action_type: '',
                  channel: '',
                  module: '',
                  entity_id: '',
                  success: '',
                })
                setPage(1)
              }}
              className="px-4 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
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
          <button
            onClick={fetchAuditLogs}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--accent-red)',
              color: 'white',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Audit Timeline */}
      {logs.length === 0 && !isLoading ? (
        <div
          className="rounded-lg border p-12 text-center"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-4xl mb-3">📋</div>
          <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No audit logs found
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Try adjusting your filters
          </div>
        </div>
      ) : (
        <>
          <div
            className="rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
              {logs.map((log) => (
                <AuditEntry key={log.id} log={log} />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
