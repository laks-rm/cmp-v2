import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { extractBearerToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  const publicRoutes = ['/login', '/api/auth/login', '/api/auth/refresh', '/api/auth/logout']
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtectedPage = pathname.startsWith('/')
  const isProtectedAPI = pathname.startsWith('/api/')

  if (!isProtectedPage && !isProtectedAPI) {
    return NextResponse.next()
  }

  // For API routes, check Authorization header (simplified for Okta migration)
  if (isProtectedAPI) {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
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

    // Simplified: Just check if token exists (for Okta migration)
    // TODO: Replace with Okta validation
    const token = extractBearerToken(authHeader)
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Invalid token format',
          },
        },
        { status: 401 }
      )
    }

    // Skip JWT verification for now - will be replaced by Okta
    return NextResponse.next()
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
