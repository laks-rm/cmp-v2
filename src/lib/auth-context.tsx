'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role: string
  team?: string | null
  department: {
    id: string
    name: string
    code: string
  } | null
  entity_access: Array<{
    id: string
    name: string
    code: string
    country_code: string
    country_flag_emoji: string
    group: {
      id: string
      name: string
      code: string
    }
  }>
}

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Fetch current user
  const fetchUser = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      if (data.success) {
        setUser(data.data)
        setAccessToken(token)
        return true
      }

      return false
    } catch (error) {
      console.error('Fetch user error:', error)
      return false
    }
  }

  // Try to refresh token
  const tryRefresh = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      if (data.success && data.data.access_token) {
        const success = await fetchUser(data.data.access_token)
        return success
      }

      return false
    } catch (error) {
      console.error('Refresh token error:', error)
      return false
    }
  }

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)

      // Try to refresh token
      const refreshed = await tryRefresh()

      if (!refreshed) {
        // No valid session, redirect to login if not already there
        const currentPath = window.location.pathname
        if (!currentPath.startsWith('/login')) {
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [router])

  // Login function
  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Login failed')
    }

    // Set user and token
    setUser(data.data.user)
    setAccessToken(data.data.access_token)
  }

  // Logout function
  const logout = async () => {
    try {
      if (accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setAccessToken(null)
      router.push('/login')
    }
  }

  // Refresh auth state
  const refreshAuth = async () => {
    const refreshed = await tryRefresh()
    if (!refreshed) {
      setUser(null)
      setAccessToken(null)
      router.push('/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, logout, refreshAuth }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
