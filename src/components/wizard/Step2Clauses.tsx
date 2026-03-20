'use client'

import { WizardState, WizardClause } from './WizardContainer'

interface Step2Props {
  state: WizardState
  updateState: (updates: Partial<WizardState>) => void
}

export function Step2Clauses({ state, updateState }: Step2Props) {
  const handleAddClause = () => {
    const newClause: WizardClause = {
      temp_id: `clause-${Date.now()}`,
      clause_number: '',
      title: '',
      description: '',
      sequence_order: state.clauses.length + 1,
      is_active: true,
      ai_generated: false,
      task_templates: [],
    }

    updateState({
      clauses: [...state.clauses, newClause],
    })
  }

  const handleUpdateClause = (tempId: string, field: string, value: any) => {
    updateState({
      clauses: state.clauses.map((c) =>
        c.temp_id === tempId ? { ...c, [field]: value } : c
      ),
    })
  }

  const handleDeleteClause = (tempId: string) => {
    updateState({
      clauses: state.clauses.filter((c) => c.temp_id !== tempId),
    })
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newClauses = [...state.clauses]
    ;[newClauses[index - 1], newClauses[index]] = [newClauses[index], newClauses[index - 1]]
    // Update sequence_order
    newClauses.forEach((c, i) => (c.sequence_order = i + 1))
    updateState({ clauses: newClauses })
  }

  const handleMoveDown = (index: number) => {
    if (index === state.clauses.length - 1) return
    const newClauses = [...state.clauses]
    ;[newClauses[index], newClauses[index + 1]] = [newClauses[index + 1], newClauses[index]]
    newClauses.forEach((c, i) => (c.sequence_order = i + 1))
    updateState({ clauses: newClauses })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Clauses
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Add the specific articles, sections, or checkpoints within this source
        </p>
      </div>

      {/* Clauses Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <table className="w-full">
          <thead
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase w-16">Actions</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase w-12">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Clause No.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase w-24">Active</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase w-24">Delete</th>
            </tr>
          </thead>
          <tbody>
            {state.clauses.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  No clauses added yet. Click "+ Add Clause" below to get started.
                </td>
              </tr>
            ) : (
              state.clauses.map((clause, index) => (
                <tr
                  key={clause.temp_id}
                  style={{ borderBottom: '1px solid var(--border-primary)' }}
                >
                  {/* Move Buttons */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === state.clauses.length - 1}
                        className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      >
                        ↓
                      </button>
                    </div>
                  </td>

                  {/* Sequence Number */}
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {index + 1}
                  </td>

                  {/* Clause Number */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={clause.clause_number}
                      onChange={(e) =>
                        handleUpdateClause(clause.temp_id, 'clause_number', e.target.value)
                      }
                      placeholder="e.g., Art.15"
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid',
                      }}
                    />
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={clause.title}
                      onChange={(e) =>
                        handleUpdateClause(clause.temp_id, 'title', e.target.value)
                      }
                      placeholder="Clause title"
                      className="w-full px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                        border: '1px solid',
                      }}
                    />
                  </td>

                  {/* Active Toggle */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={clause.is_active}
                      onChange={(e) =>
                        handleUpdateClause(clause.temp_id, 'is_active', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                  </td>

                  {/* Delete */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeleteClause(clause.temp_id)}
                      className="text-sm px-3 py-1 rounded hover:opacity-80"
                      style={{
                        color: 'var(--accent-red)',
                        backgroundColor: 'rgba(255, 68, 79, 0.1)',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Clause Button */}
      <button
        onClick={handleAddClause}
        className="px-4 py-2 rounded-lg font-medium transition-all"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        + Add Clause
      </button>
    </div>
  )
}
