'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function DashboardPage() {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setDashboardData(data.data)
      } else {
        throw new Error(data.error?.message || 'Failed to load dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [accessToken])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--accent-green)'
    if (score >= 60) return 'var(--accent-amber)'
    return 'var(--accent-red)'
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
        <div className="font-semibold mb-1">Error loading dashboard</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
        <button
          onClick={fetchDashboard}
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

  if (!dashboardData) return null

  const { stats, task_breakdown, entity_performance, recent_activity, weekly_activity } = dashboardData

  // Calculate overall compliance score
  const totalTasks =
    task_breakdown.completed +
    task_breakdown.in_progress +
    task_breakdown.pending_review +
    task_breakdown.overdue +
    task_breakdown.not_started
  const completionRate = totalTasks > 0 ? Math.round((task_breakdown.completed / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {format(new Date(), 'MMMM yyyy')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
            }}
          >
            Export
          </button>
          <button
            onClick={() => router.push('/sources/create')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              backgroundColor: 'var(--accent-red)',
            }}
          >
            + New Source
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          {
            label: 'Active Sources',
            value: stats.active_sources_count,
            color: 'var(--accent-blue)',
            trend: null,
          },
          {
            label: 'Tasks Completed',
            value: stats.tasks_completed_count,
            color: 'var(--accent-green)',
            trend: '+12%',
          },
          {
            label: 'Overdue',
            value: stats.overdue_count,
            color: 'var(--accent-red)',
            trend: stats.overdue_count > 0 ? '⚠️' : null,
          },
          {
            label: 'Pending Reviews',
            value: stats.pending_review_count,
            color: 'var(--accent-amber)',
            trend: null,
          },
          {
            label: 'Entities Monitored',
            value: stats.entities_monitored_count,
            color: 'var(--accent-purple)',
            trend: null,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border p-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold" style={{ color: stat.color }}>
                {stat.value}
              </div>
              {stat.trend && (
                <span className="text-xs font-medium" style={{ color: stat.color }}>
                  {stat.trend}
                </span>
              )}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Compliance Score Ring Chart */}
        <div
          className="lg:col-span-4 rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Overall Completion
          </h2>
          <div className="flex flex-col items-center">
            {/* SVG Donut Chart */}
            <svg width="200" height="200" viewBox="0 0 200 200" className="mb-4">
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="var(--bg-tertiary)"
                strokeWidth="20"
              />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={getScoreColor(completionRate)}
                strokeWidth="20"
                strokeDasharray={`${(completionRate / 100) * 502.4} 502.4`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
              <text
                x="100"
                y="100"
                textAnchor="middle"
                dy="0.3em"
                fontSize="42"
                fontWeight="bold"
                fill="var(--text-primary)"
              >
                {completionRate}%
              </text>
            </svg>
            <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              {task_breakdown.completed} of {totalTasks} tasks completed
            </p>
          </div>
        </div>

        {/* Task Breakdown */}
        <div
          className="lg:col-span-8 rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Task Breakdown
          </h2>
          <div className="space-y-4">
            {[
              { label: 'Completed', count: task_breakdown.completed, color: 'var(--accent-green)' },
              { label: 'In Progress', count: task_breakdown.in_progress, color: 'var(--accent-blue)' },
              { label: 'Pending Review', count: task_breakdown.pending_review, color: 'var(--accent-amber)' },
              { label: 'Overdue', count: task_breakdown.overdue, color: 'var(--accent-red)' },
              { label: 'Not Started', count: task_breakdown.not_started, color: 'var(--text-tertiary)' },
            ].map((item) => {
              const percentage = totalTasks > 0 ? (item.count / totalTasks) * 100 : 0
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: item.color }}>
                      {item.count} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Weekly Activity */}
        <div
          className="lg:col-span-6 rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
            Weekly Activity
          </h2>
          <div className="flex items-end justify-between gap-2 h-48">
            {weekly_activity.map((day: any) => {
              const maxValue = Math.max(...weekly_activity.map((d: any) => Math.max(d.created, d.completed)))
              const createdHeight = maxValue > 0 ? (day.created / maxValue) * 100 : 0
              const completedHeight = maxValue > 0 ? (day.completed / maxValue) * 100 : 0

              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-1 flex-1">
                    <div
                      className="w-1/2 rounded-t transition-all"
                      style={{
                        height: `${createdHeight}%`,
                        backgroundColor: 'var(--accent-blue)',
                        minHeight: createdHeight > 0 ? '4px' : '0',
                      }}
                      title={`Created: ${day.created}`}
                    />
                    <div
                      className="w-1/2 rounded-t transition-all"
                      style={{
                        height: `${completedHeight}%`,
                        backgroundColor: 'var(--accent-green)',
                        minHeight: completedHeight > 0 ? '4px' : '0',
                      }}
                      title={`Completed: ${day.completed}`}
                    />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {day.date}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent-blue)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Created</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent-green)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completed</span>
            </div>
          </div>
        </div>

        {/* Entity Performance */}
        <div
          className="lg:col-span-6 rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Top Entities
            </h2>
            <button
              onClick={() => router.push('/entities')}
              className="text-sm font-medium"
              style={{ color: 'var(--accent-teal)' }}
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {entity_performance.map((entity: any) => (
              <div
                key={entity.entity_id}
                onClick={() => router.push(`/tasks?entity_id=${entity.entity_id}`)}
                className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{entity.country_flag_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {entity.entity_name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {entity.task_count} tasks
                    </div>
                  </div>
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: getScoreColor(entity.compliance_score) }}
                >
                  {entity.compliance_score}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div
          className="lg:col-span-12 rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h2>
            <button
              onClick={() => router.push('/audit')}
              className="text-sm font-medium"
              style={{ color: 'var(--accent-teal)' }}
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recent_activity.map((log: any) => {
              const getIcon = (actionType: string) => {
                if (actionType.includes('create')) return '✓'
                if (actionType.includes('update')) return '📝'
                if (actionType.includes('delete')) return '🗑️'
                if (actionType.includes('approve')) return '✅'
                if (actionType.includes('reject')) return '❌'
                return '•'
              }

              const getChannelColor = (channel: string) => {
                switch (channel) {
                  case 'WEB': return { bg: 'rgba(96, 165, 250, 0.1)', text: 'var(--accent-blue)' }
                  case 'AI': return { bg: 'rgba(167, 139, 250, 0.1)', text: 'var(--accent-purple)' }
                  case 'SLACK': return { bg: 'rgba(52, 211, 153, 0.1)', text: 'var(--accent-green)' }
                  case 'SYSTEM': return { bg: 'rgba(251, 191, 36, 0.1)', text: 'var(--accent-amber)' }
                  case 'CRON': return { bg: 'rgba(139, 151, 176, 0.1)', text: 'var(--text-tertiary)' }
                  default: return { bg: 'rgba(139, 151, 176, 0.1)', text: 'var(--text-tertiary)' }
                }
              }

              const channelColor = getChannelColor(log.channel)

              return (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div className="text-lg">{getIcon(log.action_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {log.user?.name || 'System'}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                        style={{
                          backgroundColor: channelColor.bg,
                          color: channelColor.text,
                        }}
                      >
                        {log.channel}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
