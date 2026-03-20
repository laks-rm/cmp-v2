'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ReviewCard } from '@/components/review/ReviewCard'

export default function ReviewQueuePage() {
  const { accessToken } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'pending' | 'returned' | 'approved' | 'breach'>(
    'pending'
  )

  const fetchReviewQueue = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/review?filter=${activeFilter}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setTasks(data.data.tasks)
        setStats(data.data.stats)
      } else {
        throw new Error(data.error?.message || 'Failed to load review queue')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review queue')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReviewQueue()
  }, [activeFilter, accessToken])

  const handleActionComplete = () => {
    // Refresh the queue after an action
    fetchReviewQueue()
  }

  // Filter tasks based on active filter
  const filteredTasks =
    activeFilter === 'breach'
      ? tasks.filter((t) => t.sla?.is_breached)
      : tasks

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--accent-red)' }}
        />
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
        <div className="font-semibold mb-1">Error loading review queue</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
        <button
          onClick={fetchReviewQueue}
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
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Review Queue
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {stats?.pending || 0} {stats?.pending === 1 ? 'task' : 'tasks'} pending your review
        </p>
      </div>

      {/* Quick View Chips */}
      {stats && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('pending')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                activeFilter === 'pending' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
              color: activeFilter === 'pending' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Pending Review ({stats.pending})
          </button>
          <button
            onClick={() => setActiveFilter('returned')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                activeFilter === 'returned' ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
              color: activeFilter === 'returned' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Returned ({stats.returned})
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                activeFilter === 'approved' ? 'var(--accent-green)' : 'var(--bg-tertiary)',
              color: activeFilter === 'approved' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Recently Approved ({stats.approved_last_7d})
          </button>
          <button
            onClick={() => setActiveFilter('breach')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                activeFilter === 'breach' ? 'var(--accent-red)' : 'var(--bg-tertiary)',
              color: activeFilter === 'breach' ? 'white' : 'var(--text-secondary)',
            }}
          >
            SLA Breach ({stats.sla_breach})
          </button>
        </div>
      )}

      {/* Review Cards */}
      {filteredTasks.length === 0 ? (
        <div
          className="rounded-lg border p-12 text-center"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="text-6xl mb-4">🎉</div>
          <div className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No tasks pending your review
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            All caught up!
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <ReviewCard key={task.id} task={task} onActionComplete={handleActionComplete} />
          ))}
        </div>
      )}
    </div>
  )
}
