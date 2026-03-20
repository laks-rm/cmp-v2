'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface ReportConfig {
  module: 'sources' | 'clauses' | 'tasks' | 'reviews' | 'entities' | 'audit'
  filters: Record<string, any>
  columns: string[]
  groupBy?: string
  sortBy?: string
  sortOrder: 'asc' | 'desc'
  format: 'table' | 'bar_chart' | 'summary'
}

const MODULE_OPTIONS = [
  { id: 'sources', label: 'Sources', icon: '📋', description: 'Compliance source documents' },
  { id: 'clauses', label: 'Clauses', icon: '📄', description: 'Compliance clauses' },
  { id: 'tasks', label: 'Tasks', icon: '✅', description: 'Task instances' },
  { id: 'reviews', label: 'Reviews', icon: '👁️', description: 'Review queue data' },
  { id: 'entities', label: 'Entities', icon: '🏢', description: 'Entity performance' },
  { id: 'audit', label: 'Audit Logs', icon: '📜', description: 'System audit trail' },
]

const COLUMN_OPTIONS: Record<string, string[]> = {
  sources: ['title', 'type', 'category', 'status', 'created_at', 'updated_at'],
  tasks: ['task_code', 'title', 'status', 'priority', 'due_date', 'entity.name', 'pic_user.name'],
  entities: ['name', 'code', 'country_flag_emoji', 'group.name', 'is_active'],
  audit: ['action_type', 'module', 'user.name', 'channel', 'timestamp', 'success'],
}

export default function ReportsPage() {
  const { accessToken } = useAuth()
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState<ReportConfig>({
    module: 'sources',
    filters: {},
    columns: [],
    sortOrder: 'desc',
    format: 'table',
  })
  const [results, setResults] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runReport = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'run',
          config,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data)
      } else {
        throw new Error(data.error?.message || 'Failed to run report')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report')
    } finally {
      setIsLoading(false)
    }
  }

  const exportCSV = () => {
    if (!results) return

    const headers = config.columns.join(',')
    const rows = results.results.map((row: any) =>
      config.columns.map((col) => JSON.stringify(row[col] || '')).join(',')
    )
    const csv = [headers, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Reports
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Build custom reports with configurable filters and columns
        </p>
      </div>

      {/* Report Builder */}
      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <button
                onClick={() => setStep(s)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step === s ? 'scale-110' : ''
                }`}
                style={{
                  backgroundColor: step >= s ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                  color: step >= s ? 'white' : 'var(--text-tertiary)',
                }}
              >
                {s}
              </button>
              {s < 4 && (
                <div
                  className="flex-1 h-0.5 mx-2"
                  style={{
                    backgroundColor: step > s ? 'var(--accent-red)' : 'var(--border-primary)',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Module */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Choose Module
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {MODULE_OPTIONS.map((module) => (
                <button
                  key={module.id}
                  onClick={() => {
                    setConfig({ ...config, module: module.id as any })
                    setStep(2)
                  }}
                  className="p-4 rounded-lg border text-left hover:opacity-80 transition-all"
                  style={{
                    backgroundColor:
                      config.module === module.id ? 'rgba(255, 68, 79, 0.1)' : 'var(--bg-tertiary)',
                    borderColor:
                      config.module === module.id ? 'var(--accent-red)' : 'var(--border-primary)',
                  }}
                >
                  <div className="text-3xl mb-2">{module.icon}</div>
                  <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {module.label}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {module.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Configure Filters */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Configure Filters (Optional)
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Filters coming soon. Click next to continue.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{
                  backgroundColor: 'var(--accent-red)',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Columns */}
        {step === 3 && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Choose Columns
            </h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {(COLUMN_OPTIONS[config.module] || []).map((col) => {
                const isSelected = config.columns.includes(col)
                return (
                  <button
                    key={col}
                    onClick={() => {
                      setConfig({
                        ...config,
                        columns: isSelected
                          ? config.columns.filter((c) => c !== col)
                          : [...config.columns, col],
                      })
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-primary)',
                    }}
                  >
                    {col}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={config.columns.length === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{
                  backgroundColor:
                    config.columns.length === 0 ? 'var(--text-tertiary)' : 'var(--accent-red)',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Sort & Format */}
        {step === 4 && (
          <div>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Sort & Format
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Sort By
                </label>
                <select
                  value={config.sortBy || ''}
                  onChange={(e) => setConfig({ ...config, sortBy: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid',
                  }}
                >
                  <option value="">None</option>
                  {config.columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Sort Order
                </label>
                <div className="flex gap-2">
                  {['asc', 'desc'].map((order) => (
                    <button
                      key={order}
                      onClick={() => setConfig({ ...config, sortOrder: order as any })}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor:
                          config.sortOrder === order ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                        color: config.sortOrder === order ? 'white' : 'var(--text-primary)',
                      }}
                    >
                      {order === 'asc' ? 'Ascending' : 'Descending'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                Back
              </button>
              <button
                onClick={runReport}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{
                  backgroundColor: isLoading ? 'var(--text-tertiary)' : 'var(--accent-red)',
                }}
              >
                {isLoading ? 'Running...' : 'Run Report'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="p-4 rounded-lg border-l-4 text-sm"
          style={{
            backgroundColor: 'rgba(255, 68, 79, 0.1)',
            borderColor: 'var(--accent-red)',
            color: 'var(--text-primary)',
          }}
        >
          {error}
        </div>
      )}

      {/* Results Preview */}
      {results && (
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Results Preview
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {results.totalCount} rows
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: 'var(--accent-green)',
                color: 'white',
              }}
            >
              Export CSV
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-primary)',
                }}
              >
                <tr>
                  {config.columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.results.slice(0, 100).map((row: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    {config.columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {typeof row[col] === 'object'
                          ? JSON.stringify(row[col])
                          : String(row[col] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.totalCount > 100 && (
            <p className="text-sm mt-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
              Showing first 100 rows. Export CSV to see all {results.totalCount} rows.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
