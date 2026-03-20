'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { formatDistanceToNow } from 'date-fns'
import { formatSLA, getSLAColor, type SLAResult } from '@/lib/utils/sla'

interface ReviewCardProps {
  task: {
    id: string
    task_code: string
    title: string
    priority: string
    status: string
    submitted_at: Date | null
    evidence_count: number
    comment_count: number
    sla: SLAResult | null
    source: {
      code: string
      title: string
      version_number: number
    }
    entity: {
      name: string
      country_flag_emoji: string
    }
    pic_user: {
      name: string
    } | null
  }
  onActionComplete: () => void
}

export function ReviewCard({ task, onActionComplete }: ReviewCardProps) {
  const router = useRouter()
  const { accessToken } = useAuth()
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [comment, setComment] = useState('')
  const [isActioning, setIsActioning] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleAction = async (action: 'approve' | 'return' | 'reject', requireComment = false) => {
    if (requireComment && !comment.trim()) {
      alert('Please provide feedback.')
      return
    }

    if (action === 'approve') {
      if (!confirm('Are you sure you want to approve this task?')) return
    }

    setIsActioning(true)

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action,
          comment: comment.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Animate card removal
        setIsRemoving(true)
        setTimeout(() => {
          onActionComplete()
        }, 300)

        // Show success toast (you can integrate a proper toast library)
        const actionText = action === 'approve' ? 'approved' : action === 'return' ? 'returned' : 'rejected'
        alert(`Task ${actionText} successfully`)
      } else {
        // Handle conflict (task already actioned)
        if (response.status === 409 || data.error?.code === 'CONFLICT') {
          alert('This task was already reviewed by another user. Refreshing...')
          onActionComplete()
        } else {
          alert(data.error?.message || `Failed to ${action} task`)
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to ${action} task`)
    } finally {
      setIsActioning(false)
      setShowReturnModal(false)
      setShowRejectModal(false)
      setComment('')
    }
  }

  const slaColors = task.sla ? getSLAColor(task.sla) : null

  return (
    <>
      <div
        className={`rounded-lg border p-6 transition-all duration-300 ${
          isRemoving ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {/* Top Row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-mono text-sm font-semibold"
              style={{ color: 'var(--accent-teal)' }}
            >
              {task.task_code}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                color: 'var(--accent-purple)',
              }}
            >
              v{task.source.version_number}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor:
                  task.priority === 'HIGH'
                    ? 'rgba(255, 68, 79, 0.1)'
                    : task.priority === 'MEDIUM'
                    ? 'rgba(251, 191, 36, 0.1)'
                    : 'rgba(139, 151, 176, 0.1)',
                color:
                  task.priority === 'HIGH'
                    ? 'var(--accent-red)'
                    : task.priority === 'MEDIUM'
                    ? 'var(--accent-amber)'
                    : 'var(--text-tertiary)',
              }}
            >
              {task.priority}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                color: 'var(--accent-blue)',
              }}
            >
              {task.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* SLA Indicator */}
          {task.sla && slaColors && (
            <span
              className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: slaColors.bg,
                color: slaColors.text,
              }}
            >
              {formatSLA(task.sla)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-lg font-bold mb-3 cursor-pointer hover:opacity-80"
          style={{ color: 'var(--text-primary)' }}
          onClick={() => router.push(`/tasks/${task.id}`)}
        >
          {task.title}
        </h3>

        {/* Context */}
        <div className="flex flex-wrap items-center gap-4 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          <span>{task.source.title}</span>
          <span>•</span>
          <span>
            {task.entity.country_flag_emoji} {task.entity.name}
          </span>
          <span>•</span>
          <span>Submitted by {task.pic_user?.name || 'Unknown'}</span>
          {task.submitted_at && (
            <>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(task.submitted_at), { addSuffix: true })}</span>
            </>
          )}
        </div>

        {/* Evidence/Comments Stats */}
        <div className="flex items-center gap-4 text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
          <span>📎 {task.evidence_count} evidence {task.evidence_count === 1 ? 'file' : 'files'}</span>
          <span>•</span>
          <span>💬 {task.comment_count} {task.comment_count === 1 ? 'comment' : 'comments'}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleAction('approve')}
            disabled={isActioning}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-green)',
            }}
          >
            Approve
          </button>
          <button
            onClick={() => setShowReturnModal(true)}
            disabled={isActioning}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              color: 'var(--accent-amber)',
            }}
          >
            Return
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isActioning}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{
              backgroundColor: 'rgba(255, 68, 79, 0.1)',
              color: 'var(--accent-red)',
            }}
          >
            Reject
          </button>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReturnModal(false)}
        >
          <div
            className="rounded-lg p-6 max-w-lg w-full"
            style={{
              backgroundColor: 'var(--bg-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Return Task for Revision
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Please provide feedback to help the PIC improve their submission.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your feedback..."
              rows={5}
              className="w-full px-3 py-2 rounded-lg text-sm mb-4"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                border: '1px solid',
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowReturnModal(false)
                  setComment('')
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('return', true)}
                disabled={isActioning || !comment.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-amber)',
                }}
              >
                {isActioning ? 'Returning...' : 'Return Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="rounded-lg p-6 max-w-lg w-full"
            style={{
              backgroundColor: 'var(--bg-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Reject Task
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Please provide a reason for rejecting this task.
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={5}
              className="w-full px-3 py-2 rounded-lg text-sm mb-4"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                border: '1px solid',
              }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setComment('')
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject', true)}
                disabled={isActioning || !comment.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-red)',
                }}
              >
                {isActioning ? 'Rejecting...' : 'Reject Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
