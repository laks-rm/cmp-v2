import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
            message: error instanceof Error ? error.message : 'Invalid token',
          },
        },
        { status: 401 }
      )
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: true,
        entity_access: {
          include: {
            entity: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      )
    }

    // Check if user is still active
    if (!user.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Your account has been deactivated',
          },
        },
        { status: 403 }
      )
    }

    // Return user data
    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          team: user.team,
          ai_permission_level: user.ai_permission_level,
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
            country_code: access.entity.country_code,
            country_flag_emoji: access.entity.country_flag_emoji,
            group: {
              id: access.entity.group.id,
              name: access.entity.group.name,
              code: access.entity.group.code,
            },
          })),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching user data',
        },
      },
      { status: 500 }
    )
  }
}
