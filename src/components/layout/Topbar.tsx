'use client'

import { useTheme } from '@/hooks/useTheme'

export function Topbar() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header 
      className="h-[52px] border-b transition-theme flex items-center justify-between px-6"
      style={{ 
        borderColor: 'var(--border-primary)',
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Left: Global Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search sources, tasks, users..."
            className="input-primary pl-10 pr-16 text-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)'
            }}
          />
          <kbd 
            className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs font-mono rounded"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="relative w-14 h-7 rounded-full transition-all duration-300 flex items-center"
          style={{
            backgroundColor: theme === 'dark' ? 'var(--bg-tertiary)' : 'var(--accent-amber)',
          }}
          aria-label="Toggle theme"
        >
          <span
            className="absolute w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center text-xs"
            style={{
              backgroundColor: theme === 'dark' ? 'var(--bg-secondary)' : '#fff',
              left: theme === 'dark' ? '4px' : 'calc(100% - 24px)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </span>
        </button>

        {/* AI Assistant */}
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          aria-label="AI Assistant"
        >
          <span className="text-lg">🤖</span>
        </button>

        {/* Notifications */}
        <button
          className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Notifications"
        >
          <span className="text-lg">🔔</span>
          {/* Unread indicator */}
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--accent-red)' }}
          />
        </button>
      </div>
    </header>
  )
}
