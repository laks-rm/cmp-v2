'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface SourceClausesTabProps {
  source: any
  onUpdate: () => void
}

export function SourceClausesTab({ source, onUpdate }: SourceClausesTabProps) {
  const { accessToken } = useAuth()
  const [expandedClauses, setExpandedClauses] = useState<string[]>([])
  const [editingClause, setEditingClause] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isDraft = source.status === 'DRAFT'
  const clauses = source.clauses || []

  const toggleClause = (clauseId: string) => {
    setExpandedClauses((prev) =>
      prev.includes(clauseId) ? prev.filter((id) => id !== clauseId) : [...prev, clauseId]
    )
  }

  const handleAddClause = async () => {
    const clauseNumber = prompt('Enter clause number (e.g., Art.15):')
    if (!clauseNumber) return

    const title = prompt('Enter clause title:')
    if (!title) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/sources/${source.id}/clauses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clause_number: clauseNumber,
          title,
          is_active: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
      } else {
        alert(data.error?.message || 'Failed to add clause')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add clause')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClause = async (clauseId: string) => {
    if (!isDraft) {
      alert('Cannot delete clauses from an active source. Please deactivate the clause instead.')
      return
    }

    if (!confirm('Are you sure you want to delete this clause?')) return

    try {
      const response = await fetch(`/api/sources/${source.id}/clauses/${clauseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
      } else {
        alert(data.error?.message || 'Failed to delete clause')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete clause')
    }
  }

  const handleToggleClauseActive = async (clauseId: string) => {
    try {
      const response = await fetch(`/api/sources/${source.id}/clauses/${clauseId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
      } else {
        alert(data.error?.message || 'Failed to toggle clause status')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to toggle clause status')
    }
  }

  const handleAddTemplate = async (clauseId: string) => {
    const title = prompt('Enter task template title:')
    if (!title) return

    try {
      setIsSaving(true)
      const response = await fetch(`/api/sources/${source.id}/clauses/${clauseId}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title,
          frequency: 'MONTHLY',
          due_date_offset_days: 5,
          review_required: false,
          evidence_required: false,
          priority: 'MEDIUM',
          assignment_logic: 'DEPARTMENT_QUEUE',
          is_active: true,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        setExpandedClauses((prev) => [...prev, clauseId])
      } else {
        alert(data.error?.message || 'Failed to add template')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to add template')
    } finally {
      setIsSaving(false)
    }
  }

  if (clauses.length === 0) {
    return (
      <div
        className="rounded-lg border p-12 text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="text-4xl mb-3">📋</div>
        <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          No clauses yet
        </div>
        <div className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          Add clauses to define the specific requirements within this source
        </div>
        <button
          onClick={handleAddClause}
          disabled={isSaving}
          className="px-6 py-2 rounded-lg font-medium text-white"
          style={{
            backgroundColor: 'var(--accent-red)',
          }}
        >
          + Add Clause
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add Clause Button */}
      <div className="flex justify-end">
        <button
          onClick={handleAddClause}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg font-medium"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          + Add Clause
        </button>
      </div>

      {/* Clauses Accordion */}
      {clauses.map((clause: any) => {
        const isExpanded = expandedClauses.includes(clause.id)
        const templates = clause.task_templates || []

        return (
          <div
            key={clause.id}
            className="rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            {/* Clause Header */}
            <div className="p-4 flex items-center justify-between">
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => toggleClause(clause.id)}
              >
                <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: 'var(--accent-teal)' }}
                >
                  {clause.clause_number}
                </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {clause.title}
                </span>
                {!clause.is_active && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: 'rgba(139, 151, 176, 0.1)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    Inactive
                  </span>
                )}
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    color: 'var(--accent-blue)',
                  }}
                >
                  {templates.length} {templates.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAddTemplate(clause.id)}
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--accent-red)',
                    color: 'white',
                  }}
                >
                  + Add Task
                </button>
                <button
                  onClick={() => handleToggleClauseActive(clause.id)}
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {clause.is_active ? 'Deactivate' : 'Activate'}
                </button>
                {isDraft && (
                  <button
                    onClick={() => handleDeleteClause(clause.id)}
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(255, 68, 79, 0.1)',
                      color: 'var(--accent-red)',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Templates */}
            {isExpanded && (
              <div
                className="p-4 space-y-3"
                style={{ borderTop: '1px solid var(--border-primary)' }}
              >
                {templates.length === 0 ? (
                  <div className="text-center py-6" style={{ color: 'var(--text-tertiary)' }}>
                    No task templates yet. Click "+ Add Task" to create one.
                  </div>
                ) : (
                  templates.map((template: any) => (
                    <div
                      key={template.id}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-primary)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            {template.title}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span
                              className="px-2 py-1 rounded"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {template.frequency}
                            </span>
                            <span
                              className="px-2 py-1 rounded"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Due: +{template.due_date_offset_days}d
                            </span>
                            <span
                              className="px-2 py-1 rounded"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              Priority: {template.priority}
                            </span>
                            {template.review_required && (
                              <span
                                className="px-2 py-1 rounded"
                                style={{
                                  backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                  color: 'var(--accent-amber)',
                                }}
                              >
                                Review Required
                              </span>
                            )}
                            {template.evidence_required && (
                              <span
                                className="px-2 py-1 rounded"
                                style={{
                                  backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                  color: 'var(--accent-blue)',
                                }}
                              >
                                Evidence Required
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: template.is_active
                              ? 'var(--accent-green)'
                              : 'var(--text-tertiary)',
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
