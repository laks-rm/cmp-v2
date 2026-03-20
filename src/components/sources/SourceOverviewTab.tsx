'use client'

interface SourceOverviewTabProps {
  source: any
}

export function SourceOverviewTab({ source }: SourceOverviewTabProps) {
  const clauseCount = source.clauses?.length || 0
  const templateCount = source.clauses?.reduce(
    (sum: number, c: any) => sum + (c.task_templates?.length || 0),
    0
  ) || 0

  return (
    <div className="space-y-6">
      {/* Description */}
      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          Description
        </h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {source.description || 'No description provided'}
        </p>
      </div>

      {/* Entities in Scope */}
      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Entities in Scope
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {source.entities?.map((entity: any) => (
            <div
              key={entity.id}
              className="flex items-center gap-3 p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              <span className="text-2xl">{entity.country_flag_emoji}</span>
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                  {entity.name}
                </div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  {entity.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ownership & Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ownership */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Ownership
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Department</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {source.department?.name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Person in Charge</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {source.pic?.name || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Reviewer</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {source.reviewer?.name || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Created By</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {source.created_by_user?.name || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Key Dates */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Key Dates
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Effective From</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {new Date(source.effective_from).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Effective To</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {source.effective_to ? new Date(source.effective_to).toLocaleDateString() : 'Ongoing'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Created At</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {new Date(source.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Last Updated</span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {new Date(source.updated_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-tertiary)' }}>Version</span>
              <span className="font-medium font-mono" style={{ color: 'var(--accent-teal)' }}>
                v{source.version_number}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div
        className="rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Quick Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-blue)' }}>
              {clauseCount}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Clauses
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-purple)' }}>
              {templateCount}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Templates
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
              0
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Active Tasks
            </div>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="text-3xl font-bold mb-1" style={{ color: 'var(--accent-red)' }}>
              0
            </div>
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Overdue
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      {source.tags && source.tags.length > 0 && (
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {source.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
