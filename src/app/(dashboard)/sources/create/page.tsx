'use client'

import { WizardContainer } from '@/components/wizard/WizardContainer'

export default function CreateSourcePage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Create New Source
        </h1>
        <p
          className="text-sm mt-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Follow the wizard to create a compliance source with clauses and task templates
        </p>
      </div>

      <WizardContainer />
    </div>
  )
}
