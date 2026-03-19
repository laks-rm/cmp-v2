export default function DashboardPage() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h1 
          className="text-4xl font-bold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Dashboard
        </h1>
        <p 
          className="text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          Coming Soon
        </p>
        <div className="mt-8">
          <div
            className="inline-block px-6 py-3 rounded-lg"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
            }}
          >
            <p 
              className="text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Dashboard layout is working correctly ✅
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
