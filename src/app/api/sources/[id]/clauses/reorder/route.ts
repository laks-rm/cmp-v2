import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import { reorderClausesSchema } from '@/lib/validators/clause'
import prisma from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const token = extractBearerToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = reorderClausesSchema.safeParse(body)
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

    // Bulk update in transaction
    await prisma.$transaction(async (tx) => {
      for (const item of validation.data) {
        await tx.clause.update({
          where: { id: item.id },
          data: { sequence_order: item.sequence_order },
        })
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'clause_reordered',
          module: 'Clause',
          source_id: params.id,
          channel: 'WEB',
          success: true,
          new_value: validation.data,
        },
      })
    })

    return NextResponse.json(
      { success: true, message: 'Clauses reordered successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Reorder clauses error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An error occurred' } },
      { status: 500 }
    )
  }
}
