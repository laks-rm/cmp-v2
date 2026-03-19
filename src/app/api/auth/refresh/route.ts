import { NextRequest, NextResponse } from 'next/server'
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Extract refresh token from httpOnly cookie
    const refreshToken = request.cookies.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'No refresh token provided',
          },
        },
        { status: 401 }
      )
    }

    // Verify refresh token
    let decoded
    try {
      decoded = verifyRefreshToken(refreshToken)
    } catch (error) {
      // Clear invalid refresh token cookie
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: error instanceof Error ? error.message : 'Invalid refresh token',
          },
        },
        { status: 401 }
      )

      response.cookies.delete('refresh_token')
      return response
    }

    // Fetch user to get current role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, is_active: true },
    })

    if (!user) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )

      response.cookies.delete('refresh_token')
      return response
    }

    // Check if user is still active
    if (!user.is_active) {
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Your account has been deactivated',
          },
        },
        { status: 403 }
      )

      response.cookies.delete('refresh_token')
      return response
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id, user.role)

    return NextResponse.json(
      {
        success: true,
        data: {
          access_token: accessToken,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Token refresh error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while refreshing token',
        },
      },
      { status: 500 }
    )
  }
}
