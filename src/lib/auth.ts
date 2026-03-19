import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || ''
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || ''

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets are not configured in environment variables')
}

// ===================================
// Password Hashing
// ===================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ===================================
// JWT Token Generation
// ===================================

interface AccessTokenPayload {
  userId: string
  role: string
}

interface RefreshTokenPayload {
  userId: string
}

export function generateAccessToken(userId: string, role: string): string {
  const payload: AccessTokenPayload = { userId, role }
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
  })
}

export function generateRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = { userId }
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  })
}

// ===================================
// JWT Token Verification
// ===================================

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Access token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid access token')
    }
    throw new Error('Token verification failed')
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token')
    }
    throw new Error('Token verification failed')
  }
}

// ===================================
// Helper: Extract Bearer Token
// ===================================

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}
