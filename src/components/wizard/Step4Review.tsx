'use client'

import { useState } from 'react'
import { WizardState } from './WizardContainer'

interface Step4Props {
  state: WizardState
  isSaving: boolean
  onSave: (status: 'DRAFT' | 'ACTIVE') => void
  onBack: () => void
}

export function Step4Review({ state, isSaving, onSave, onBack }: Step4Props) {
  const [selectedStatus, setSelectedStatus] = useState<'DRAFT' | 'ACTIVE'>('DRAFT')

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
    <div className="space-y-8">
      {/* Source Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Source Information
        </h3>
        <div
          className="p-4 rounded-lg space-y-3"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Title:</span>
              <span className="ml-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                {state.source.title}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Type:</span>
              <span className="ml-2" style={{ color: 'var(--text-primary)' }}>
                {state.source.source_type.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Category:</span>
              <span className="ml-2" style={{ color: 'var(--text-primary)' }}>
                {state.source.category.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Risk Level:</span>
              <span className="ml-2" style={{ color: 'var(--text-primary)' }}>
                {state.source.risk_level.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Effective From:</span>
              <span className="ml-2" style={{ color: 'var(--text-primary)' }}>
                {state.source.effective_from}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-tertiary)' }}>Entities:</span>
              <span className="ml-2" style={{ color: 'var(--text-primary)' }}>
                {state.source.entity_ids.length} selected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Clauses Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Clauses Summary
        </h3>
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
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
                <th className="px-4 py-2 text-left">Clause Number</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Templates</th>
              </tr>
            </thead>
            <tbody>
              {state.clauses.map((clause) => (
                <tr key={clause.temp_id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td className="px-4 py-2 font-mono" style={{ color: 'var(--accent-teal)' }}>
                    {clause.clause_number}
                  </td>
                  <td className="px-4 py-2" style={{ color: 'var(--text-primary)' }}>
                    {clause.title}
                  </td>
                  <td className="px-4 py-2" style={{ color: 'var(--text-secondary)' }}>
                    {clause.task_templates.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Templates Summary */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Task Templates Summary
        </h3>
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold" style={{ color: 'var(--accent-blue)' }}>
                {totalTemplates}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Total Templates
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: 'var(--accent-amber)' }}>
                {reviewRequired}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Require Review
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold" style={{ color: 'var(--accent-green)' }}>
                {evidenceRequired}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Require Evidence
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Status Selection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedStatus('DRAFT')}
            className="p-4 rounded-lg border-2 text-left transition-all"
            style={{
              borderColor: selectedStatus === 'DRAFT' ? 'var(--text-tertiary)' : 'var(--border-primary)',
              backgroundColor: selectedStatus === 'DRAFT' ? 'rgba(139, 151, 176, 0.05)' : 'var(--bg-secondary)',
            }}
          >
            <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Draft
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Save for later. No tasks will be generated.
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('ACTIVE')}
            className="p-4 rounded-lg border-2 text-left transition-all"
            style={{
              borderColor: selectedStatus === 'ACTIVE' ? 'var(--accent-green)' : 'var(--border-primary)',
              backgroundColor: selectedStatus === 'ACTIVE' ? 'rgba(52, 211, 153, 0.05)' : 'var(--bg-secondary)',
            }}
          >
            <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Active
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Activate now. Tasks will be generated from the next cycle.
            </div>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          disabled={isSaving}
          className="px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          ← Back
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => onSave(selectedStatus)}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
            style={{
              backgroundColor: selectedStatus === 'DRAFT' ? 'var(--text-tertiary)' : 'var(--accent-green)',
            }}
          >
            {isSaving ? 'Saving...' : selectedStatus === 'DRAFT' ? 'Save as Draft' : 'Create & Activate'}
          </button>
        </div>
      </div>
    </div>
  )
}
