// ===================================
// COMMON TYPES
// ===================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CMP_MANAGER'
  | 'DEPT_MANAGER'
  | 'REVIEWER'
  | 'PIC'
  | 'READ_ONLY'
  | 'AI_ACTION_USER'
  | 'AI_READ_ONLY'

export type SourceType =
  | 'REGULATION'
  | 'INTERNAL_AUDIT'
  | 'EXTERNAL_AUDIT'
  | 'POLICY'
  | 'SOP'
  | 'OTHER'

export type SourceCategory =
  | 'AML'
  | 'SANCTIONS'
  | 'REGULATORY_REPORTING'
  | 'LICENSE'
  | 'DATA_PROTECTION'
  | 'CONSUMER_PROTECTION'
  | 'IT_SECURITY'
  | 'GOVERNANCE'
  | 'OTHER'

export type SourceStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PENDING_ASSIGNMENT'
  | 'INACTIVE'
  | 'ARCHIVED'

export type TaskFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY'
  | 'ONE_TIME'
  | 'AD_HOC'

export type ReviewerLogic =
  | 'FIXED_USER'
  | 'SOURCE_REVIEWER'
  | 'DEPT_MANAGER'
  | 'ROUND_ROBIN'

export type AssignmentLogic =
  | 'FIXED_PIC'
  | 'DEPARTMENT_QUEUE'
  | 'ROUND_ROBIN'
  | 'MANUAL'

export type TaskStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'RETURNED'
  | 'APPROVED'
  | 'OVERDUE'
  | 'CLOSED'

export type AssignmentStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'ESCALATED'

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_ASSESSED'

export type EvidenceStatus = 'NOT_REQUIRED' | 'MISSING' | 'PARTIAL' | 'COMPLETE'

export type ReviewDecision = 'APPROVED' | 'RETURNED' | 'REJECTED'

export type AuditChannel = 'WEB' | 'AI' | 'SLACK' | 'SYSTEM' | 'API' | 'CRON'

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_OVERDUE'
  | 'REVIEW_NEEDED'
  | 'ESCALATION'
  | 'SOURCE_CREATED'
  | 'VERSION_ACTIVATED'
  | 'AI_SUGGESTION'
  | 'REMINDER'

// ===================================
// ENTITY MODELS
// ===================================

