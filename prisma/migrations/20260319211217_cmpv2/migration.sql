-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CMP_MANAGER', 'DEPT_MANAGER', 'REVIEWER', 'PIC', 'READ_ONLY', 'AI_ACTION_USER', 'AI_READ_ONLY');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('REGULATION', 'INTERNAL_AUDIT', 'EXTERNAL_AUDIT', 'POLICY', 'SOP', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceCategory" AS ENUM ('AML', 'SANCTIONS', 'REGULATORY_REPORTING', 'LICENSE', 'DATA_PROTECTION', 'CONSUMER_PROTECTION', 'IT_SECURITY', 'GOVERNANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PENDING_ASSIGNMENT', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TaskFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY', 'ONE_TIME', 'AD_HOC');

-- CreateEnum
CREATE TYPE "ReviewerLogic" AS ENUM ('FIXED_USER', 'SOURCE_REVIEWER', 'DEPT_MANAGER', 'ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "AssignmentLogic" AS ENUM ('FIXED_PIC', 'DEPARTMENT_QUEUE', 'ROUND_ROBIN', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'PENDING_REVIEW', 'RETURNED', 'APPROVED', 'OVERDUE', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'REASSIGNED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'NOT_ASSESSED');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('NOT_REQUIRED', 'MISSING', 'PARTIAL', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditChannel" AS ENUM ('WEB', 'AI', 'SLACK', 'SYSTEM', 'API', 'CRON');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'TASK_OVERDUE', 'REVIEW_NEEDED', 'ESCALATION', 'SOURCE_CREATED', 'VERSION_ACTIVATED', 'AI_SUGGESTION', 'REMINDER');

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "country_flag_emoji" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department_id" TEXT,
    "team" TEXT,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ai_permission_level" TEXT,
    "manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_entity_access" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,

    CONSTRAINT "user_entity_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source_type" "SourceType" NOT NULL,
    "category" "SourceCategory" NOT NULL,
    "description" TEXT,
    "department_id" TEXT NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "pic_user_id" TEXT,
    "reviewer_user_id" TEXT,
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'NOT_ASSESSED',
    "tags" TEXT[],
    "reference_document_url" TEXT,
    "status" "SourceStatus" NOT NULL DEFAULT 'DRAFT',
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_entities" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,

    CONSTRAINT "source_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clauses" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_version" INTEGER NOT NULL,
    "clause_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sequence_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "clause_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "TaskFrequency" NOT NULL,
    "frequency_config" JSONB,
    "due_date_offset_days" INTEGER NOT NULL,
    "review_required" BOOLEAN NOT NULL,
    "reviewer_logic" "ReviewerLogic",
    "evidence_required" BOOLEAN NOT NULL,
    "evidence_description" TEXT,
    "expected_outcome" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assignment_logic" "AssignmentLogic" NOT NULL DEFAULT 'DEPARTMENT_QUEUE',
    "reminder_days_before" INTEGER[],
    "escalation_days_after" INTEGER,
    "escalation_to" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "sequence_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_instances" (
    "id" TEXT NOT NULL,
    "task_code" TEXT NOT NULL,
    "task_template_id" TEXT NOT NULL,
    "clause_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "entity_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "pic_user_id" TEXT,
    "reviewer_user_id" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignment_status" "AssignmentStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "priority" "Priority" NOT NULL,
    "review_required" BOOLEAN NOT NULL,
    "evidence_required" BOOLEAN NOT NULL,
    "evidence_status" "EvidenceStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "expected_outcome" TEXT,
    "actual_outcome" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "review_decision" "ReviewDecision",
    "review_comments" TEXT,
    "closed_at" TIMESTAMP(3),
    "overdue_flagged_at" TIMESTAMP(3),
    "reminder_sent_dates" TIMESTAMP(3)[],
    "escalation_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_files" (
    "id" TEXT NOT NULL,
    "task_instance_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "task_instance_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "user_role" TEXT,
    "action_type" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "source_id" TEXT,
    "clause_id" TEXT,
    "task_instance_id" TEXT,
    "entity_id" TEXT,
    "department_id" TEXT,
    "affected_user_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "changed_field" TEXT,
    "channel" "AuditChannel" NOT NULL DEFAULT 'WEB',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_source_id" TEXT,
    "related_task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_code_key" ON "groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "entities_code_key" ON "entities"("code");

-- CreateIndex
CREATE INDEX "entities_group_id_idx" ON "entities"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_entity_access_user_id_idx" ON "user_entity_access"("user_id");

-- CreateIndex
CREATE INDEX "user_entity_access_entity_id_idx" ON "user_entity_access"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_entity_access_user_id_entity_id_key" ON "user_entity_access"("user_id", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "sources_code_key" ON "sources"("code");

-- CreateIndex
CREATE INDEX "sources_status_idx" ON "sources"("status");

-- CreateIndex
CREATE INDEX "sources_department_id_idx" ON "sources"("department_id");

-- CreateIndex
CREATE INDEX "sources_code_idx" ON "sources"("code");

-- CreateIndex
CREATE INDEX "sources_created_by_idx" ON "sources"("created_by");

-- CreateIndex
CREATE INDEX "source_entities_source_id_idx" ON "source_entities"("source_id");

-- CreateIndex
CREATE INDEX "source_entities_entity_id_idx" ON "source_entities"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "source_entities_source_id_entity_id_key" ON "source_entities"("source_id", "entity_id");

-- CreateIndex
CREATE INDEX "clauses_source_id_source_version_idx" ON "clauses"("source_id", "source_version");

-- CreateIndex
CREATE UNIQUE INDEX "clauses_source_id_source_version_clause_number_key" ON "clauses"("source_id", "source_version", "clause_number");

-- CreateIndex
CREATE INDEX "task_templates_clause_id_idx" ON "task_templates"("clause_id");

-- CreateIndex
CREATE INDEX "task_templates_source_id_idx" ON "task_templates"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_instances_task_code_key" ON "task_instances"("task_code");

-- CreateIndex
CREATE INDEX "task_instances_status_idx" ON "task_instances"("status");

-- CreateIndex
CREATE INDEX "task_instances_due_date_idx" ON "task_instances"("due_date");

-- CreateIndex
CREATE INDEX "task_instances_source_id_idx" ON "task_instances"("source_id");

-- CreateIndex
CREATE INDEX "task_instances_entity_id_idx" ON "task_instances"("entity_id");

-- CreateIndex
CREATE INDEX "task_instances_pic_user_id_idx" ON "task_instances"("pic_user_id");

-- CreateIndex
CREATE INDEX "task_instances_task_code_idx" ON "task_instances"("task_code");

-- CreateIndex
CREATE UNIQUE INDEX "task_instances_task_template_id_period_start_entity_id_key" ON "task_instances"("task_template_id", "period_start", "entity_id");

-- CreateIndex
CREATE INDEX "evidence_files_task_instance_id_idx" ON "evidence_files"("task_instance_id");

-- CreateIndex
CREATE INDEX "comments_task_instance_id_idx" ON "comments"("task_instance_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_source_id_idx" ON "audit_logs"("source_id");

-- CreateIndex
CREATE INDEX "audit_logs_task_instance_id_idx" ON "audit_logs"("task_instance_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_entity_access" ADD CONSTRAINT "user_entity_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_entity_access" ADD CONSTRAINT "user_entity_access_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_entities" ADD CONSTRAINT "source_entities_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_entities" ADD CONSTRAINT "source_entities_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_pic_user_id_fkey" FOREIGN KEY ("pic_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_task_instance_id_fkey" FOREIGN KEY ("task_instance_id") REFERENCES "task_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_task_instance_id_fkey" FOREIGN KEY ("task_instance_id") REFERENCES "task_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_task_instance_id_fkey" FOREIGN KEY ("task_instance_id") REFERENCES "task_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_affected_user_id_fkey" FOREIGN KEY ("affected_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
