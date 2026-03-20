/*
  Warnings:

  - Added the required column `first_execution_date` to the `task_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: Add columns with temporary defaults for existing rows
ALTER TABLE "task_templates" ADD COLUMN "first_execution_date" DATE;
ALTER TABLE "task_templates" ADD COLUMN "next_due_date" DATE;

-- Update existing rows with today's date as default
UPDATE "task_templates" SET "first_execution_date" = CURRENT_DATE WHERE "first_execution_date" IS NULL;
UPDATE "task_templates" SET "next_due_date" = CURRENT_DATE WHERE "next_due_date" IS NULL;

-- Now make first_execution_date NOT NULL
ALTER TABLE "task_templates" ALTER COLUMN "first_execution_date" SET NOT NULL;

-- CreateIndex
CREATE INDEX "task_templates_next_due_date_idx" ON "task_templates"("next_due_date");