export interface Group {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Entity {
  id: string
  name: string
  code: string
  country_code: string
  country_flag_emoji: string
  group_id: string
  is_active: boolean
  created_at: Date
  updated_at: Date
  group?: Group
}

export interface Department {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface User {
  id: string
  email: string
  name: string
  department_id: string | null
  team: string | null
  role: UserRole
  is_active: boolean
  ai_permission_level: string | null
  manager_id: string | null
  created_at: Date
  updated_at: Date
  department?: Department
  manager?: User
}

export interface UserEntityAccess {
  id: string
  user_id: string
  entity_id: string
  user?: User
  entity?: Entity
}

// ===================================
// SOURCE & CLAUSE MODELS
// ===================================

export interface Source {
  id: string
  code: string
  title: string
  source_type: SourceType
  category: SourceCategory
  description: string | null
  department_id: string
  effective_from: Date
  effective_to: Date | null
  pic_user_id: string | null
  reviewer_user_id: string | null
  risk_level: RiskLevel
  tags: string[]
  reference_document_url: string | null
  status: SourceStatus
  version_number: number
  created_by: string
  archived: boolean
  created_at: Date
  updated_at: Date
  department?: Department
  creator?: User
  pic_user?: User
  reviewer_user?: User
  entities_in_scope?: SourceEntity[]
  clauses?: Clause[]
  task_templates?: TaskTemplate[]
}

export interface SourceEntity {
  id: string
  source_id: string
  entity_id: string
  source?: Source
  entity?: Entity
}

export interface Clause {
  id: string
  source_id: string
  source_version: number
  clause_number: string
  title: string
  description: string | null
  sequence_order: number
  is_active: boolean
  ai_generated: boolean
  created_at: Date
  updated_at: Date
  source?: Source
  task_templates?: TaskTemplate[]
}

// ===================================
// TASK TEMPLATE & INSTANCE MODELS
// ===================================

export interface FrequencyConfig {
  day_of_week?: number
  day_of_month?: number
  month?: number
  custom_schedule?: string
}

export interface TaskTemplate {
  id: string
  clause_id: string
  source_id: string
  title: string
  description: string | null
  frequency: TaskFrequency
  frequency_config: FrequencyConfig | null
  due_date_offset_days: number
  review_required: boolean
  reviewer_logic: ReviewerLogic | null
  evidence_required: boolean
  evidence_description: string | null
  expected_outcome: string | null
  priority: Priority
  assignment_logic: AssignmentLogic
  reminder_days_before: number[]
  escalation_days_after: number | null
  escalation_to: string | null
  is_active: boolean
  ai_generated: boolean
  sequence_order: number
  created_at: Date
  updated_at: Date
  clause?: Clause
  source?: Source
  task_instances?: TaskInstance[]
}

export interface TaskInstance {
  id: string
  task_code: string
  task_template_id: string
  clause_id: string
  source_id: string
  title: string
  description: string | null
  entity_id: string
  department_id: string
  pic_user_id: string | null
  reviewer_user_id: string | null
  status: TaskStatus
  assignment_status: AssignmentStatus
  period_start: Date
  period_end: Date
  due_date: Date
  priority: Priority
  review_required: boolean
  evidence_required: boolean
  evidence_status: EvidenceStatus
  expected_outcome: string | null
  actual_outcome: string | null
  submitted_at: Date | null
  reviewed_at: Date | null
  reviewed_by: string | null
  review_decision: ReviewDecision | null
  review_comments: string | null
  closed_at: Date | null
  overdue_flagged_at: Date | null
  reminder_sent_dates: Date[]
  escalation_sent_at: Date | null
  created_at: Date
  updated_at: Date
  task_template?: TaskTemplate
  clause?: Clause
  source?: Source
  entity?: Entity
  department?: Department
  pic_user?: User
  reviewer_user?: User
  reviewed_by_user?: User
  evidence_files?: EvidenceFile[]
  comments?: Comment[]
}

export interface EvidenceFile {
  id: string
  task_instance_id: string
  filename: string
  file_url: string
  file_size: number
  mime_type: string
  uploaded_by: string
  created_at: Date
  task_instance?: TaskInstance
  uploader?: User
}

export interface Comment {
  id: string
  task_instance_id: string
  user_id: string
  text: string
  created_at: Date
  task_instance?: TaskInstance
  user?: User
}

// ===================================
// AUDIT & NOTIFICATION MODELS
// ===================================

export interface AuditLog {
  id: string
  timestamp: Date
  user_id: string | null
  user_role: string | null
  action_type: string
  module: string
  source_id: string | null
  clause_id: string | null
  task_instance_id: string | null
  entity_id: string | null
  department_id: string | null
  affected_user_id: string | null
  old_value: Record<string, any> | null
  new_value: Record<string, any> | null
  changed_field: string | null
  channel: AuditChannel
  success: boolean
  error_message: string | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any> | null
  user?: User
  source?: Source
  clause?: Clause
  task_instance?: TaskInstance
  entity?: Entity
  department?: Department
  affected_user?: User
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  link_url: string | null
  is_read: boolean
  related_source_id: string | null
  related_task_id: string | null
  created_at: Date
  user?: User
}

// ===================================
// API RESPONSE TYPES
// ===================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ===================================
// QUERY PARAMETER TYPES
// ===================================

export interface TaskQueryParams {
  page?: string
  limit?: string
  search?: string
  status?: string
  priority?: string
  entity_id?: string
  department_id?: string
  source_id?: string
  clause_id?: string
  pic_user_id?: string
  reviewer_user_id?: string
  assignment_status?: string
  evidence_status?: string
  due_date_from?: string
  due_date_to?: string
  overdue?: string
  review_required?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface SourceQueryParams {
  page?: string
  limit?: string
  search?: string
  status?: string
  source_type?: string
  category?: string
  department_id?: string
  entity_id?: string
  risk_level?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface UserQueryParams {
  page?: string
  limit?: string
  search?: string
  role?: string
  department_id?: string
  is_active?: string
}

// ===================================
// FORM DATA TYPES
// ===================================

export interface CreateUserInput {
  email: string
  name: string
  password: string
  department_id: string
  team?: string
  role: UserRole
  entity_access?: string[]
  ai_permission_level?: string
}

export interface UpdateUserInput {
  name?: string
  department_id?: string
  team?: string
  role?: UserRole
  entity_access?: string[]
  ai_permission_level?: string
  is_active?: boolean
}

export interface CreateSourceInput {
  title: string
  source_type: SourceType
  category: SourceCategory
  description?: string
  entity_ids: string[]
  department_id: string
  effective_from: string
  effective_to?: string
  pic_user_id?: string | null
  reviewer_user_id?: string | null
  risk_level: RiskLevel
  tags?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string
  due_date?: string
  priority?: Priority
  pic_user_id?: string | null
  actual_outcome?: string
}

export interface TaskActionInput {
  action: 'start' | 'submit' | 'approve' | 'return' | 'reject' | 'close'
  comment?: string
}

// ===================================
// STATISTICS TYPES
// ===================================

export interface SourceStatistics {
  total: number
  active: number
  pending_assignment: number
  draft: number
}

export interface TaskStatistics {
  all_open: number
  overdue: number
  pending_review: number
  unassigned: number
}

export interface ReviewQueueStats {
  pending: number
  returned: number
  approved_last_7d: number
  sla_breach: number
}

// ===================================
// CALENDAR TYPES
// ===================================

export interface CalendarGeneratedTask {
  id: string
  task_code: string
  title: string
  due_date: string
  status: string
  priority: string
  entity: { name: string; code: string; country_flag_emoji: string }
  source: { code: string; title: string }
  clause: { clause_number: string; title: string }
  pic_user: { name: string } | null
}

export interface CalendarProjectedTask {
  template_id: string
  source_code: string
  source_title: string
  clause_number: string
  clause_title: string
  task_title: string
  entity_code: string
  entity_name: string
  entity_flag: string
  projected_due_date: string
  frequency: string
  priority: string
}

export interface CalendarData {
  generated_tasks: CalendarGeneratedTask[]
  projected_tasks: CalendarProjectedTask[]
  date_range: { from: string; to: string }
}

