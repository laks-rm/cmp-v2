'use client'

export default function SlackConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Slack Configuration
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Configure Slack integration for notifications and task updates
        </p>
      </div>

      <div
        className="p-12 rounded-lg border text-center"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div className="text-6xl mb-4">🚧</div>
        <div className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Coming Soon
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Slack integration will be available in a future update
        </div>
      </div>
    </div>
  )
}
