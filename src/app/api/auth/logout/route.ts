import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Extract access token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'No access token provided',
          },
        },
        { status: 401 }
      )
    }

    // Verify access token
    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      )
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, is_active: true },
    })

    if (!user || !user.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'User account is not active',
          },
        },
        { status: 403 }
      )
    }

    // Clear refresh token cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    )

    response.cookies.delete('refresh_token')

    // Log logout
    await prisma.auditLog.create({
      data: {
        user_id: user.id,
        action_type: 'logout',
        module: 'System',
        channel: 'WEB',
        success: true,
      },
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)

    // Still clear the cookie even if logging fails
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    )

    response.cookies.delete('refresh_token')
    return response
  }
}
