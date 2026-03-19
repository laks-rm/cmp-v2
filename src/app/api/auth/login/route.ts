import { NextRequest, NextResponse } from 'next/server'
import { loginSchema } from '@/lib/validators/auth'
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Rate limiting store (in production, use Redis)
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const attempts = loginAttempts.get(email)

  if (!attempts || now > attempts.resetAt) {
    loginAttempts.set(email, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }

  if (attempts.count >= 5) {
    return false
  }

  attempts.count++
  return true
}

function resetRateLimit(email: string) {
  loginAttempts.delete(email)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0].message,
            field: validation.error.errors[0].path[0],
          },
        },
        { status: 400 }
      )
    }

    const { email, password } = validation.data

    // Check rate limit
    if (!checkRateLimit(email.toLowerCase())) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          action_type: 'login_failed',
          module: 'System',
          channel: 'WEB',
          success: false,
          error_message: 'Rate limit exceeded',
          metadata: { email, reason: 'rate_limit' },
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again in 15 minutes.',
          },
        },
        { status: 429 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        department: true,
        entity_access: {
          include: {
            entity: true,
          },
        },
      },
    })

    // Check if user exists and password is correct (prevent timing attacks)
    const passwordValid = user
      ? await comparePassword(password, user.password_hash)
      : false

    if (!user || !passwordValid) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          action_type: 'login_failed',
          module: 'System',
          channel: 'WEB',
          success: false,
          error_message: 'Invalid credentials',
          metadata: { email, reason: 'invalid_credentials' },
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid email or password',
          },
        },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      // Log failed attempt
      await prisma.auditLog.create({
        data: {
          user_id: user.id,
          user_role: user.role,
          action_type: 'login_failed',
          module: 'System',
          channel: 'WEB',
          success: false,
          error_message: 'Account deactivated',
          metadata: { email, reason: 'account_deactivated' },
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Your account has been deactivated. Contact your administrator.',
          },
        },
        { status: 403 }
      )
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.role)
    const refreshToken = generateRefreshToken(user.id)

    // Reset rate limit on successful login
    resetRateLimit(email.toLowerCase())

    // Log successful login
    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        user_role: user.role,
        action_type: 'login_success',
        module: 'System',
        channel: 'WEB',
        success: true,
        metadata: { email },
      },
    })

    // Create response with httpOnly cookie
    const response = NextResponse.json(
      {
        success: true,
        data: {
          access_token: accessToken,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department
              ? {
                  id: user.department.id,
                  name: user.department.name,
                  code: user.department.code,
                }
              : null,
            entity_access: user.entity_access.map((access) => ({
              id: access.entity.id,
              name: access.entity.name,
              code: access.entity.code,
              country_flag_emoji: access.entity.country_flag_emoji,
            })),
          },
        },
      },
      { status: 200 }
    )

    // Set refresh token as httpOnly cookie
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during login. Please try again.',
        },
      },
      { status: 500 }
    )
  }
}
