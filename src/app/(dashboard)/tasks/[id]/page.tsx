'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/Button'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'

interface TaskDetail {
  id: string
  task_code: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
  evidence_required: boolean
  evidence_status: string
  expected_outcome: string
  actual_outcome: string
  review_required: boolean
  review_decision: string | null
  review_comments: string | null
  submitted_at: string | null
  reviewed_at: string | null
  source: {
    id: string
    code: string
    title: string
  }
  clause: {
    id: string
    clause_number: string
    title: string
  }
  entity: {
    id: string
    code: string
    name: string
    country_flag_emoji: string
  }
  department: {
    id: string
    name: string
  }
  pic_user: {
    id: string
    name: string
    email: string
  } | null
  reviewer_user: {
    id: string
    name: string
    email: string
  } | null
  evidence_files: Array<{
    id: string
    filename: string
    file_url: string
    file_size: number
    created_at: string
    uploader: {
      name: string
    }
  }>
  comments: Array<{
    id: string
    text: string
    created_at: string
    user: {
      name: string
    }
  }>
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { accessToken, user } = useAuth()

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [actualOutcome, setActualOutcome] = useState('')
  const [commentText, setCommentText] = useState('')
  const [returnComment, setReturnComment] = useState('')
  const [rejectComment, setRejectComment] = useState('')
  const [showReturnInput, setShowReturnInput] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)

  const fetchTask = async () => {
    if (!accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/tasks/${params.id}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        setTask(data.data.task)
        setActualOutcome(data.data.task.actual_outcome || '')
      } else {
        setError(data.error?.message || 'Failed to load task')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load task')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTask()
  }, [params.id, accessToken])

  const handleAction = async (action: string, comment?: string) => {
    if (!task || !accessToken) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comment,
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchTask()
        setReturnComment('')
        setRejectComment('')
        setShowReturnInput(false)
        setShowRejectInput(false)
      } else {
        alert(data.error?.message || 'Action failed')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveOutcome = async () => {
    if (!task || !accessToken) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actual_outcome: actualOutcome,
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchTask()
      } else {
        alert(data.error?.message || 'Failed to save')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!task || !accessToken || !commentText.trim()) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: commentText,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setCommentText('')
        fetchTask()
      } else {
        alert(data.error?.message || 'Failed to add comment')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add comment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!task || !accessToken || !e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      setActionLoading(true)

      const response = await fetch(`/api/tasks/${task.id}/evidence`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        fetchTask()
      } else {
        alert(data.error?.message || 'Upload failed')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!task || !accessToken) return

    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      setActionLoading(true)

      const response = await fetch(`/api/tasks/${task.id}/evidence/${evidenceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        fetchTask()
      } else {
        alert(data.error?.message || 'Delete failed')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--accent-red)' }}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border-l-4 text-sm"
        style={{
          backgroundColor: 'rgba(255, 68, 79, 0.1)',
          borderColor: 'var(--accent-red)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="font-semibold mb-1">Error loading task</div>
        <div style={{ color: 'var(--text-secondary)' }}>{error}</div>
        <button
          onClick={fetchTask}
          className="mt-3 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: 'var(--accent-red)',
            color: 'white',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
        Task not found
      </div>
    )
  }

  const isOverdue = new Date(task.due_date) < new Date()
  const isPIC = user?.id === task.pic_user?.id
  const isReviewer = user?.id === task.reviewer_user?.id
  const isManager = ['SUPER_ADMIN', 'ADMIN', 'CMP_MANAGER', 'DEPT_MANAGER'].includes(user?.role || '')

  const canStart = isPIC && ['NOT_STARTED', 'OVERDUE'].includes(task.status)
  const canSubmit = isPIC && ['IN_PROGRESS', 'RETURNED', 'OVERDUE'].includes(task.status)
  const canApprove = isReviewer && task.status === 'PENDING_REVIEW'
  const canReturn = isReviewer && task.status === 'PENDING_REVIEW'
  const canReject = isReviewer && task.status === 'PENDING_REVIEW'
  const canEditOutcome = isPIC && ['NOT_STARTED', 'IN_PROGRESS', 'RETURNED', 'OVERDUE'].includes(task.status)

  const submitDisabled = task.evidence_required && task.evidence_files.length === 0

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm mb-2"
          style={{ color: 'var(--accent-red)' }}
        >
          ← Back
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <code className="text-lg font-mono" style={{ color: 'var(--accent-teal)' }}>
                {task.task_code}
              </code>
              <StatusBadge status={task.status as any} />
              <PriorityBadge priority={task.priority as any} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {task.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span
                style={{
                  color: isOverdue ? 'var(--accent-red)' : 'var(--text-secondary)',
                  fontWeight: isOverdue ? 600 : 400,
                }}
              >
                Due: {new Date(task.due_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="p-4 rounded-lg border flex items-center gap-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Source
          </div>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono" style={{ color: 'var(--accent-teal)' }}>
              {task.source.code}
            </code>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {task.source.title}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Clause
          </div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {task.clause.clause_number} - {task.clause.title}
          </span>
        </div>
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Entity
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{task.entity.country_flag_emoji}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {task.entity.name}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Department
          </div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {task.department.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Description
            </h2>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
              {task.description || 'No description provided'}
            </p>
          </div>

          {task.expected_outcome && (
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Expected Outcome
              </h2>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {task.expected_outcome}
              </p>
            </div>
          )}

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Evidence {task.evidence_required && <span style={{ color: 'var(--accent-red)' }}>*</span>}
            </h2>
            
            {canEditOutcome && (
              <div className="mb-4">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full p-4 border-2 border-dashed rounded-lg cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                  }}
                  disabled={actionLoading}
                />
              </div>
            )}

            {task.evidence_files.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                No evidence uploaded yet
              </p>
            ) : (
              <div className="space-y-2">
                {task.evidence_files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {file.filename}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {(file.file_size / 1024).toFixed(1)} KB · Uploaded by {file.uploader.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm"
                        style={{ color: 'var(--accent-blue)' }}
                      >
                        Download
                      </a>
                      {canEditOutcome && (
                        <button
                          onClick={() => handleDeleteEvidence(file.id)}
                          className="text-sm"
                          style={{ color: 'var(--accent-red)' }}
                          disabled={actionLoading}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Actual Outcome
            </h2>
            {canEditOutcome ? (
              <div>
                <textarea
                  value={actualOutcome}
                  onChange={(e) => setActualOutcome(e.target.value)}
                  rows={5}
                  className="w-full input-primary mb-2"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Describe what was done and the result..."
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveOutcome}
                  disabled={actionLoading}
                >
                  Save
                </Button>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {task.actual_outcome || 'No outcome recorded yet'}
              </p>
            )}
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Comments
            </h2>

            <div className="space-y-3 mb-4">
              {task.comments.length === 0 ? (
                <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                  No comments yet
                </p>
              ) : (
                task.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {comment.user.name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                      {comment.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className="w-full input-primary mb-2"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Add a comment..."
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddComment}
                disabled={!commentText.trim() || actionLoading}
              >
                Add Comment
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Ownership
            </h2>
            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  PIC
                </div>
                {task.pic_user ? (
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {task.pic_user.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {task.pic_user.email}
                    </div>
                  </div>
                ) : (
                  <span className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                    Unassigned
                  </span>
                )}
              </div>

              {task.review_required && (
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Reviewer
                  </div>
                  {task.reviewer_user ? (
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {task.reviewer_user.name}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {task.reviewer_user.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>
                      Unassigned
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Actions
            </h2>
            <div className="space-y-2">
              {canStart && (
                <Button
                  variant="primary"
                  onClick={() => handleAction('start')}
                  disabled={actionLoading}
                  className="w-full"
                >
                  Start Task
                </Button>
              )}

              {canSubmit && (
                <Button
                  variant="primary"
                  onClick={() => handleAction('submit')}
                  disabled={actionLoading || submitDisabled}
                  className="w-full"
                >
                  {submitDisabled ? 'Upload Evidence First' : 'Submit for Review'}
                </Button>
              )}

              {canApprove && (
                <Button
                  variant="primary"
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="w-full"
                  style={{ backgroundColor: 'var(--accent-green)' }}
                >
                  Approve
                </Button>
              )}

              {canReturn && (
                <div>
                  {!showReturnInput ? (
                    <Button
                      variant="secondary"
                      onClick={() => setShowReturnInput(true)}
                      disabled={actionLoading}
                      className="w-full"
                      style={{ backgroundColor: 'var(--accent-amber)', color: 'white' }}
                    >
                      Return
                    </Button>
                  ) : (
                    <div>
                      <textarea
                        value={returnComment}
                        onChange={(e) => setReturnComment(e.target.value)}
                        rows={3}
                        className="w-full input-primary mb-2"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="Provide feedback..."
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAction('return', returnComment)}
                          disabled={!returnComment.trim() || actionLoading}
                          style={{ backgroundColor: 'var(--accent-amber)', color: 'white' }}
                        >
                          Submit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowReturnInput(false)
                            setReturnComment('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canReject && (
                <div>
                  {!showRejectInput ? (
                    <Button
                      variant="secondary"
                      onClick={() => setShowRejectInput(true)}
                      disabled={actionLoading}
                      className="w-full"
                      style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}
                    >
                      Reject
                    </Button>
                  ) : (
                    <div>
                      <textarea
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        rows={3}
                        className="w-full input-primary mb-2"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                        placeholder="Provide reason for rejection..."
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAction('reject', rejectComment)}
                          disabled={!rejectComment.trim() || actionLoading}
                          style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}
                        >
                          Submit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowRejectInput(false)
                            setRejectComment('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {task.review_decision && (
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Review Decision
              </h2>
              <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium">{task.review_decision}</span>
                {task.reviewed_at && (
                  <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(task.reviewed_at).toLocaleString()}
                  </span>
                )}
              </div>
              {task.review_comments && (
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                  {task.review_comments}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
