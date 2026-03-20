'use client'

import { useState } from 'react'
import { WizardState, WizardTemplate } from './WizardContainer'

interface Step3Props {
  state: WizardState
  updateState: (updates: Partial<WizardState>) => void
}

export function Step3TaskTemplates({ state, updateState }: Step3Props) {
  const [expandedClauses, setExpandedClauses] = useState<string[]>([])

  const toggleClause = (tempId: string) => {
    setExpandedClauses((prev) =>
      prev.includes(tempId) ? prev.filter((id) => id !== tempId) : [...prev, tempId]
    )
  }

  const handleAddTemplate = (clauseTempId: string) => {
    const clause = state.clauses.find((c) => c.temp_id === clauseTempId)
    if (!clause) return

    const newTemplate: WizardTemplate = {
      temp_id: `template-${Date.now()}`,
      title: '',
      description: '',
      frequency: 'MONTHLY',
      due_date_offset_days: 0,
      first_execution_date: state.source.effective_from || new Date().toISOString().split('T')[0],
      review_required: false,
      reviewer_logic: null,
      evidence_required: false,
      evidence_description: null,
      expected_outcome: null,
      priority: 'MEDIUM',
      assignment_logic: 'DEPARTMENT_QUEUE',
      reminder_days_before: [],
      escalation_days_after: null,
      escalation_to: null,
      is_active: true,
      ai_generated: false,
      sequence_order: clause.task_templates.length + 1,
    }

    updateState({
      clauses: state.clauses.map((c) =>
        c.temp_id === clauseTempId
          ? { ...c, task_templates: [...c.task_templates, newTemplate] }
          : c
      ),
    })
  }

  const handleUpdateTemplate = (
    clauseTempId: string,
    templateTempId: string,
    field: string,
    value: any
  ) => {
    updateState({
      clauses: state.clauses.map((c) =>
        c.temp_id === clauseTempId
          ? {
              ...c,
              task_templates: c.task_templates.map((t) =>
                t.temp_id === templateTempId ? { ...t, [field]: value } : t
              ),
            }
          : c
      ),
    })
  }

  const handleDeleteTemplate = (clauseTempId: string, templateTempId: string) => {
    updateState({
      clauses: state.clauses.map((c) =>
        c.temp_id === clauseTempId
          ? {
              ...c,
              task_templates: c.task_templates.filter((t) => t.temp_id !== templateTempId),
            }
          : c
      ),
    })
  }

  const totalTemplates = state.clauses.reduce((sum, c) => sum + c.task_templates.length, 0)
  const reviewRequired = state.clauses.reduce(
    (sum, c) => sum + c.task_templates.filter((t) => t.review_required).length,
    0
  )
  const evidenceRequired = state.clauses.reduce(
    (sum, c) => sum + c.task_templates.filter((t) => t.evidence_required).length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div
        className="p-4 rounded-lg"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderLeft: '4px solid var(--accent-blue)',
        }}
      >
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {state.clauses.length} clauses, {totalTemplates} templates. {reviewRequired} require
          review, {evidenceRequired} require evidence.
        </div>
      </div>

      {/* Accordion */}
      <div className="space-y-4">
        {state.clauses.map((clause) => {
          const isExpanded = expandedClauses.includes(clause.temp_id)

          return (
            <div
              key={clause.temp_id}
              className="rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              {/* Clause Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => toggleClause(clause.temp_id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                  <div>
                    <span
                      className="font-mono text-sm"
                      style={{ color: 'var(--accent-teal)' }}
                    >
                      {clause.clause_number}
                    </span>
                    <span className="mx-2">—</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {clause.title}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(96, 165, 250, 0.1)',
                      color: 'var(--accent-blue)',
                    }}
                  >
                    {clause.task_templates.length} tasks
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddTemplate(clause.temp_id)
                  }}
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--accent-red)',
                    color: 'white',
                  }}
                >
                  + Add Task
                </button>
              </div>

              {/* Templates */}
              {isExpanded && (
                <div className="p-4 space-y-4" style={{ borderTop: '1px solid var(--border-primary)' }}>
                  {clause.task_templates.length === 0 ? (
                    <div className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                      No task templates yet. Click "+ Add Task" to create one.
                    </div>
                  ) : (
                    clause.task_templates.map((template) => (
                      <div
                        key={template.temp_id}
                        className="p-4 rounded-lg border space-y-3"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderColor: 'var(--border-primary)',
                        }}
                      >
                        {/* Row 1: Title, Priority, Delete */}
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={template.title}
                            onChange={(e) =>
                              handleUpdateTemplate(clause.temp_id, template.temp_id, 'title', e.target.value)
                            }
                            placeholder="Task template title"
                            className="flex-1 px-3 py-2 rounded text-sm"
                            style={{
                              backgroundColor: 'var(--bg-tertiary)',
                              borderColor: 'var(--border-primary)',
                              color: 'var(--text-primary)',
                              border: '1px solid',
                            }}
                          />
                          <select
                            value={template.priority}
                            onChange={(e) =>
                              handleUpdateTemplate(clause.temp_id, template.temp_id, 'priority', e.target.value)
                            }
                            className="px-3 py-2 rounded text-sm"
                            style={{
                              backgroundColor: 'var(--bg-tertiary)',
                              borderColor: 'var(--border-primary)',
                              border: '1px solid',
                            }}
                          >
                            <option value="HIGH">High</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="LOW">Low</option>
                          </select>
                          <button
                            onClick={() => handleDeleteTemplate(clause.temp_id, template.temp_id)}
                            className="px-3 py-2 rounded text-sm"
                            style={{
                              color: 'var(--accent-red)',
                              backgroundColor: 'rgba(255, 68, 79, 0.1)',
                            }}
                          >
                            Delete
                          </button>
                        </div>

                        {/* Row 2: Frequency, First Task Due Date */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                              Frequency
                            </label>
                            <select
                              value={template.frequency}
                              onChange={(e) =>
                                handleUpdateTemplate(clause.temp_id, template.temp_id, 'frequency', e.target.value)
                              }
                              className="w-full px-3 py-2 rounded text-sm"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-primary)',
                                border: '1px solid',
                              }}
                            >
                              <option value="DAILY">Daily</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="QUARTERLY">Quarterly</option>
                              <option value="ANNUALLY">Annually</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                              First Task Due Date
                            </label>
                            <input
                              type="date"
                              value={template.first_execution_date}
                              onChange={(e) =>
                                handleUpdateTemplate(
                                  clause.temp_id,
                                  template.temp_id,
                                  'first_execution_date',
                                  e.target.value
                                )
                              }
                              className="w-full px-3 py-2 rounded text-sm"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-primary)',
                                border: '1px solid',
                              }}
                            />
                          </div>
                        </div>

                        {/* Row 3: Review Required */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={template.review_required}
                            onChange={(e) =>
                              handleUpdateTemplate(
                                clause.temp_id,
                                template.temp_id,
                                'review_required',
                                e.target.checked
                              )
                            }
                            className="w-4 h-4"
                          />
                          <label className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            Review Required
                          </label>
                          {template.review_required && (
                            <select
                              value={template.reviewer_logic || ''}
                              onChange={(e) =>
                                handleUpdateTemplate(
                                  clause.temp_id,
                                  template.temp_id,
                                  'reviewer_logic',
                                  e.target.value
                                )
                              }
                              className="ml-auto px-3 py-1 rounded text-sm"
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-primary)',
                                border: '1px solid',
                              }}
                            >
                              <option value="">Select reviewer logic...</option>
                              <option value="SOURCE_REVIEWER">Source Reviewer</option>
                              <option value="DEPT_MANAGER">Department Manager</option>
                              <option value="FIXED_USER">Fixed User</option>
                            </select>
                          )}
                        </div>

                        {/* Row 4: Evidence Required */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={template.evidence_required}
                            onChange={(e) =>
                              handleUpdateTemplate(
                                clause.temp_id,
                                template.temp_id,
                                'evidence_required',
                                e.target.checked
                              )
                            }
                            className="w-4 h-4"
                          />
                          <label className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            Evidence Required
                          </label>
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
    </div>
  )
}
