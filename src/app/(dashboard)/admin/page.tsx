'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function AdminConsolePage() {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const fetchUsers = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({ page: '1', limit: '50' })
      if (search) params.append('search', search)
      if (activeFilter !== 'all') params.append('role', activeFilter)

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setUsers(data.data.users)
        setStats(data.data.stats)
      } else {
        throw new Error(data.error?.message || 'Failed to load users')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [search, activeFilter, accessToken])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return { bg: 'rgba(255, 68, 79, 0.1)', text: 'var(--accent-red)' }
      case 'ADMIN':
        return { bg: 'rgba(255, 68, 79, 0.1)', text: 'var(--accent-red)' }
      case 'CMP_MANAGER':
        return { bg: 'rgba(167, 139, 250, 0.1)', text: 'var(--accent-purple)' }
      case 'DEPT_MANAGER':
        return { bg: 'rgba(251, 191, 36, 0.1)', text: 'var(--accent-amber)' }
      case 'REVIEWER':
        return { bg: 'rgba(96, 165, 250, 0.1)', text: 'var(--accent-blue)' }
      case 'PIC':
        return { bg: 'rgba(52, 211, 153, 0.1)', text: 'var(--accent-green)' }
      default:
        return { bg: 'rgba(139, 151, 176, 0.1)', text: 'var(--text-tertiary)' }
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent-red)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border-l-4 text-sm"
        style={{
          backgroundColor: 'rgba(255, 68, 79, 0.1)',
          borderColor: 'var(--accent-red)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="font-semibold mb-1">Error loading admin console</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
        <button
          onClick={fetchUsers}
          className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--accent-red)',
            color: 'white',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Admin Console
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            User management, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/add-user')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{
            backgroundColor: 'var(--accent-red)',
          }}
        >
          + Add User
        </button>
      </div>

      {/* Stats Strip */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.total, color: 'var(--accent-blue)' },
            { label: 'Active', value: stats.active, color: 'var(--accent-green)' },
            { label: 'Roles Defined', value: stats.roles, color: 'var(--accent-purple)' },
            { label: 'Pending Invites', value: stats.pending_invites, color: 'var(--accent-amber)' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border p-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <div className="text-3xl font-bold mb-1" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick View Chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Users' },
          { id: 'SUPER_ADMIN', label: 'Super Admin' },
          { id: 'CMP_MANAGER', label: 'CMP Manager' },
          { id: 'REVIEWER', label: 'Reviewer' },
          { id: 'PIC', label: 'PIC' },
          { id: 'AI_ACTION_USER', label: 'AI Users' },
        ].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor:
                activeFilter === filter.id ? 'var(--accent-red)' : 'var(--bg-tertiary)',
              color: activeFilter === filter.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        className="w-full px-4 py-2 rounded-lg text-sm"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
          border: '1px solid',
        }}
      />

      {/* Users List */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <table className="w-full">
          <thead
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-primary)',
            }}
          >
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Entities</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleColor = getRoleColor(user.role)
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                        style={{
                          background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                          color: 'white',
                        }}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {user.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div
                            className={`w-2 h-2 rounded-full`}
                            style={{
                              backgroundColor: user.is_active ? 'var(--accent-green)' : 'var(--text-tertiary)',
                            }}
                          />
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {user.is_active ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: roleColor.bg,
                        color: roleColor.text,
                      }}
                    >
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {user.department?.name || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {user.entity_access?.slice(0, 3).map((ea: any) => (
                        <span key={ea.id} className="text-sm">
                          {ea.entity.country_flag_emoji}
                        </span>
                      ))}
                      {user.entity_access && user.entity_access.length > 3 && (
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          +{user.entity_access.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-1 rounded text-xs"
                      style={{
                        backgroundColor: user.is_active ? 'rgba(52, 211, 153, 0.1)' : 'rgba(139, 151, 176, 0.1)',
                        color: user.is_active ? 'var(--accent-green)' : 'var(--text-tertiary)',
                      }}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="px-3 py-1 rounded text-sm font-medium hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
          No users found
        </div>
      )}
    </div>
  )
}
