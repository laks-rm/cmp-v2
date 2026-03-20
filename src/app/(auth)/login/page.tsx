'use client'

import { useState, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  // Test users for easy login (matching actual seed data)
  const testUsers = [
    { role: 'Super Admin', email: 'laks.r@deriv.com', password: 'password123', color: 'var(--accent-red)' },
    { role: 'CMP Manager', email: 'sarah.m@deriv.com', password: 'password123', color: 'var(--accent-purple)' },
    { role: 'Reviewer', email: 'john.d@deriv.com', password: 'password123', color: 'var(--accent-blue)' },
    { role: 'Reviewer 2', email: 'maria.t@deriv.com', password: 'password123', color: 'var(--accent-amber)' },
    { role: 'PIC', email: 'ali.k@deriv.com', password: 'password123', color: 'var(--accent-green)' },
  ]

  const quickLogin = (user: typeof testUsers[0]) => {
    setEmail(user.email)
    setPassword(user.password)
  }

  // Validate email on blur
  const validateEmail = (value: string) => {
    if (!value) {
      setErrors((prev) => ({ ...prev, email: 'Email is required' }))
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }))
      return false
    }
    setErrors((prev) => ({ ...prev, email: undefined }))
    return true
  }

  // Validate password on blur
  const validatePassword = (value: string) => {
    if (!value) {
      setErrors((prev) => ({ ...prev, password: 'Password is required' }))
      return false
    }
    if (value.length < 8) {
      setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }))
      return false
    }
    setErrors((prev) => ({ ...prev, password: undefined }))
    return true
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Clear general error
    setErrors((prev) => ({ ...prev, general: undefined }))

    // Validate all fields
    const emailValid = validateEmail(email)
    const passwordValid = validatePassword(password)

    if (!emailValid || !passwordValid) {
      return
    }

    setIsLoading(true)

    try {
      // Call login API directly
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

      // On success, redirect to intended page or dashboard
      const redirect = searchParams.get('redirect') || '/'
      router.push(redirect)
      router.refresh() // Refresh to trigger auth state update
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Login failed. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className="w-full max-w-4xl"
      style={{ animation: 'slideIn 0.3s ease-out' }}
    >
      {/* Test User Cards */}
      <div className="mb-6">
        <p className="text-sm mb-3 text-center" style={{ color: 'var(--text-secondary)' }}>
          Quick Login (Test Users)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {testUsers.map((user) => (
            <button
              key={user.email}
              onClick={() => quickLogin(user)}
              className="p-3 rounded-lg border text-center hover:opacity-80 transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: user.color,
                borderWidth: '2px',
              }}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: user.color }}
              >
                {user.role.charAt(0)}
              </div>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {user.role}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Click to fill
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="rounded-lg p-8 shadow-lg"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-2xl"
              style={{ backgroundColor: 'var(--accent-red)' }}
            >
              D
            </div>
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            CMP 2.0
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Compliance Monitoring Platform
          </p>
        </div>

        {/* General Error */}
        {errors.general && (
          <div
            className="mb-6 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(255, 68, 79, 0.1)',
              border: '1px solid var(--accent-red)',
              color: 'var(--accent-red)',
            }}
          >
            {errors.general}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => validateEmail(e.target.value)}
              className="input-primary"
              placeholder="you@example.com"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: errors.email ? 'var(--accent-red)' : 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
            {errors.email && (
              <p
                className="mt-1 text-xs"
                style={{ color: 'var(--accent-red)' }}
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={(e) => validatePassword(e.target.value)}
              className="input-primary"
              placeholder="Enter your password"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: errors.password ? 'var(--accent-red)' : 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
            {errors.password && (
              <p
                className="mt-1 text-xs"
                style={{ color: 'var(--accent-red)' }}
              >
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent-red)',
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Users are created by administrators. Contact your admin for access.
          </p>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="mt-6 text-center">
        <p
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          © 2026 Deriv Group. All rights reserved.
        </p>
      </div>
    </div>
  )
}
