'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/Button'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'

interface TaskListItem {
  id: string
  task_code: string
  title: string
  status: string
  priority: string
  due_date: string
  evidence_status: string
  source: {
    id: string
    code: string
    title: string
  }
  clause: {
    id: string
    clause_number: string
  }
  entity: {
    id: string
    code: string
    country_flag_emoji: string
    name: string
  }
  department: {
    id: string
    name: string
  }
  pic_user: {
    id: string
    name: string
  } | null
}

interface Statistics {
  all_open: number
  overdue: number
  pending_review: number
  unassigned: number
}

export default function TaskTrackerPage() {
  const router = useRouter()
  const { accessToken } = useAuth()

  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [activeView, setActiveView] = useState('all_open')

  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    entity_id: '',
    status: '',
    priority: '',
    department_id: '',
    source_id: '',
    pic_user_id: '',
    evidence_status: '',
    due_date_from: '',
    due_date_to: '',
  })

  useEffect(() => {
    fetchStatistics()
    fetchTasks()
  }, [page, search, activeView, filters])

  const fetchStatistics = async () => {
    try {
      const params = new URLSearchParams()
      
      const statusNotClosed = ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'RETURNED', 'OVERDUE']
      
      const responses = await Promise.all([
        fetch(`/api/tasks?status=${statusNotClosed.join(',')}&limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/tasks?status=OVERDUE&limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/tasks?status=PENDING_REVIEW&limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/tasks?assignment_status=UNASSIGNED&limit=1`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ])

      const [allOpen, overdue, pendingReview, unassigned] = await Promise.all(
        responses.map((r) => r.json())
      )

      setStatistics({
        all_open: allOpen.success ? allOpen.data.total : 0,
        overdue: overdue.success ? overdue.data.total : 0,
        pending_review: pendingReview.success ? pendingReview.data.total : 0,
        unassigned: unassigned.success ? unassigned.data.total : 0,
      })
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  const fetchTasks = async () => {
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

      if (activeView !== 'all_open') {
        if (activeView === 'overdue') {
          params.append('status', 'OVERDUE')
        } else if (activeView === 'actionable') {
          params.append('status', 'NOT_STARTED,IN_PROGRESS,RETURNED')
        } else if (activeView === 'upcoming') {
          params.append('status', 'NOT_STARTED')
        } else if (activeView === 'pending_review') {
          params.append('status', 'PENDING_REVIEW')
        } else if (activeView === 'unassigned') {
          params.append('assignment_status', 'UNASSIGNED')
        } else if (activeView === 'completed') {
          params.append('status', 'APPROVED,CLOSED')
        }
      } else {
        params.append('status', 'NOT_STARTED,IN_PROGRESS,PENDING_REVIEW,RETURNED,OVERDUE')
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value)
        }
      })

      const response = await fetch(`/api/tasks?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }

      const data = await response.json()
      if (data.success) {
        setTasks(data.data.tasks)
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

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleExport = () => {
    alert('Export functionality coming soon')
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Task Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Monitor and manage all compliance tasks
          </p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          Export
        </Button>
      </div>

      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="All Open" value={statistics.all_open} color="var(--accent-blue)" />
          <StatCard label="Overdue" value={statistics.overdue} color="var(--accent-red)" />
          <StatCard
            label="Pending Review"
            value={statistics.pending_review}
            color="var(--accent-amber)"
          />
          <StatCard
            label="Unassigned"
            value={statistics.unassigned}
            color="var(--text-tertiary)"
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: 'all_open', label: 'All Open' },
          { id: 'actionable', label: 'Actionable' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'pending_review', label: 'Pending Review' },
          { id: 'unassigned', label: 'Unassigned' },
          { id: 'completed', label: 'Completed' },
        ].map((view) => (
          <button
            key={view.id}
            onClick={() => handleViewChange(view.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                activeView === view.id ? 'rgba(255, 68, 79, 0.1)' : 'var(--bg-tertiary)',
              color: activeView === view.id ? 'var(--accent-red)' : 'var(--text-secondary)',
              border:
                activeView === view.id
                  ? '1px solid var(--accent-red)'
                  : '1px solid var(--border-primary)',
            }}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by task code or title..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 input-primary"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
        />
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {showFilters && (
        <div
          className="p-4 rounded-lg border grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="RETURNED">Returned</option>
              <option value="APPROVED">Approved</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
              Evidence Status
            </label>
            <select
              value={filters.evidence_status}
              onChange={(e) => handleFilterChange('evidence_status', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">All</option>
              <option value="NOT_REQUIRED">Not Required</option>
              <option value="MISSING">Missing</option>
              <option value="PARTIAL">Partial</option>
              <option value="COMPLETE">Complete</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
              Due Date From
            </label>
            <input
              type="date"
              value={filters.due_date_from}
              onChange={(e) => handleFilterChange('due_date_from', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
              Due Date To
            </label>
            <input
              type="date"
              value={filters.due_date_to}
              onChange={(e) => handleFilterChange('due_date_to', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchTasks} />
      ) : tasks.length === 0 ? (
        <EmptyDisplay />
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
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Task Code
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Title
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Source
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Clause
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Entity
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    PIC
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Due Date
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Priority
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      borderBottom: '1px solid var(--border-primary)',
                    }}
                  >
                    <td className="px-4 py-3">
                      <code className="font-mono text-sm" style={{ color: 'var(--accent-teal)' }}>
                        {task.task_code}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <code className="font-mono text-xs" style={{ color: 'var(--accent-teal)' }}>
                          {task.source.code}
                        </code>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {task.source.title.length > 30
                            ? task.source.title.substring(0, 30) + '...'
                            : task.source.title}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {task.clause.clause_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{task.entity.country_flag_emoji}</span>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {task.entity.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {task.pic_user ? (
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {task.pic_user.name}
                        </span>
                      ) : (
                        <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm"
                        style={{
                          color: isOverdue(task.due_date)
                            ? 'var(--accent-red)'
                            : 'var(--text-secondary)',
                          fontWeight: isOverdue(task.due_date) ? 600 : 400,
                        }}
                      >
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority as any} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status as any} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {task.evidence_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {total > 20 && (
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                borderTop: '1px solid var(--border-primary)',
                backgroundColor: 'var(--bg-tertiary)',
              }}
            >
              <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} tasks
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
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
      <div
        className="text-xs font-medium uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-tertiary)' }}
      >
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

function EmptyDisplay() {
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
        No tasks found
      </div>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Try adjusting your filters or search criteria
      </div>
    </div>
  )
}
