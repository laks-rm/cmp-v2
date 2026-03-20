'use client'

import { useState, useEffect, useRef } from 'react'

interface Entity {
  id: string
  name: string
  code: string
  country_code: string
  country_flag_emoji: string
}

interface Group {
  id: string
  name: string
  entities: Entity[]
}

interface EntityPickerProps {
  selectedEntityIds: string[]
  onSelect: (ids: string[]) => void
  placeholder?: string
  error?: string
}

export function EntityPicker({
  selectedEntityIds,
  onSelect,
  placeholder = 'Search entities...',
  error,
}: EntityPickerProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/entities')
        const result = await response.json()
        if (result.success && result.data?.groups) {
          setGroups(result.data.groups)
        }
      } catch (error) {
        console.error('Failed to fetch entities:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen && groups.length === 0) {
      fetchEntities()
    }
  }, [isOpen, groups.length])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleEntity = (entityId: string) => {
    const newSelectedIds = selectedEntityIds.includes(entityId)
      ? selectedEntityIds.filter((id) => id !== entityId)
      : [...selectedEntityIds, entityId]
    onSelect(newSelectedIds)
  }

  const removeEntity = (entityId: string) => {
    onSelect(selectedEntityIds.filter((id) => id !== entityId))
  }

  const getAllEntities = (): Entity[] => {
    return groups.flatMap((group) => group.entities)
  }

  const getSelectedEntities = (): Entity[] => {
    const allEntities = getAllEntities()
    return selectedEntityIds
      .map((id) => allEntities.find((entity) => entity.id === id))
      .filter(Boolean) as Entity[]
  }

  const filterEntities = (): Group[] => {
    if (!searchTerm.trim()) {
      return groups
    }

    const term = searchTerm.toLowerCase()
    return groups
      .map((group) => ({
        ...group,
        entities: group.entities.filter(
          (entity) =>
            entity.name.toLowerCase().includes(term) ||
            entity.code.toLowerCase().includes(term) ||
            entity.country_code.toLowerCase().includes(term)
        ),
      }))
      .filter((group) => group.entities.length > 0)
  }

  const filteredGroups = filterEntities()
  const selectedEntities = getSelectedEntities()

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full input-primary"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            borderColor: error ? 'var(--accent-red)' : 'var(--border-primary)',
            paddingRight: '2.5rem',
          }}
        />
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {isOpen ? '▲' : '▼'}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
          {error}
        </p>
      )}

      {/* Selected Entity Tags */}
      {selectedEntities.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedEntities.map((entity) => (
            <div
              key={entity.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-hover)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              <span>{entity.country_flag_emoji}</span>
              <span>{entity.code}</span>
              <span style={{ color: 'var(--text-secondary)' }}>•</span>
              <span>{entity.name}</span>
              <button
                onClick={() => removeEntity(entity.id)}
                className="ml-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={`Remove ${entity.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 rounded-lg shadow-lg overflow-hidden animate-slideIn"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-primary)',
            maxHeight: '400px',
          }}
        >
          {loading ? (
            <div
              className="p-4 text-center text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Loading entities...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div
              className="p-4 text-center text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              No entities found
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
              {filteredGroups.map((group) => (
                <div key={group.id}>
                  {/* Group Header - Sticky */}
                  <div
                    className="sticky top-0 px-4 py-2 text-xs font-semibold uppercase tracking-wider z-10"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-tertiary)',
                      borderBottomWidth: '1px',
                      borderBottomStyle: 'solid',
                      borderBottomColor: 'var(--border-primary)',
                    }}
                  >
                    {group.name}
                  </div>

                  {/* Group Entities */}
                  {group.entities.map((entity) => {
                    const isSelected = selectedEntityIds.includes(entity.id)
                    return (
                      <button
                        key={entity.id}
                        onClick={() => toggleEntity(entity.id)}
                        className="w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors"
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(255, 68, 79, 0.05)'
                            : 'transparent',
                          color: 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{entity.country_flag_emoji}</span>
                          <div>
                            <div className="font-medium text-sm">
                              {entity.code}
                            </div>
                            <div
                              className="text-xs mt-0.5"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {entity.name}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            className="text-lg"
                            style={{ color: 'var(--accent-red)' }}
                          >
                            ✓
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
