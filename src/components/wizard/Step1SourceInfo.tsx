'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { WizardState } from './WizardContainer'
import { EntityPicker } from '@/components/shared/EntityPicker'

interface Step1Props {
  state: WizardState
  updateState: (updates: Partial<WizardState>) => void
}

interface Department {
  id: string
  name: string
  code: string
}

export function Step1SourceInfo({ state, updateState }: Step1Props) {
  const { accessToken } = useAuth()
  const [entryMode, setEntryMode] = useState<'manual' | 'ai'>('manual')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(false)

  useEffect(() => {
    const fetchDepartments = async () => {
      if (!accessToken) return
      
      setLoadingDepartments(true)
      try {
        const response = await fetch('/api/admin/departments', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        const result = await response.json()
        if (result.success && result.data?.departments) {
          setDepartments(result.data.departments)
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error)
      } finally {
        setLoadingDepartments(false)
      }
    }

    fetchDepartments()
  }, [accessToken])
  const handleFieldChange = (field: string, value: any) => {
    updateState({
      source: {
        ...state.source,
        [field]: value,
      },
    })
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateField = (field: string, value: any) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      setErrors((prev) => ({ ...prev, [field]: 'This field is required' }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Entry Mode Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => setEntryMode('manual')}
          className="p-4 rounded-lg border-2 text-left transition-all"
          style={{
            borderColor: entryMode === 'manual' ? 'var(--accent-red)' : 'var(--border-primary)',
            backgroundColor: entryMode === 'manual' ? 'rgba(255, 68, 79, 0.05)' : 'var(--bg-secondary)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">✚</span>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Manual Entry
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Fill in source details manually
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setEntryMode('ai')}
          className="p-4 rounded-lg border-2 text-left transition-all"
          style={{
            borderColor: entryMode === 'ai' ? 'var(--accent-purple)' : 'var(--border-primary)',
            backgroundColor: entryMode === 'ai' ? 'rgba(167, 139, 250, 0.05)' : 'var(--bg-secondary)',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Upload Regulation
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                AI will parse and populate clauses
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* AI Upload Area */}
      {entryMode === 'ai' && (
        <div
          className="p-8 rounded-lg border-2 border-dashed text-center"
          style={{ borderColor: 'var(--border-secondary)' }}
        >
          <div className="text-4xl mb-3">📄</div>
          <div className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Drop a PDF, DOCX, or TXT file here, or click to browse
          </div>
          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Max file size: 25MB
          </div>
          <div className="mt-4 text-xs" style={{ color: 'var(--accent-purple)' }}>
            AI parsing will be available in Phase 2
          </div>
        </div>
      )}

      {/* Form Fields - Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Title <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <input
              type="text"
              value={state.source.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              onBlur={(e) => validateField('title', e.target.value)}
              className="w-full input-primary"
              placeholder="e.g., GDPR Data Protection"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: errors.title ? 'var(--accent-red)' : 'var(--border-primary)',
              }}
            />
            {errors.title && (
              <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                {errors.title}
              </p>
            )}
          </div>

          {/* Source Type */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Source Type <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <select
              value={state.source.source_type}
              onChange={(e) => handleFieldChange('source_type', e.target.value)}
              onBlur={(e) => validateField('source_type', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: errors.source_type ? 'var(--accent-red)' : 'var(--border-primary)',
              }}
            >
              <option value="">Select type...</option>
              <option value="REGULATION">Regulation</option>
              <option value="INTERNAL_AUDIT">Internal Audit</option>
              <option value="EXTERNAL_AUDIT">External Audit</option>
              <option value="POLICY">Policy</option>
              <option value="SOP">SOP</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Category <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <select
              value={state.source.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <option value="">Select category...</option>
              <option value="AML">AML</option>
              <option value="SANCTIONS">Sanctions</option>
              <option value="REGULATORY_REPORTING">Regulatory Reporting</option>
              <option value="LICENSE">License</option>
              <option value="DATA_PROTECTION">Data Protection</option>
              <option value="CONSUMER_PROTECTION">Consumer Protection</option>
              <option value="IT_SECURITY">IT Security</option>
              <option value="GOVERNANCE">Governance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Description
            </label>
            <textarea
              value={state.source.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full input-primary"
              rows={4}
              placeholder="Describe the compliance requirement..."
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
              }}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Department */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Department <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <select
              value={state.source.department_id}
              onChange={(e) => handleFieldChange('department_id', e.target.value)}
              onBlur={(e) => validateField('department_id', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: errors.department_id ? 'var(--accent-red)' : 'var(--border-primary)',
              }}
              disabled={loadingDepartments}
            >
              <option value="">
                {loadingDepartments ? 'Loading departments...' : 'Select department...'}
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.department_id && (
              <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                {errors.department_id}
              </p>
            )}
          </div>

          {/* Effective From */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Effective From <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <input
              type="date"
              value={state.source.effective_from}
              onChange={(e) => handleFieldChange('effective_from', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
              }}
            />
          </div>

          {/* Effective To */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Effective To (optional)
            </label>
            <input
              type="date"
              value={state.source.effective_to}
              onChange={(e) => handleFieldChange('effective_to', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
              }}
            />
          </div>

          {/* Risk Level */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Risk Level
            </label>
            <select
              value={state.source.risk_level}
              onChange={(e) => handleFieldChange('risk_level', e.target.value)}
              className="w-full input-primary"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <option value="NOT_ASSESSED">Not Assessed</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Entities Picker */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Entities in Scope <span style={{ color: 'var(--accent-red)' }}>*</span>
        </label>
        <EntityPicker
          selectedEntityIds={state.source.entity_ids || []}
          onSelect={(ids) => handleFieldChange('entity_ids', ids)}
          placeholder="Search entities..."
          error={errors.entity_ids}
        />
      </div>
    </div>
  )
}
