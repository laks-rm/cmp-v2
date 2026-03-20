'use client'

interface WizardStepperProps {
  currentStep: number
  completedSteps: number[]
  onStepClick: (step: number) => void
}

const steps = [
  { number: 1, label: 'Source Info' },
  { number: 2, label: 'Clauses' },
  { number: 3, label: 'Task Templates' },
  { number: 4, label: 'Review & Activate' },
]

export function WizardStepper({ currentStep, completedSteps, onStepClick }: WizardStepperProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number)
          const isCurrent = currentStep === step.number
          const isClickable = isCompleted || isCurrent

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <button
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={`relative flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    isCurrent
                      ? 'ring-2 ring-offset-2 ring-[var(--accent-red)] ring-offset-[var(--bg-primary)]'
                      : ''
                  }`}
                  style={{
                    backgroundColor: isCompleted
                      ? 'var(--accent-red)'
                      : isCurrent
                      ? 'var(--accent-red)'
                      : 'var(--bg-tertiary)',
                    color: isCompleted || isCurrent ? 'white' : 'var(--text-tertiary)',
                  }}
                >
                  {isCompleted && step.number !== currentStep ? '✓' : step.number}
                </div>
                <span
                  className="text-xs mt-2 font-medium"
                  style={{
                    color: isCurrent || isCompleted ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className="h-0.5 flex-1 mx-2"
                  style={{
                    backgroundColor: completedSteps.includes(steps[index + 1].number)
                      ? 'var(--accent-red)'
                      : 'var(--border-primary)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
