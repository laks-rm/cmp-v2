'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  format,
  isSameDay,
  isBefore,
  startOfToday,
  eachDayOfInterval,
  isSameMonth,
} from 'date-fns'
import { EntityPicker } from '@/components/shared/EntityPicker'
import type { CalendarData } from '@/types'

export default function CalendarPage() {
  const router = useRouter()
  const { accessToken } = useAuth()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(false)
  const [showProjections, setShowProjections] = useState(true)

  // Filters
  const [entityIds, setEntityIds] = useState<string[]>([])
  const [sourceId, setSourceId] = useState('')
  const [departmentId, setDepartmentId] = useState('')

  // Sources and departments for filters
  const [sources, setSources] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  // Expanded days (for "show more")
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!accessToken) return

    // Fetch filter options
    Promise.all([
      fetch('/api/sources', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((res) => res.json()),
      fetch('/api/admin/departments', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((res) => res.json()),
    ]).then(([sourcesRes, deptsRes]) => {
      if (sourcesRes.success) setSources(sourcesRes.data)
      if (deptsRes.success) setDepartments(deptsRes.data)
    })
  }, [accessToken])

  useEffect(() => {
    fetchCalendarData()
  }, [currentMonth, entityIds, sourceId, departmentId, accessToken])

  const fetchCalendarData = async () => {
    if (!accessToken) return

    setLoading(true)
    try {
      const from = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const to = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

      const params = new URLSearchParams({ from, to })
      if (entityIds.length > 0) params.append('entity_id', entityIds[0])
      if (sourceId) params.append('source_id', sourceId)
      if (departmentId) params.append('department_id', departmentId)

      const response = await fetch(`/api/calendar?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      const result = await response.json()
      if (result.success) {
        setCalendarData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const handleToday = () => setCurrentMonth(new Date())

  const toggleDayExpanded = (dayKey: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey)
    } else {
      newExpanded.add(dayKey)
    }
    setExpandedDays(newExpanded)
  }

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const today = startOfToday()

  // Group tasks by date
  const tasksByDate = new Map<string, { generated: any[]; projected: any[] }>()
  if (calendarData) {
    calendarData.generated_tasks.forEach((task) => {
      const dateKey = task.due_date
      if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, { generated: [], projected: [] })
      tasksByDate.get(dateKey)!.generated.push(task)
    })
    calendarData.projected_tasks.forEach((task) => {
      const dateKey = task.projected_due_date
      if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, { generated: [], projected: [] })
      tasksByDate.get(dateKey)!.projected.push(task)
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'var(--accent-red)'
      case 'MEDIUM':
        return 'var(--accent-amber)'
      case 'LOW':
        return 'var(--accent-green)'
      default:
        return 'var(--text-secondary)'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            📅 Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            View generated tasks and projected future occurrences
          </p>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="px-3 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            ◀ Prev
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--accent-red)',
              color: 'white',
            }}
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="px-3 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Current month display */}
      <div className="text-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Filter bar */}
      <div
        className="p-4 rounded-lg flex items-center gap-4 flex-wrap"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '4px solid var(--accent-blue)',
        }}
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            Entity
          </label>
          <EntityPicker
            selectedEntityIds={entityIds}
            onSelect={setEntityIds}
            placeholder="All entities"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            Source
          </label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              border: '1px solid',
            }}
          >
            <option value="">All sources</option>
            {sources.map((src) => (
              <option key={src.id} value={src.id}>
                {src.code} - {src.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            Department
          </label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              border: '1px solid',
            }}
          >
            <option value="">All departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showProjections}
            onChange={(e) => setShowProjections(e.target.checked)}
            className="w-4 h-4"
          />
          <label className="text-sm" style={{ color: 'var(--text-primary)' }}>
            Show Projections
          </label>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
          Loading calendar...
        </div>
      ) : (
        <div
          className="rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Weekday headers */}
          <div
            className="grid grid-cols-7 border-b"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-bold"
                style={{ color: 'var(--text-secondary)' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const tasksForDay = tasksByDate.get(dateKey) || { generated: [], projected: [] }
              const isToday = isSameDay(day, today)
              const isPast = isBefore(day, today) && !isToday
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isExpanded = expandedDays.has(dateKey)

              const generatedTasks = tasksForDay.generated
              const projectedTasks = showProjections ? tasksForDay.projected : []
              const allItems = [...generatedTasks, ...projectedTasks]

              const maxVisible = isExpanded ? allItems.length : 3
              const visibleItems = allItems.slice(0, maxVisible)
              const hiddenCount = allItems.length - maxVisible

              return (
                <div
                  key={dateKey}
                  className="min-h-[120px] p-2 border-b border-r"
                  style={{
                    backgroundColor: isToday
                      ? 'rgba(255, 68, 79, 0.05)'
                      : isPast
                      ? 'var(--bg-tertiary)'
                      : 'var(--bg-primary)',
                    borderColor: isToday ? 'var(--accent-red)' : 'var(--border-primary)',
                    borderWidth: isToday ? '2px' : '1px',
                    opacity: isCurrentMonth ? 1 : 0.4,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: isToday ? 'var(--accent-red)' : 'var(--text-primary)',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {allItems.length > 0 && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'rgba(96, 165, 250, 0.2)',
                          color: 'var(--accent-blue)',
                        }}
                      >
                        {allItems.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {visibleItems.map((item, idx) => {
                      const isGenerated = 'id' in item
                      const priority = isGenerated ? item.priority : item.priority
                      const entityFlag = isGenerated
                        ? item.entity.country_flag_emoji
                        : item.entity_flag
                      const title = isGenerated ? item.title : item.task_title

                      return (
                        <div
                          key={isGenerated ? item.id : `proj-${idx}`}
                          onClick={() =>
                            isGenerated && router.push(`/tasks/${item.id}`)
                          }
                          className="text-xs px-2 py-1 rounded truncate"
                          style={{
                            backgroundColor: isGenerated
                              ? getPriorityColor(priority)
                              : 'transparent',
                            color: isGenerated ? 'white' : getPriorityColor(priority),
                            border: isGenerated ? 'none' : `1px dashed ${getPriorityColor(priority)}`,
                            opacity: isGenerated ? 1 : 0.6,
                            cursor: isGenerated ? 'pointer' : 'default',
                          }}
                          title={`${entityFlag} ${title}`}
                        >
                          {entityFlag} {title}
                        </div>
                      )
                    })}

                    {hiddenCount > 0 && (
                      <button
                        onClick={() => toggleDayExpanded(dateKey)}
                        className="text-xs underline"
                        style={{ color: 'var(--accent-blue)' }}
                      >
                        {isExpanded ? 'Show less' : `+${hiddenCount} more`}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="p-4 rounded-lg flex items-center gap-6"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'var(--accent-red)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            High Priority (Generated)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border-2"
            style={{ borderColor: 'var(--accent-red)', borderStyle: 'dashed' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            High Priority (Projected)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'var(--accent-amber)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Medium Priority
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: 'var(--accent-green)' }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Low Priority
          </span>
        </div>
      </div>
    </div>
  )
}
