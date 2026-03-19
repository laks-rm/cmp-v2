import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Fetch all active departments
    const departments = await prisma.department.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      {
        success: true,
        data: { departments },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Fetch departments error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching departments',
        },
      },
      { status: 500 }
    )
  }
}
