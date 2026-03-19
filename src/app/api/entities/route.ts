import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Fetch all entities grouped by business group
    const groups = await prisma.group.findMany({
      where: { is_active: true },
      include: {
        entities: {
          where: { is_active: true },
          select: {
            id: true,
            name: true,
            code: true,
            country_code: true,
            country_flag_emoji: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      {
        success: true,
        data: { groups },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Fetch entities error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching entities',
        },
      },
      { status: 500 }
    )
  }
}
