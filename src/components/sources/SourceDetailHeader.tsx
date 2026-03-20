'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

interface SourceDetailHeaderProps {
  source: any
  onUpdate: () => void
}

export function SourceDetailHeader({ source, onUpdate }: SourceDetailHeaderProps) {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [editValues, setEditValues] = useState({
    title: source.title,
    category: source.category,
    description: source.description || '',
    risk_level: source.risk_level,
    tags: source.tags || [],
  })

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/sources/${source.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editValues),
      })

      const data = await response.json()

      if (data.success) {
        setIsEditing(false)
        onUpdate()
      } else {
        alert(data.error?.message || 'Failed to update source')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update source')
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this source?')) return

    try {
      const response = await fetch(`/api/sources/${source.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        router.push('/sources')
      } else {
        alert(data.error?.message || 'Failed to archive source')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to archive source')
    }
  }

  const handleActivate = async () => {
    const newStatus = source.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
    const confirmMessage =
      newStatus === 'ACTIVE'
        ? 'Activate this source? Tasks will be generated automatically based on templates.'
        : 'Deactivate this source? No new tasks will be generated.'

    if (!confirm(confirmMessage)) return

    setIsActivating(true)

    try {
      const response = await fetch(`/api/sources/${source.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        if (newStatus === 'ACTIVE') {
          alert('Source activated! Tasks are being generated in the background.')
        }
      } else {
        alert(data.error?.message || 'Failed to update source status')
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update source status')
    } finally {
      setIsActivating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'var(--accent-green)'
      case 'DRAFT':
        return 'var(--text-tertiary)'
      case 'PENDING_ASSIGNMENT':
        return 'var(--accent-amber)'
      case 'INACTIVE':
        return 'var(--text-tertiary)'
      case 'ARCHIVED':
        return 'var(--accent-red)'
      default:
        return 'var(--text-tertiary)'
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
      {/* Header Row */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="text-sm font-mono font-semibold"
              style={{ color: 'var(--accent-teal)' }}
            >
              {source.code}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${getStatusColor(source.status)}20`,
                color: getStatusColor(source.status),
              }}
            >
              {source.status.replace(/_/g, ' ')}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                color: 'var(--accent-purple)',
              }}
            >
              {source.category.replace(/_/g, ' ')}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                color: 'var(--accent-blue)',
              }}
            >
              {source.source_type.replace(/_/g, ' ')}
            </span>
          </div>

          {isEditing ? (
            <input
              type="text"
              value={editValues.title}
              onChange={(e) => setEditValues({ ...editValues, title: e.target.value })}
              className="text-2xl font-bold w-full px-3 py-2 rounded"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                border: '1px solid',
              }}
            />
          ) : (
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {source.title}
            </h1>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditValues({
                    title: source.title,
                    category: source.category,
                    description: source.description || '',
                    risk_level: source.risk_level,
                    tags: source.tags || [],
                  })
                }}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{
                  backgroundColor: 'var(--accent-green)',
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              {source.status !== 'ARCHIVED' && (
                <button
                  onClick={handleActivate}
                  disabled={isActivating}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{
                    backgroundColor:
                      source.status === 'ACTIVE' ? 'var(--accent-amber)' : 'var(--accent-green)',
                  }}
                >
                  {isActivating
                    ? 'Processing...'
                    : source.status === 'ACTIVE'
                    ? 'Deactivate'
                    : 'Activate'}
                </button>
              )}
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                Edit
              </button>
              <button
                onClick={handleArchive}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'rgba(255, 68, 79, 0.1)',
                  color: 'var(--accent-red)',
                }}
              >
                Archive
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sub-header Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Department
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {source.department?.name || 'N/A'}
          </div>
        </div>

        <div>
          <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
            PIC
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {source.pic?.name || 'Unassigned'}
          </div>
        </div>

        <div>
          <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Reviewer
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {source.reviewer?.name || 'Unassigned'}
          </div>
        </div>

        <div>
          <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Risk Level
          </div>
          <div
            className="font-medium"
            style={{
              color:
                source.risk_level === 'HIGH'
                  ? 'var(--accent-red)'
                  : source.risk_level === 'MEDIUM'
                  ? 'var(--accent-amber)'
                  : source.risk_level === 'LOW'
                  ? 'var(--accent-green)'
                  : 'var(--text-tertiary)',
            }}
          >
            {source.risk_level.replace(/_/g, ' ')}
          </div>
        </div>

        <div>
          <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Effective From
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {new Date(source.effective_from).toLocaleDateString()}
          </div>
        </div>

        <div>
          <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Effective To
          </div>
          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {source.effective_to ? new Date(source.effective_to).toLocaleDateString() : 'Ongoing'}
          </div>
        </div>

        <div>
          <div className="mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Entities
          </div>
          <div className="flex gap-1">
            {source.entities?.slice(0, 5).map((entity: any) => (
              <span key={entity.id} className="text-lg">
                {entity.country_flag_emoji}
              </span>
            ))}
            {source.entities?.length > 5 && (
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                +{source.entities.length - 5}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
