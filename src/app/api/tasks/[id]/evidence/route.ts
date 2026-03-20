import { NextRequest, NextResponse } from 'next/server'
import { extractBearerToken, verifyAccessToken } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get task
    const task = await prisma.taskInstance.findUnique({
      where: { id: params.id },
      include: {
        evidence_files: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Task not found',
          },
        },
        { status: 404 }
      )
    }

    // Check permission - only PIC can upload evidence
    if (task.pic_user_id !== decoded.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only the assigned PIC can upload evidence',
          },
        },
        { status: 403 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No file provided',
          },
        },
        { status: 400 }
      )
    }

    // Validate file
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/png',
      'image/jpeg',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not allowed. Supported: PDF, DOCX, XLSX, CSV, PNG, JPG',
          },
        },
        { status: 400 }
      )
    }

    // Validate file size (25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size must be less than 25MB',
          },
        },
        { status: 400 }
      )
    }

    // Validate total files per task (max 20)
    if (task.evidence_files.length >= 20) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Maximum 20 files allowed per task',
          },
        },
        { status: 400 }
      )
    }

    // Validate total size per task (100MB)
    const totalSize = task.evidence_files.reduce((sum, f) => sum + f.file_size, 0)
    if (totalSize + file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOTAL_SIZE_EXCEEDED',
            message: 'Total evidence size must be less than 100MB per task',
          },
        },
        { status: 400 }
      )
    }

    // Save file to local uploads directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'evidence', params.id)
    await mkdir(uploadDir, { recursive: true })

    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}_${sanitizedFilename}`
    const filepath = path.join(uploadDir, filename)

    const bytes = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(bytes))

    // Create evidence file record
    const evidenceFile = await prisma.$transaction(async (tx) => {
      const evidence = await tx.evidenceFile.create({
        data: {
          task_instance_id: params.id,
          filename: file.name,
          file_url: `/uploads/evidence/${params.id}/${filename}`,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: decoded.userId,
        },
      })

      // Update task evidence status
      const evidenceCount = task.evidence_files.length + 1
      await tx.taskInstance.update({
        where: { id: params.id },
        data: {
          evidence_status: evidenceCount > 0 && task.evidence_required ? 'COMPLETE' : task.evidence_status,
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'evidence_uploaded',
          module: 'EvidenceFile',
          task_instance_id: params.id,
          source_id: task.source_id,
          channel: 'WEB',
          success: true,
          new_value: {
            filename: file.name,
            size: file.size,
          },
        },
      })

      return evidence
    })

    return NextResponse.json(
      {
        success: true,
        data: { evidence: evidenceFile },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Upload evidence error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while uploading evidence',
        },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get evidence_id from query params
    const { searchParams } = new URL(request.url)
    const evidenceId = searchParams.get('evidence_id')

    if (!evidenceId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'evidence_id query parameter required',
          },
        },
        { status: 400 }
      )
    }

    // Get evidence file
    const evidence = await prisma.evidenceFile.findUnique({
      where: { id: evidenceId },
      include: {
        task_instance: true,
      },
    })

    if (!evidence) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Evidence file not found',
          },
        },
        { status: 404 }
      )
    }

    // Check permission - only PIC can delete
    if (evidence.task_instance.pic_user_id !== decoded.userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only the assigned PIC can delete evidence',
          },
        },
        { status: 403 }
      )
    }

    // Can only delete before approval
    if (['APPROVED', 'CLOSED'].includes(evidence.task_instance.status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete evidence after task is approved',
          },
        },
        { status: 403 }
      )
    }

    // Delete evidence file
    await prisma.$transaction(async (tx) => {
      await tx.evidenceFile.delete({
        where: { id: evidenceId },
      })

      // Update task evidence status
      const remainingFiles = await tx.evidenceFile.count({
        where: { task_instance_id: params.id },
      })

      await tx.taskInstance.update({
        where: { id: params.id },
        data: {
          evidence_status: remainingFiles === 0 && evidence.task_instance.evidence_required ? 'MISSING' : evidence.task_instance.evidence_status,
        },
      })

      // Write audit log
      await tx.auditLog.create({
        data: {
          user_id: decoded.userId,
          action_type: 'evidence_deleted',
          module: 'EvidenceFile',
          task_instance_id: params.id,
          source_id: evidence.task_instance.source_id,
          channel: 'WEB',
          success: true,
          old_value: {
            filename: evidence.filename,
          },
        },
      })
    })

    return NextResponse.json(
      {
        success: true,
        data: { message: 'Evidence deleted successfully' },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete evidence error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An error occurred while deleting evidence',
        },
      },
      { status: 500 }
    )
  }
}
