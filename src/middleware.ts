import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/refresh']
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtectedPage = pathname.startsWith('/')
  const isProtectedAPI = pathname.startsWith('/api/')

  if (!isProtectedPage && !isProtectedAPI) {
    return NextResponse.next()
  }

  // For API routes, check Authorization header
  if (isProtectedAPI) {
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      )
    }

    try {
      verifyAccessToken(token)
      return NextResponse.next()
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
  }

  // For protected pages, check if user has refresh token cookie
  // If not, redirect to login
  const refreshToken = request.cookies.get('refresh_token')

  if (!refreshToken && !pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
