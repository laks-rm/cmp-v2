import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const reportConfigSchema = z.object({
  module: z.enum(['sources', 'clauses', 'tasks', 'reviews', 'entities', 'audit']),
  filters: z.record(z.any()).optional(),
  columns: z.array(z.string()),
  groupBy: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  format: z.enum(['table', 'bar_chart', 'summary']).optional().default('table'),
})

const saveReportSchema = reportConfigSchema.extend({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
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

    const body = await request.json()
    const action = body.action // 'run' or 'save'

    if (action === 'save') {
      // Save report configuration
      const validation = saveReportSchema.safeParse(body.config)

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: validation.error.errors[0].message,
            },
          },
          { status: 400 }
        )
      }

      const config = validation.data

      const savedReport = await prisma.$transaction(async (tx) => {
        // Note: SavedReport model would need to be added to schema
        // For now, returning a placeholder response
        return {
          id: 'placeholder-id',
          name: config.name,
          description: config.description,
          module: config.module,
          configuration: config,
          created_by: decoded.userId,
        }
      })

      return NextResponse.json(
        {
          success: true,
          data: { report: savedReport },
        },
        { status: 201 }
      )
    }

    // Run report
    const validation = reportConfigSchema.safeParse(body.config)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    const config = validation.data

    // Execute query based on module
    let results: any[] = []
    let totalCount = 0

    switch (config.module) {
      case 'sources':
        const sources = await prisma.source.findMany({
          include: {
            clauses: true,
            entities_in_scope: {
              include: {
                entity: true,
              },
            },
            department: true,
          },
          orderBy: config.sortBy
            ? { [config.sortBy]: config.sortOrder }
            : { created_at: 'desc' },
        })
        results = sources
        totalCount = sources.length
        break

      case 'tasks':
        const tasks = await prisma.taskInstance.findMany({
          include: {
            source: true,
            clause: true,
            entity: true,
            department: true,
            pic_user: true,
            reviewer_user: true,
          },
          orderBy: config.sortBy
            ? { [config.sortBy]: config.sortOrder }
            : { created_at: 'desc' },
          take: 1000, // Limit for performance
        })
        results = tasks
        totalCount = tasks.length
        break

      case 'entities':
        const entities = await prisma.entity.findMany({
          include: {
            group: true,
            task_instances: {
              select: {
                status: true,
              },
            },
          },
          orderBy: config.sortBy
            ? { [config.sortBy]: config.sortOrder }
            : { name: 'asc' },
        })
        results = entities
        totalCount = entities.length
        break

      case 'audit':
        const auditLogs = await prisma.auditLog.findMany({
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 1000,
        })
        results = auditLogs
        totalCount = auditLogs.length
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_MODULE',
              message: 'Invalid report module',
            },
          },
          { status: 400 }
        )
    }

    // Filter results to only include requested columns
    const filteredResults = results.map((row) => {
      const filtered: any = {}
      config.columns.forEach((col) => {
        if (col.includes('.')) {
          // Handle nested properties
          const parts = col.split('.')
          let value = row
          for (const part of parts) {
            value = value?.[part]
          }
          filtered[col] = value
        } else {
          filtered[col] = row[col]
        }
      })
      return filtered
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          results: filteredResults,
          totalCount,
          config,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Report execution error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while running report',
        },
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
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

    // For now, return empty array
    // In production, would fetch from SavedReport table
    return NextResponse.json(
      {
        success: true,
        data: {
          reports: [],
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('List reports error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching reports',
        },
      },
      { status: 500 }
    )
  }
}
