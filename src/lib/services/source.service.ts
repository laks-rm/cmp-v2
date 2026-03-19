import prisma from '@/lib/prisma'
import { CreateSourceInput, UpdateSourceInput, SourceQueryInput } from '@/lib/validators/source'
import { Prisma } from '@prisma/client'

interface SourceListResult {
  sources: any[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class SourceService {
  /**
   * Generate next source code (SRC-001, SRC-002, etc.)
   */
  private async generateSourceCode(): Promise<string> {
    const lastSource = await prisma.source.findFirst({
      orderBy: { code: 'desc' },
      select: { code: true },
    })

    if (!lastSource) {
      return 'SRC-001'
    }

    const lastNumber = parseInt(lastSource.code.split('-')[1] || '0')
    const nextNumber = lastNumber + 1
    return `SRC-${nextNumber.toString().padStart(3, '0')}`
  }

  /**
   * Get user's accessible entity IDs
   */
  private async getUserEntityIds(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        entity_access: {
          select: { entity_id: true },
        },
      },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Super admins and admins have access to all entities
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      const allEntities = await prisma.entity.findMany({
        where: { is_active: true },
        select: { id: true },
      })
      return allEntities.map((e) => e.id)
    }

    return user.entity_access.map((access) => access.entity_id)
  }

