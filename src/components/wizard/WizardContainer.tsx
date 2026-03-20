'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { WizardStepper } from './WizardStepper'
import { Step1SourceInfo } from './Step1SourceInfo'
import { Step2Clauses } from './Step2Clauses'
import { Step3TaskTemplates } from './Step3TaskTemplates'
import { Step4Review } from './Step4Review'

export interface WizardClause {
  temp_id: string
  clause_number: string
  title: string
  description?: string
  sequence_order: number
  is_active: boolean
  ai_generated: boolean
  task_templates: WizardTemplate[]
}

export interface WizardTemplate {
  temp_id: string
  title: string
  description?: string
  frequency: string
  frequency_config?: any
  due_date_offset_days: number
  review_required: boolean
  reviewer_logic?: string | null
  evidence_required: boolean
  evidence_description?: string | null
  expected_outcome?: string | null
  priority: string
  assignment_logic: string
  reminder_days_before: number[]
  escalation_days_after?: number | null
  escalation_to?: string | null
  is_active: boolean
  ai_generated: boolean
  sequence_order: number
}

export interface WizardState {
  step: 1 | 2 | 3 | 4
  source: {
    title: string
    source_type: string
    category: string
    description?: string
    entity_ids: string[]
    department_id: string
    effective_from: string
    effective_to?: string
    pic_user_id?: string | null
    reviewer_user_id?: string | null
    risk_level: string
    tags: string[]
  }
  clauses: WizardClause[]
  aiUpload: {
    file?: File
    status: 'idle' | 'uploading' | 'success' | 'error'
    error?: string
  }
  draftId: string | null
  isDirty: boolean
  lastSavedAt: Date | null
}

const initialState: WizardState = {
  step: 1,
  source: {
    title: '',
    source_type: '',
    category: '',
    description: '',
    entity_ids: [],
    department_id: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    pic_user_id: null,
    reviewer_user_id: null,
    risk_level: 'NOT_ASSESSED',
    tags: [],
  },
  clauses: [],
  aiUpload: {
    status: 'idle',
  },
  draftId: null,
  isDirty: false,
  lastSavedAt: null,
}

export function WizardContainer() {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [state, setState] = useState<WizardState>(initialState)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.isDirty])

  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({
      ...prev,
      ...updates,
      isDirty: true,
    }))
  }

  const handleStepClick = (step: number) => {
    if (completedSteps.includes(step) || step === state.step) {
      setState((prev) => ({ ...prev, step: step as 1 | 2 | 3 | 4 }))
    }
  }

  const validateStep1 = (): boolean => {
    const { title, source_type, category, department_id, entity_ids } = state.source
    return !!(title && source_type && category && department_id && entity_ids.length > 0)
  }

  const validateStep2 = (): boolean => {
    if (state.clauses.length === 0) return false
    return state.clauses.every((c) => c.clause_number && c.title)
  }

  const validateStep3 = (): boolean => {
    // Check all templates have required fields
    for (const clause of state.clauses) {
      for (const template of clause.task_templates) {
        if (!template.title) return false
        if (template.review_required && !template.reviewer_logic) return false
        if (template.escalation_days_after && template.escalation_days_after > 0 && !template.escalation_to) {
          return false
        }
      }
    }
    return true
  }

  const handleNext = () => {
    if (state.step === 1 && !validateStep1()) {
      alert('Please fill in all required fields')
      return
    }
    if (state.step === 2 && !validateStep2()) {
      alert('Please add at least one clause with clause number and title')
      return
    }
    if (state.step === 3 && !validateStep3()) {
      alert('Please ensure all templates have required fields')
      return
    }

    setCompletedSteps((prev) => [...new Set([...prev, state.step])])
    setState((prev) => ({ ...prev, step: (prev.step + 1) as 1 | 2 | 3 | 4 }))
  }

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: (prev.step - 1) as 1 | 2 | 3 | 4 }))
  }

  const handleSave = async (status: 'DRAFT' | 'ACTIVE') => {
    setIsSaving(true)

    try {
      const response = await fetch('/api/sources/wizard-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          source: state.source,
          clauses: state.clauses,
          status,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setState((prev) => ({ ...prev, isDirty: false }))
        router.push(`/sources/${data.data.source_id}`)
      } else {
        throw new Error(data.error?.message || 'Failed to save source')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to save source')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="rounded-lg border p-6"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-primary)',
      }}
    >
      <WizardStepper
        currentStep={state.step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      <div className="mt-8">
        {state.step === 1 && (
          <Step1SourceInfo state={state} updateState={updateState} />
        )}
        {state.step === 2 && (
          <Step2Clauses state={state} updateState={updateState} />
        )}
        {state.step === 3 && (
          <Step3TaskTemplates state={state} updateState={updateState} />
        )}
        {state.step === 4 && (
          <Step4Review state={state} isSaving={isSaving} onSave={handleSave} />
        )}
      </div>

      {/* Navigation Buttons */}
      {state.step < 4 && (
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={state.step === 1}
            className="px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            ← Back
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all"
            style={{
              backgroundColor: 'var(--accent-red)',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
