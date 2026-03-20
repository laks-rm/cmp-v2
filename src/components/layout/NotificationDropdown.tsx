'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link_url: string | null
  is_read: boolean
  created_at: string
}

export function NotificationDropdown() {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.unread_count)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    if (!accessToken) return

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ids: notificationIds }),
      })

      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
    } catch (error) {
      console.error('Failed to mark notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!accessToken) return

    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ all: true }),
      })

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead([notification.id])
    }

    if (notification.link_url) {
      router.push(notification.link_url)
    }

    setIsOpen(false)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return '📋'
      case 'TASK_OVERDUE':
        return '⏰'
      case 'REVIEW_NEEDED':
        return '👁️'
      case 'ESCALATION':
        return '🚨'
      case 'SOURCE_CREATED':
        return '📄'
      case 'REMINDER':
        return '🔔'
      default:
        return '📬'
    }
  }

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    fetchNotifications()
  }, [accessToken])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [accessToken])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:opacity-80 transition-opacity"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-red)' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 max-h-[500px] rounded-lg border shadow-lg overflow-hidden z-50"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm font-medium"
                style={{ color: 'var(--accent-teal)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="animate-spin rounded-full h-6 w-6 border-b-2"
                  style={{ borderColor: 'var(--accent-red)' }}
                />
              </div>
            ) : notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full flex items-start gap-3 p-4 border-b hover:opacity-80 transition-opacity text-left"
                    style={{
                      borderColor: 'var(--border-primary)',
                      backgroundColor: notification.is_read
                        ? 'transparent'
                        : 'rgba(96, 165, 250, 0.05)',
                    }}
                  >
                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div
                          className="font-medium text-sm"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {notification.title}
                        </div>
                        {!notification.is_read && (
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                            style={{ backgroundColor: 'var(--accent-blue)' }}
                          />
                        )}
                      </div>
                      <p
                        className="text-xs mb-2 line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {notification.message}
                      </p>
                      <span
                        className="text-xs"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-4xl mb-2">🔕</div>
                <div
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  No new notifications
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="p-3 border-t text-center"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <button
                onClick={() => {
                  router.push('/notifications')
                  setIsOpen(false)
                }}
                className="text-sm font-medium"
                style={{ color: 'var(--accent-teal)' }}
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