  /**
   * List sources with filters and pagination
   */
  async listSources(
    filters: SourceQueryInput,
    userId: string
  ): Promise<SourceListResult> {
    const { page, limit, search, status, source_type, category, department_id, entity_id, risk_level, sort_by, sort_order } = filters

    // Get user's accessible entity IDs
    const accessibleEntityIds = await this.getUserEntityIds(userId)

    // Build where clause
    const where: Prisma.SourceWhereInput = {
      archived: false,
      // Filter by entity access - user can only see sources for their entities
      entities_in_scope: {
        some: {
          entity_id: entity_id || { in: accessibleEntityIds },
        },
      },
    }

    // Apply filters
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (source_type) {
      where.source_type = source_type
    }

    if (category) {
      where.category = category
    }

    if (department_id) {
      where.department_id = department_id
    }

    if (risk_level) {
      where.risk_level = risk_level
    }

    // Get total count
    const total = await prisma.source.count({ where })

    // Get paginated results
    const sources = await prisma.source.findMany({
      where,
      include: {
        department: {
          select: { id: true, name: true, code: true },
        },
        pic_user: {
          select: { id: true, name: true, email: true, role: true },
        },
        reviewer_user: {
          select: { id: true, name: true, email: true, role: true },
        },
        entities_in_scope: {
          include: {
            entity: {
              select: {
                id: true,
                name: true,
                code: true,
                country_code: true,
                country_flag_emoji: true,
              },
            },
          },
        },
        _count: {
          select: {
            clauses: true,
          },
        },
      },
      orderBy: { [sort_by]: sort_order },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      sources: sources.map((source) => ({
        ...source,
        entities: source.entities_in_scope.map((se) => se.entity),
        clauses_count: source._count.clauses,
        entities_in_scope: undefined,
        _count: undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Get single source with all relations
   */
  async getSource(id: string, userId: string) {
    // Get user's accessible entity IDs
    const accessibleEntityIds = await this.getUserEntityIds(userId)

    const source = await prisma.source.findFirst({
      where: {
        id,
        archived: false,
        // User can only access sources for their entities
        entities_in_scope: {
          some: {
            entity_id: { in: accessibleEntityIds },
          },
        },
      },
      include: {
        department: true,
        pic_user: {
          select: { id: true, name: true, email: true, role: true },
        },
        reviewer_user: {
          select: { id: true, name: true, email: true, role: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        entities_in_scope: {
          include: {
            entity: {
              include: {
                group: true,
              },
            },
          },
        },
        clauses: {
          where: { is_active: true },
          include: {
            task_templates: {
              where: { is_active: true },
              orderBy: { sequence_order: 'asc' },
            },
          },
          orderBy: { sequence_order: 'asc' },
        },
      },
    })

    if (!source) {
      return null
    }

    return {
      ...source,
      entities: source.entities_in_scope.map((se) => se.entity),
      entities_in_scope: undefined,
    }
  }

  /**
   * Create new source
   */
  async createSource(data: CreateSourceInput, userId: string) {
    // Generate source code
    const code = await this.generateSourceCode()

    // Create source with entities
    const source = await prisma.$transaction(async (tx) => {
      // Create source
      const newSource = await tx.source.create({
        data: {
          code,
          title: data.title,
          source_type: data.source_type,
          category: data.category,
          description: data.description,
          department_id: data.department_id,
          effective_from: new Date(data.effective_from),
          effective_to: data.effective_to ? new Date(data.effective_to) : null,
          pic_user_id: data.pic_user_id,
          reviewer_user_id: data.reviewer_user_id,
          risk_level: data.risk_level || 'NOT_ASSESSED',
          tags: data.tags || [],
          reference_document_url: data.reference_document_url,
          status: data.status || 'DRAFT',
          version_number: 1,
          created_by: userId,
        },
      })

      // Create entity associations
      if (data.entity_ids && data.entity_ids.length > 0) {
        await tx.sourceEntity.createMany({
          data: data.entity_ids.map((entity_id) => ({
            source_id: newSource.id,
            entity_id,
          })),
        })
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: userId,
          action_type: 'source_created',
          module: 'Source',
          source_id: newSource.id,
          channel: 'WEB',
          success: true,
          new_value: {
            code: newSource.code,
            title: newSource.title,
            status: newSource.status,
          },
        },
      })

      return newSource
    })

    // Fetch full source with relations
    return this.getSource(source.id, userId)
  }

  /**
   * Update source
   */
  async updateSource(id: string, data: Partial<CreateSourceInput>, userId: string) {
    // Check if source exists and user has access
    const existingSource = await this.getSource(id, userId)
    if (!existingSource) {
      throw new Error('Source not found or access denied')
    }

    // Update source
    const updated = await prisma.$transaction(async (tx) => {
      // Update source fields
      const updateData: any = {}
      
      if (data.title !== undefined) updateData.title = data.title
      if (data.source_type !== undefined) updateData.source_type = data.source_type
      if (data.category !== undefined) updateData.category = data.category
      if (data.description !== undefined) updateData.description = data.description
      if (data.department_id !== undefined) updateData.department_id = data.department_id
      if (data.effective_from !== undefined) updateData.effective_from = new Date(data.effective_from)
      if (data.effective_to !== undefined) updateData.effective_to = data.effective_to ? new Date(data.effective_to) : null
      if (data.pic_user_id !== undefined) updateData.pic_user_id = data.pic_user_id
      if (data.reviewer_user_id !== undefined) updateData.reviewer_user_id = data.reviewer_user_id
      if (data.risk_level !== undefined) updateData.risk_level = data.risk_level
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.reference_document_url !== undefined) updateData.reference_document_url = data.reference_document_url
      if (data.status !== undefined) updateData.status = data.status

      const updatedSource = await tx.source.update({
        where: { id },
        data: updateData,
      })

      // Update entity associations if provided
      if (data.entity_ids) {
        // Delete existing associations
        await tx.sourceEntity.deleteMany({
          where: { source_id: id },
        })

        // Create new associations
        await tx.sourceEntity.createMany({
          data: data.entity_ids.map((entity_id) => ({
            source_id: id,
            entity_id,
          })),
        })
      }

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: userId,
          action_type: 'source_updated',
          module: 'Source',
          source_id: id,
          channel: 'WEB',
          success: true,
          old_value: existingSource,
          new_value: updateData,
        },
      })

      return updatedSource
    })

    // Fetch updated source with relations
    return this.getSource(id, userId)
  }

  /**
   * Archive source (soft delete)
   */
  async archiveSource(id: string, userId: string) {
    // Check if source exists and user has access
    const existingSource = await this.getSource(id, userId)
    if (!existingSource) {
      throw new Error('Source not found or access denied')
    }

    // Check if source has active tasks
    if (existingSource.status === 'ACTIVE') {
      const taskCount = await prisma.taskInstance.count({
        where: {
          source_id: id,
          status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'PENDING_REVIEW'] },
        },
      })

      if (taskCount > 0) {
        throw new Error('Cannot archive source with active tasks. Please close or reassign tasks first.')
      }
    }

    // Archive source
    await prisma.$transaction(async (tx) => {
      await tx.source.update({
        where: { id },
        data: {
          archived: true,
          status: 'ARCHIVED',
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: userId,
          action_type: 'source_archived',
          module: 'Source',
          source_id: id,
          channel: 'WEB',
          success: true,
        },
      })
    })

    return { success: true, message: 'Source archived successfully' }
  }

  /**
   * Get source statistics
   */
  async getStatistics(userId: string) {
    const accessibleEntityIds = await this.getUserEntityIds(userId)

    const where: Prisma.SourceWhereInput = {
      archived: false,
      entities_in_scope: {
        some: {
          entity_id: { in: accessibleEntityIds },
        },
      },
    }

    const [total, active, pendingAssignment, draft] = await Promise.all([
      prisma.source.count({ where }),
      prisma.source.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.source.count({ where: { ...where, status: 'PENDING_ASSIGNMENT' } }),
      prisma.source.count({ where: { ...where, status: 'DRAFT' } }),
    ])

    return {
      total,
      active,
      pending_assignment: pendingAssignment,
      draft,
    }
  }
}

export const sourceService = new SourceService()
