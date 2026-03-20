'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

interface SourceTasksTabProps {
  sourceId: string
}

export function SourceTasksTab({ sourceId }: SourceTasksTabProps) {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  useEffect(() => {
    const fetchTasks = async () => {
      if (!accessToken) return

      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/sources/${sourceId}/tasks`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        const data = await response.json()

        if (data.success) {
          setTasks(data.data.tasks)
        } else {
          throw new Error(data.error?.message || 'Failed to load tasks')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [sourceId, accessToken])

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
        <div className="font-semibold mb-1">Error loading tasks</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-lg border p-12 text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="text-4xl mb-3">📝</div>
        <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No tasks have been generated yet
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Tasks are created automatically by the scheduler based on task templates
        </div>
      </div>
    )
  }

  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'overdue') return task.status === 'OVERDUE'
    if (activeFilter === 'pending_review') return task.status === 'PENDING_REVIEW'
    if (activeFilter === 'completed') return ['APPROVED', 'CLOSED'].includes(task.status)
    return true
  })

  return (
    <div className="space-y-4">
      {/* Quick View Chips */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'pending_review', label: 'Pending Review' },
          { id: 'completed', label: 'Completed' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeFilter === filter.id ? 'var(--accent-red)' : 'var(--bg-tertiary)',
              color: activeFilter === filter.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Tasks Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <table className="w-full text-sm">
          <thead
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Task Code</th>
              <th className="px-4 py-3 text-left font-semibold">Clause</th>
              <th className="px-4 py-3 text-left font-semibold">Title</th>
              <th className="px-4 py-3 text-left font-semibold">Entity</th>
              <th className="px-4 py-3 text-left font-semibold">PIC</th>
              <th className="px-4 py-3 text-left font-semibold">Due Date</th>
              <th className="px-4 py-3 text-left font-semibold">Priority</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => router.push(`/tasks/${task.id}`)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderBottom: '1px solid var(--border-primary)' }}
              >
                <td className="px-4 py-3 font-mono" style={{ color: 'var(--accent-teal)' }}>
                  {task.task_code}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                  {task.clause?.clause_number || 'N/A'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                  {task.title}
                </td>
                <td className="px-4 py-3">{task.entity?.country_flag_emoji || ''}</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                  {task.pic_user?.name || 'Unassigned'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(task.due_date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor:
                        task.priority === 'HIGH'
                          ? 'rgba(255, 68, 79, 0.1)'
                          : task.priority === 'MEDIUM'
                          ? 'rgba(251, 191, 36, 0.1)'
                          : 'rgba(139, 151, 176, 0.1)',
                      color:
                        task.priority === 'HIGH'
                          ? 'var(--accent-red)'
                          : task.priority === 'MEDIUM'
                          ? 'var(--accent-amber)'
                          : 'var(--text-tertiary)',
                    }}
                  >
                    {task.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor:
                        task.status === 'OVERDUE'
                          ? 'rgba(255, 68, 79, 0.1)'
                          : task.status === 'APPROVED'
                          ? 'rgba(52, 211, 153, 0.1)'
                          : 'rgba(96, 165, 250, 0.1)',
                      color:
                        task.status === 'OVERDUE'
                          ? 'var(--accent-red)'
                          : task.status === 'APPROVED'
                          ? 'var(--accent-green)'
                          : 'var(--accent-blue)',
                    }}
                  >
                    {task.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {task.evidence_required && (
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        backgroundColor:
                          task.evidence_status === 'COMPLETE'
                            ? 'rgba(52, 211, 153, 0.1)'
                            : 'rgba(251, 191, 36, 0.1)',
                        color:
                          task.evidence_status === 'COMPLETE'
                            ? 'var(--accent-green)'
                            : 'var(--accent-amber)',
                      }}
                    >
                      {task.evidence_status}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
