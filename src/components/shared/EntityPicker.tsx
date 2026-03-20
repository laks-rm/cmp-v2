'use client'

import { useState, useEffect } from 'react'

interface Entity {
  id: string
  name: string
  code: string
  country_flag_emoji: string
  entity_group: {
    name: string
  }
}

interface EntityPickerProps {
  value: string[]
  onChange: (entityIds: string[]) => void
}

export function EntityPicker({ value, onChange }: EntityPickerProps) {
  const [entities, setEntities] = useState<Entity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch('/api/entities')
        const data = await response.json()
        if (data.success) {
          setEntities(data.data.entities)
        }
      } catch (error) {
        console.error('Failed to fetch entities:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchEntities()
  }, [])

  const toggleEntity = (entityId: string) => {
    if (value.includes(entityId)) {
      onChange(value.filter((id) => id !== entityId))
    } else {
      onChange([...value, entityId])
    }
  }

  const selectedEntities = entities.filter((e) => value.includes(e.id))

  return (
    <div className="relative">
      {/* Selected entities display */}
      <div
        className="min-h-[40px] px-4 py-2 rounded-lg border cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          borderColor: 'var(--border-primary)',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedEntities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedEntities.map((entity) => (
              <span
                key={entity.id}
                className="px-2 py-1 rounded text-sm flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              >
                <span>{entity.country_flag_emoji}</span>
                <span>{entity.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleEntity(entity.id)
                  }}
                  className="ml-1 hover:opacity-70"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--text-tertiary)' }}>Select entities...</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown content */}
          <div
            className="absolute z-20 mt-2 w-full max-h-[300px] overflow-y-auto rounded-lg border shadow-lg"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            {isLoading ? (
              <div className="p-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
                Loading entities...
              </div>
            ) : entities.length === 0 ? (
              <div className="p-4 text-center" style={{ color: 'var(--text-tertiary)' }}>
                No entities found
              </div>
            ) : (
              <div className="p-2">
                {entities.map((entity) => {
                  const isSelected = value.includes(entity.id)
                  return (
                    <button
                      key={entity.id}
                      onClick={() => toggleEntity(entity.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded hover:opacity-80"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(255, 68, 79, 0.1)'
                          : 'transparent',
                        color: isSelected ? 'var(--accent-red)' : 'var(--text-primary)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="flex-shrink-0"
                      />
                      <span className="text-lg">{entity.country_flag_emoji}</span>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{entity.name}</div>
                        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {entity.entity_group.name}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
