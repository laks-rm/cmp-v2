'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface NavItem {
  label: string
  icon: string
  href: string
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navigationSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: '📊', href: '/' },
    ],
  },
  {
    title: 'Compliance Ops',
    items: [
      { label: 'Sources', icon: '📋', href: '/sources' },
      { label: 'Task Plans', icon: '📝', href: '/task-plans' },
      { label: 'Task Tracker', icon: '✅', href: '/tasks', badge: 12 },
      { label: 'Review Queue', icon: '👁️', href: '/review', badge: 5 },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Entities', icon: '🏢', href: '/entities' },
      { label: 'Groups', icon: '🌍', href: '/groups' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'Reports', icon: '📈', href: '/reports' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Audit Logs', icon: '📜', href: '/audit' },
      { label: 'Admin Console', icon: '⚙️', href: '/admin' },
      { label: 'Slack Config', icon: '💬', href: '/slack' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="w-[232px] md:w-[232px] sm:w-[52px] h-screen border-r transition-theme flex flex-col"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-primary)',
      }}
    >
      {/* Logo & Brand */}
      <div 
        className="h-[52px] border-b flex items-center px-4 gap-3"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div
          className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-red)' }}
        >
          D
        </div>
        <div className="hidden md:block">
          <div 
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            CMP 2.0
          </div>
          <div 
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Compliance Platform
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navigationSections.map((section, sectionIdx) => (
          <div key={section.title} className={sectionIdx > 0 ? 'mt-6' : ''}>
            <div
              className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider hidden md:block"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href)
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative group"
                    style={{
                      backgroundColor: active ? 'rgba(255, 68, 79, 0.1)' : 'transparent',
                      color: active ? 'var(--accent-red)' : 'var(--text-secondary)',
                    }}
                  >
                    {/* Active indicator */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r"
                        style={{ backgroundColor: 'var(--accent-red)' }}
                      />
                    )}
                    
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left text-sm font-medium hidden md:block">
                      {item.label}
                    </span>
                    
                    {item.badge && item.badge > 0 && (
                      <span
                        className="hidden md:flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: 'var(--accent-red)' }}
                      >
                        {item.badge}
                      </span>
                    )}
                    
                    {/* Hover effect */}
                    {!active && (
                      <span
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: 'var(--bg-hover)' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div
        className="border-t p-3"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar with gradient */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--accent-red) 0%, var(--accent-purple) 100%)',
            }}
          >
            {user?.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U'}
          </div>
          <div className="flex-1 hidden md:block">
            <div
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {user?.name || 'User'}
            </div>
            <div
              className="text-xs truncate"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {user?.role.replace(/_/g, ' ') || 'User'}
            </div>
          </div>
          {/* Logout button (desktop only) */}
          <button
            onClick={logout}
            className="hidden md:block w-8 h-8 rounded flex items-center justify-center transition-all"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-tertiary)',
            }}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>
  )
}
