**CMP 2.0**

Blueprint Supplement

Module 12: Error Handling & Recovery

Module 13: Source Creation Wizard --- Full Implementation Spec

Deriv Group • Cursor Development Reference • March 2026

*Supplements the CMP 2.0 Complete Module Spec (core blueprint)*

**Module 12: Error Handling & Recovery**

This module is a first-class build target, not a cross-cutting afterthought. Every component Cursor builds must implement the patterns defined here. The goal is resilient flows that gracefully handle failures, give users clear feedback, and never leave the system in an inconsistent state.

**12.1 Error Handling Design Principles**

1.  Never show raw errors to users. Every error maps to a human-readable message.

2.  Never leave data in a partial state. Use database transactions. If step 3 of 5 fails, rollback steps 1 and 2.

3.  Always preserve user input. If a form submission fails, the form must retain all entered data. No forcing the user to re-type.

4.  Fail fast on validation, fail gracefully on system errors. Client-side validation catches obvious problems before the server is hit. Server errors get friendly messages + retry options.

5.  Log everything. Every error is recorded with full context (user, action, payload, stack trace) for debugging. Users see a friendly message; developers see the full error.

6.  Distinguish between user errors (4xx) and system errors (5xx). User errors get specific guidance. System errors get an apology + retry.

7.  Retry automatically where safe. Idempotent operations (read queries, cron jobs, notifications) retry automatically. Non-idempotent operations (create, update, delete) require user confirmation before retry.

8.  Audit failures, not just successes. Every failed action is recorded in the audit log with success=false and the error reason.

**12.2 UI State Patterns**

Every data-driven component must implement all four states. Cursor must never ship a component that only handles the success state.

  ---------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ --------------------------------------------------------------------------------------------------------------------------------------------
  **State**        **Visual Treatment**                                                                                                                                                                                                     **Implementation**

  Loading          Skeleton placeholders matching the shape of expected content. No spinners on full pages --- spinners are only for inline actions (buttons, small panels). Skeleton uses pulsing animation with var(\--bg3) background.   isLoading=true: render \<Skeleton\> components. Set loading=true on fetch start, false on success or error.

  Empty            Centered illustration or icon + short message + primary CTA. Never show an empty table with just headers.                                                                                                                data.length===0 && !isLoading: render \<EmptyState icon={\...} message=\'No sources yet\' action=\'Create your first source\' /\>

  Success (data)   The normal rendered view with data. This is the primary state.                                                                                                                                                           data.length\>0: render the component normally.

  Error            Red-tinted card or banner at the top of the component area. Message + Retry button + optional \'Contact Support\' link. Never replace the entire page with an error unless it is a page-level failure.                   isError=true: render \<ErrorBanner message={\...} onRetry={refetch} /\>. Preserve any previously loaded data below the banner if possible.
  ---------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ --------------------------------------------------------------------------------------------------------------------------------------------

**Empty State Messages Per Page**

  -------------------------- ------------------------------------------------------------------------------- --------------------------------
  **Page**                   **Empty State Message**                                                         **CTA Button**

  Source List                No compliance sources created yet.                                              \+ Create Source

  Task Tracker               No tasks found matching your filters.                                           Clear Filters / Create Source

  Review Queue               No tasks pending your review. All caught up!                                    View Completed Reviews

  Audit Logs                 No audit log entries found for this filter.                                     Clear Filters

  Entity Monitoring          No entities configured. Set up entities in Admin Console.                       Open Admin

  Reports                    No saved reports yet. Build your first report.                                  \+ New Report

  Notification Center        No new notifications.                                                           (none)

  Admin User List            No users match this filter.                                                     Clear Filters / + Add User

  Clause Table (in wizard)   No clauses added. Add clauses manually or upload a regulation for AI parsing.   \+ Add Clause / Upload & Parse

  Task Template Table        No task templates for this clause. Add at least one to generate tasks.          \+ Add Task Template
  -------------------------- ------------------------------------------------------------------------------- --------------------------------

**12.3 Validation Error Handling**

**Client-Side Validation (Immediate)**

Runs on blur (field loses focus) and on form submit. Blocks submission until resolved.

  --------------------------------------- --------------------------------- --------------------------------------------------------------------------------- --------------------------------------------------
  **Rule**                                **Fields Affected**               **Error Message**                                                                 **Display**

  Required field empty                    All required fields               \"\[Field name\] is required.\"                                                   Inline, below field, red text + red border

  Min length                              Title (5), Clause Title (3)       \"Must be at least \[N\] characters.\"                                            Inline

  Max length                              Title (200), Description (5000)   \"Maximum \[N\] characters exceeded.\"                                            Inline + character counter

  Invalid date                            effective_from, effective_to      \"Please enter a valid date.\"                                                    Inline

  Date in past                            effective_from (on create)        \"Effective date cannot be in the past.\"                                         Inline

  effective_to before effective_from      effective_to                      \"End date must be after start date.\"                                            Inline

  Zero entities selected                  entities_in_scope                 \"Select at least one entity.\"                                                   Inline, below entity picker

  Duplicate clause number                 clause_number within source       \"Clause number already exists in this source.\"                                  Inline, checked on blur against existing clauses

  Due offset negative or zero             due_date_offset_days              \"Due offset must be at least 1 day.\"                                            Inline

  Escalation set but no target            escalation_days_after \> 0        \"Select an escalation target.\"                                                  Inline on escalation_to field

  Review required but no reviewer logic   review_required = true            \"Select how the reviewer should be assigned.\"                                   Inline on reviewer_logic field

  Email format                            user email                        \"Please enter a valid email address.\"                                           Inline

  Password strength                       password                          \"Password must be at least 8 characters with a number and special character.\"   Inline with strength meter
  --------------------------------------- --------------------------------- --------------------------------------------------------------------------------- --------------------------------------------------

**Server-Side Validation (On Submit)**

Always validate server-side even if client validated. Never trust the client.

  ----------------------------- --------------- ----------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------
  **Check**                     **HTTP Code**   **Response Body**                                                                   **User Message**

  Required field missing        400             { error: \'VALIDATION_ERROR\', field: \'title\', message: \'Title is required\' }   Same as client-side inline error

  Entity does not exist         400             { error: \'INVALID_REFERENCE\', field: \'entity_id\' }                              \"One or more selected entities are no longer valid. Please refresh and try again.\"

  Department inactive           400             { error: \'INACTIVE_REFERENCE\', field: \'department_id\' }                         \"Selected department is no longer active. Please choose another.\"

  User not authorized           403             { error: \'FORBIDDEN\', action: \'create_source\' }                                 \"You don't have permission to create sources. Contact your admin.\"

  Unique constraint violation   409             { error: \'DUPLICATE\', field: \'clause_number\' }                                  \"Clause number \[X\] already exists in this source.\"

  Optimistic lock conflict      409             { error: \'CONFLICT\', message: \'Modified by another user\' }                      \"This item was modified by \[user\] at \[time\]. Reload to see changes, or overwrite.\"

  Database error                500             { error: \'INTERNAL_ERROR\', ref: \'ERR-ABC123\' }                                  \"Something went wrong. Please try again. If this persists, contact support. Ref: ERR-ABC123\"

  Rate limited                  429             { error: \'RATE_LIMITED\', retryAfter: 60 }                                         \"Too many requests. Please wait a moment and try again.\"
  ----------------------------- --------------- ----------------------------------------------------------------------------------- ------------------------------------------------------------------------------------------------

**12.4 File Upload Error Handling**

Applies to: evidence upload, regulation document upload (AI parsing), report export download.

  ------------------------------------ ---------------------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------
  **Scenario**                         **Detection**                                        **User Experience**                                                                                                                          **System Action**

  Unsupported format                   Client-side: check file extension before upload      Toast: \"Only PDF, DOCX, XLSX, CSV, PNG, JPG, MSG, EML, ZIP files are supported.\" File picker stays open.                                   Reject at API level too. Log attempt.

  File too large (\>25MB)              Client-side: check file.size                         Toast: \"File exceeds 25MB limit. Please compress or split the file.\"                                                                       Reject at API. Log.

  Total evidence \>100MB               Server-side: sum of existing + new                   Toast: \"Total evidence for this task cannot exceed 100MB. Remove some files first.\"                                                        Return 400.

  Max 20 files per task                Server-side count                                    Toast: \"Maximum 20 files per task. Remove some to upload more.\"                                                                            Return 400.

  Network interruption mid-upload      Client: XHR progress drops to 0, timeout after 30s   Show: \"Upload interrupted. Retrying\...\" Auto-retry once. If fails again: \"Upload failed. Please check your connection and try again.\"   Use chunked upload for files \>5MB. Resume from last chunk.

  Virus detected                       Server-side async scan (ClamAV or cloud)             Toast (red): \"File \[name\] was rejected: malware detected. The file was not saved.\"                                                       Delete file from storage. Log evidence_virus_detected in audit. Do NOT notify other users --- handle silently.

  File corrupted (unreadable)          Server-side: attempt to read/validate                Toast: \"File appears to be corrupted or empty. Please re-upload.\"                                                                          Delete. Log.

  Storage service unavailable          Server-side: GCS/S3 returns 5xx                      Toast: \"File storage is temporarily unavailable. Please try again in a few minutes.\"                                                       Queue for retry (3x, exponential backoff). If all fail, return 503.

  Upload succeeds but DB write fails   Server-side transaction                              User sees no file in list. Orphan file in storage.                                                                                           Cleanup job runs hourly: find files in storage with no DB record, delete after 24h.
  ------------------------------------ ---------------------------------------------------- -------------------------------------------------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------

**12.5 AI Parsing & Chat Error Handling**

  ---------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------ --------------------------------
  **Scenario**                                               **User Experience**                                                                                                                                         **System Action**                                                              **Retry?**

  AI API timeout (\>60s)                                     Loading state for 60s, then: \"AI processing timed out.\" Two buttons: \"Retry\" and \"Continue manually\"                                                  Log ai_parse_failed. Increment timeout counter.                                Yes, 1 retry auto, then manual

  AI API returns 500/503                                     \"AI service is temporarily unavailable. You can try again or enter details manually.\"                                                                     Log. Check AI health endpoint. If down, show degraded mode banner site-wide.   Yes, manual only

  AI API returns 429 (rate limit)                            \"AI requests are busy right now. Please wait \[X\] seconds and try again.\"                                                                                Queue request. Retry after retryAfter header value.                            Yes, auto after delay

  AI returns empty response                                  \"AI could not extract content from this document. Please check the file is readable and contains text.\"                                                   Log with document metadata (file type, size, page count).                      Yes, manual

  AI returns partial data                                    Pre-fill what was extracted. Yellow banner: \"AI partially parsed this document. \[N\] clauses extracted. Please review and complete the rest manually.\"   Log with completeness score.                                                   No --- use what we got

  AI returns malformed JSON                                  \"AI response was invalid. Please try again or continue manually.\"                                                                                         Log full response for debugging. Alert dev team if \>5 failures/hour.          Yes, 1 retry auto

  AI suggests invalid values (e.g. nonexistent department)   Pre-fill field but mark as invalid with red border: \"AI suggested \[X\] but it doesn't exist in the system. Please select a valid option.\"                Map AI output to valid options. Log mismatch.                                  N/A

  AI chat: action on non-existent task                       Chat message: \"Task \[ID\] was not found. It may have been deleted or you may not have access.\"                                                           Log ai_action_failed with reason.                                              N/A

  AI chat: user lacks permission for action                  Chat message: \"You don't have permission to \[action\]. This requires \[role\] access.\"                                                                   Log ai_action_denied.                                                          N/A

  AI chat: action would violate business rule                Chat message: \"Cannot \[action\] because \[reason\]. For example: Cannot assign closed task.\"                                                             Log with rule that was violated.                                               N/A
  ---------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------------------ --------------------------------

**12.6 Scheduler & Cron Job Error Handling**

  ------------------- ------------------------------------ ----------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------
  **Job**             **Failure Scenario**                 **Recovery**                                                                                                                        **Monitoring**

  generate_tasks      DB connection lost mid-run           Transaction per entity. Partially generated entities are complete. Resume from next entity on retry.                                If job hasn't completed by T+2hr, alert admin via Slack + email.

  generate_tasks      Duplicate key error (idempotency)    Catch, log, skip. This is normal if job runs twice. No alert needed.                                                                Log count of skipped duplicates.

  generate_tasks      Template references deleted entity   Skip entity, log warning. Do not fail entire job.                                                                                   Weekly report of skipped generations.

  generate_tasks      Job didn't run (server down)         Health check at T+1hr. If not run, trigger manual catch-up via admin API. Catch-up generates all missed tasks.                      Uptime monitor on cron endpoint. PagerDuty/Slack alert.

  send_reminders      Slack API down                       Queue for retry (3x over 1hr). Fall back to email. Fall back to in-app notification.                                                Monitor Slack API health. Degraded banner if down \>30min.

  send_reminders      User has no Slack account            Skip Slack, send email + in-app only. Log slack_user_not_found.                                                                     Monthly report of users not in Slack.

  check_overdue       Task status already Overdue          Skip (idempotent). No double-flagging.                                                                                              Normal.

  check_overdue       Thousands of tasks overdue (batch)   Process in batches of 100. Don't send 1000 Slack messages at once --- rate limit to 10/sec.                                         Alert if \>100 tasks flagged in single run.

  check_escalations   Escalation target user is inactive   Escalate to next level: Dept Manager → CMP Manager → Admin → Super Admin. If all inactive (shouldn't happen): log critical error.   Alert if fallback chain exhausted.

  check_escalations   Escalation already sent              Skip (check escalation_sent_at). Idempotent.                                                                                        Normal.

  All jobs            Server out of memory                 Jobs have memory limits. If exceeded, kill and restart. Alert dev team.                                                             Memory monitoring. Auto-restart via process manager.

  All jobs            Deadlock                             DB-level retry with exponential backoff (100ms, 500ms, 2s). Max 3 retries.                                                          Log deadlock events. If \>5/day, investigate.
  ------------------- ------------------------------------ ----------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------

**12.7 Slack Delivery & Action Error Handling**

  ------------------------------------------- ----------------------------------------------------- --------------------------------------------------------------------------------------- -------------------------------------
  **Scenario**                                **Detection**                                         **Handling**                                                                            **Fallback**

  Slack API 500/503                           HTTP response code                                    Retry 3x (1s, 10s, 60s). If all fail, mark as failed.                                   Email + in-app notification

  Slack API 429 (rate limited)                HTTP 429 + Retry-After header                         Queue message. Retry after specified delay.                                             Wait and retry. No fallback needed.

  Channel not found                           Slack error: channel_not_found                        Log. Alert admin: \"Slack channel \[name\] not found. Reconfigure in Slack Config.\"    Email to affected users

  User not in workspace                       Slack error: user_not_found                           Log slack_user_not_found. Skip Slack for this user.                                     Email + in-app

  Message too long                            Slack error: msg_too_long                             Truncate message body. Add \"\... \[View in CMP\]\" link.                               N/A (truncation handles it)

  Interactive action: task already actioned   Check task status before executing                    Ephemeral Slack message: \"This task was already \[approved/assigned\] by \[user\].\"   N/A

  Interactive action: user lacks permission   Check role before executing                           Ephemeral: \"You don't have permission to \[action\].\"                                 N/A

  Interactive action: CMP backend down        HTTP timeout from Slack to CMP                        Ephemeral: \"CMP is temporarily unavailable. Please try again or use the web app.\"     User falls back to web UI

  Webhook signature validation fails          HMAC mismatch                                         Return 401. Log security event: slack_webhook_invalid_signature.                        N/A --- potential security incident

  Duplicate action click (double-tap)         Check if action already processed (idempotency key)   Show confirmation of original action. Don't execute twice.                              N/A
  ------------------------------------------- ----------------------------------------------------- --------------------------------------------------------------------------------------- -------------------------------------

**12.8 Concurrency & Conflict Handling**

  ------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  **Scenario**                                                  **Detection**                                                                                                                                           **Resolution**

  Two users edit same source simultaneously                     Optimistic locking: version column on source. On save, check version matches. If not, conflict.                                                         Dialog: \"This source was modified by \[user\] at \[time\]. Your changes: \[diff\]. Options: Overwrite / Reload / Merge (future)\". If user chooses Overwrite, increment version and save.

  Two users self-assign same task                               DB unique constraint on (task_id, assignment_status=\'Assigned\'). Second write fails.                                                                  First user succeeds. Second sees: \"This task was just assigned to \[user\]. Please refresh.\" Task removed from their unassigned queue.

  Admin deactivates user while user is mid-session              Session JWT is valid until expiry. Next API call checks user.is_active.                                                                                 On next API call: 403 \"Your account has been deactivated. Contact your admin.\" Force logout.

  Source archived while user is editing it                      Save API checks source.status. If Archived, reject.                                                                                                     Dialog: \"This source was archived by \[user\] at \[time\]. Your unsaved changes are preserved in clipboard. Contact admin to unarchive.\"

  Reviewer acts on task while PIC is editing                    Task status checked on PIC save. If status changed from In Progress to Pending Review, allow PIC save (evidence/comments). If Approved/Closed, block.   If blocked: \"This task was \[approved/closed\] while you were editing. Your evidence and comments have been saved but the task status cannot be changed.\"

  Two cron job instances run simultaneously                     Advisory lock (pg_advisory_lock). Second instance skips.                                                                                                Second instance logs \"Job already running, skipping\" and exits cleanly.

  Browser tab A submits task, tab B tries to submit same task   Check status on submit API. If already Submitted/Pending Review, reject.                                                                                Tab B: \"This task was already submitted. Refresh to see current status.\"
  ------------------------------------------------------------- ------------------------------------------------------------------------------------------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

**12.9 Partial Save & Recovery**

**Source Creation Wizard**

-   Auto-save draft every 60 seconds once user has entered any data

-   Draft saved to database with status=\'Draft\', even if incomplete

-   On wizard Step 1: auto-save triggers after first field blur if title is non-empty

-   On wizard Steps 2--3: auto-save after each clause/template add or edit

-   If browser crashes or network drops: user returns to find draft in Source List with status=\'Draft\'

-   Draft has a yellow banner: \"This source is a draft. Complete the wizard to activate.\" + \"Resume\" button

-   Resume opens the wizard at the last completed step

-   Drafts older than 30 days without activity: notify creator. After 60 days: auto-archive.

**Task Evidence Upload**

-   Files upload independently. If 3 of 5 uploads succeed and the 4th fails, the 3 successful files are preserved.

-   Failed uploads show inline retry button: \"Upload failed. \[Retry\] \[Remove\]\"

-   Do not auto-save evidence count to task until user explicitly saves/submits.

**General Form Editing**

-   Unsaved changes detection: if user navigates away with unsaved edits, show: \"You have unsaved changes. Leave anyway?\" with Stay / Leave options.

-   Form data persists in React state. If API call fails, form retains all data. User can fix and retry.

-   Session expiry during editing: on next save attempt, redirect to login. On successful login, redirect back to the same page. Form data may be lost --- mitigate with sessionStorage backup every 30 seconds for critical forms.

**12.10 Permission Error Handling**

  ----------------------------------- ---------- --------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------
  **Scenario**                        **HTTP**   **User Experience**                                                                                 **Notes**

  Access page without required role   403        Redirect to Dashboard with toast: \"You don't have access to \[page name\].\"                       Don't expose the page at all. Hide nav items for unauthorized pages.

  Perform action without permission   403        Inline error on the action: \"You don't have permission to \[action\]. Required role: \[role\].\"   Log attempt in audit with success=false.

  Access entity outside scope         403        Data simply not returned. User sees empty/filtered results.                                         Don't reveal that the entity exists. Filter at query level.

  Token expired                       401        Silent refresh attempt. If refresh fails: redirect to login.                                        Preserve current URL for post-login redirect.

  Token invalid/tampered              401        Force logout. \"Your session is invalid. Please log in again.\"                                     Log security event.

  IP blocked (future)                 403        \"Access denied from this location. Contact admin.\"                                                Log with IP.
  ----------------------------------- ---------- --------------------------------------------------------------------------------------------------- ----------------------------------------------------------------------

**12.11 Standard API Error Response Format**

Every API error response must follow this structure:

> { \"success\": false, \"error\": { \"code\": \"VALIDATION_ERROR\", \"message\": \"Human-readable message\", \"field\": \"title\", \"details\": \[\...\], \"ref\": \"ERR-a1b2c3\" } }

  ------------------------- ----------------- -------------------------------------------------
  **Error Code**            **HTTP Status**   **Meaning**

  VALIDATION_ERROR          400               Client input failed validation

  INVALID_REFERENCE         400               FK reference to non-existent or inactive record

  AUTHENTICATION_REQUIRED   401               No valid auth token

  FORBIDDEN                 403               Valid auth but insufficient permissions

  NOT_FOUND                 404               Resource does not exist (or user has no access)

  CONFLICT                  409               Optimistic lock conflict or duplicate

  RATE_LIMITED              429               Too many requests

  INTERNAL_ERROR            500               Unexpected server error

  SERVICE_UNAVAILABLE       503               Dependency down (AI, Slack, storage)
  ------------------------- ----------------- -------------------------------------------------

**12.12 Error Logging Structure**

All errors logged as structured JSON to the application log (separate from audit log):

> { \"level\": \"error\", \"timestamp\": \"ISO8601\", \"error_code\": \"INTERNAL_ERROR\", \"message\": \"DB connection refused\", \"stack\": \"\...\", \"user_id\": \"uuid\", \"action\": \"create_source\", \"payload\": {}, \"ref\": \"ERR-a1b2c3\", \"request_id\": \"uuid\" }

-   Levels: debug, info, warn, error, fatal

-   Error-level and above: alert dev team if \>10 errors/min

-   Fatal: immediate PagerDuty/Slack alert. Service may be down.

-   All errors include a ref code (\"ERR-\" + 6 random chars) shown to user for support correlation

-   Request ID: generated per HTTP request, threaded through all logs for that request

**Module 13: Source Creation Wizard --- Implementation Spec**

A dedicated implementation spec for the multi-step wizard. This is the most complex form in the application and needs precise specification for Cursor.

**13.1 Wizard Architecture**

**Component:** \<SourceCreationWizard /\> --- full-page experience, not a modal (too much content for modal)

**Route:** /sources/create

**Resume route:** /sources/{id}/edit (opens wizard for Draft sources)

**Steps:** 4 steps with progress indicator at top

**State management:** Single React state object holding all wizard data. Passed down to each step component.

**Persistence:** Auto-save to DB as Draft after Step 1 completion (title + at least one entity). Subsequent saves update the Draft.

**Navigation:** Back/Next buttons. Back always works (no data loss). Next validates current step before proceeding.

**Wizard State Shape**

> interface WizardState { step: 1 \| 2 \| 3 \| 4; source: { title, source_type, category, description, entities_in_scope\[\], department_id, effective_from, effective_to?, pic_user_id?, reviewer_user_id?, risk_level?, tags\[\] }; clauses: \[{ id (temp), clause_number, title, description, sequence_order, is_active, ai_generated, task_templates: \[{ id (temp), title, description, frequency, frequency_config, due_date_offset_days, review_required, reviewer_logic?, evidence_required, evidence_description?, expected_outcome?, priority, assignment_logic, reminder_days_before\[\], escalation_days_after?, escalation_to?, is_active, ai_generated }\] }\]; ai_upload: { file?, parsing_status, parsed_data?, error? }; draft_id?: string; is_dirty: boolean; last_saved_at?: Date; }

**Progress Indicator**

Horizontal stepper at the top of the page. Four steps shown as numbered circles connected by lines.

-   Step 1: Source Info --- circle filled red when complete

-   Step 2: Clauses --- circle filled red when ≥1 clause added

-   Step 3: Task Templates --- circle filled red when ≥1 template exists

-   Step 4: Review & Activate --- circle filled green on successful save

-   Current step has a red ring animation. Future steps are gray. Completed steps are solid red with a checkmark.

-   User can click any completed step to jump back (data preserved).

**13.2 Step 1: Source Information**

**Layout**

Two-column form layout on desktop (single column on mobile). Left column: title, type, category, description. Right column: entities, department, dates, PIC, reviewer, risk.

**Entry Path Selection**

At the top of Step 1, before the form fields, a prominent card with two options:

-   Left option: icon ✚ + \"Manual Entry\" + subtitle \"Fill in source details manually\" --- default selected

-   Right option: icon 🤖 + \"Upload Regulation\" + subtitle \"AI will parse and populate clauses and tasks\" --- purple accent

-   Clicking AI option reveals the upload area. Clicking Manual hides it.

**AI Upload Area (shown when AI path selected)**

-   Drag-and-drop zone with dashed border and file icon

-   Text: \"Drop a PDF, DOCX, or TXT file here, or click to browse\"

-   Accepted: .pdf, .docx, .txt. Max 25MB.

-   On file drop/select: immediate upload with progress bar

-   After upload: \"Processing with AI\...\" with animated progress (indeterminate)

-   Timeout: 60 seconds. After timeout: retry / switch to manual buttons.

-   On success: form fields auto-populate. Purple \"AI Suggested\" badge on each populated field.

-   User can edit any AI-populated field (editing removes the AI badge).

-   On failure: error message per Module 12.5 rules. Form stays empty, user can retry or switch to manual.

**Fields Detail**

  ---------------- ----------------------------------------- ----------------------------- -----------------------------------------------------------------------------------------------------------------------
  **Field**        **Component**                             **Validation**                **Default / Notes**

  Title            \<Input\> text                            Required, 5--200 chars        Auto-focused on page load

  Source Type      \<Select\> dropdown                       Required                      Options: Regulation, Internal Audit, External Audit, Policy, SOP, Other

  Category         \<Select\> dropdown                       Required                      AML, Sanctions, Regulatory Reporting, License, Data Protection, Consumer Protection, IT Security, Governance, Other

  Description      \<Textarea\> rich text                    Optional, max 5000            Show character counter

  Entities         \<EntityPicker\> typeahead multi-select   Required, min 1               Grouped by business group (EU, ME, APAC, LATAM, Africa). Flag icons. Selected entities show as tag chips below input.

  Department       \<Select\> dropdown                       Required                      Filtered to active departments only

  Effective From   \<DatePicker\>                            Required, ≥ today             Default: today

  Effective To     \<DatePicker\>                            Optional, \> effective_from   Default: empty (ongoing)

  PIC              \<UserSearch\> typeahead                  Optional                      Filtered to users in selected department. Shows: name, avatar, role. Null = dept queue.

  Reviewer         \<UserSearch\> typeahead                  Optional                      Filtered to users with Reviewer or higher role.

  Risk Level       \<Select\> dropdown                       Optional                      High, Medium, Low, Not Assessed. Default: Not Assessed

  Tags             \<TagInput\> chip input                   Optional                      Free-text. Enter/comma to add. Click X to remove.
  ---------------- ----------------------------------------- ----------------------------- -----------------------------------------------------------------------------------------------------------------------

**Step 1 → Step 2 Transition**

-   \"Next\" button validates all required fields

-   If validation passes: auto-save Draft to DB (first save creates the source record with status=Draft)

-   If AI path was used and parsing completed: clauses are pre-populated in Step 2

-   If validation fails: scroll to first error field, focus it, show all inline errors

**13.3 Step 2: Clauses**

**Layout**

Full-width editable table. Header row is fixed. Rows are the clauses.

**Table Columns**

  ------------- -------------- ------------------------- ----------------------------------------------------------------------------------------
  **Column**    **Width**      **Component**             **Notes**

  Drag handle   ≡ icon, 30px   Drag handle               6-dot icon for drag-and-drop reorder

  \#            40px           Auto number               Auto-set from sequence_order. Read-only display.

  Clause No.    120px          \<Input\> text            Required. e.g. Art.15(1). Validated unique on blur.

  Title         flex (fill)    \<Input\> text            Required. Min 3 chars.

  Description   ---            Hidden, expand-on-click   Click row or expand icon to show textarea below the row.

  Tasks         60px           Badge count               Read-only. Shows number of task templates. Clickable → jump to Step 3 for this clause.

  Active        60px           \<Toggle\> switch         Default on.

  Actions       80px           Button group              Expand, Delete, (more)
  ------------- -------------- ------------------------- ----------------------------------------------------------------------------------------

**Interactions**

-   \"+ Add Clause\" button: adds an empty row at the bottom. Focus moves to Clause No. field.

-   Drag and drop: grab handle, drag to reorder. sequence_order updates on drop.

-   Expand row: clicking the expand icon or description area shows a textarea below the row for the full description.

-   Delete: if source is Draft, hard delete. If source is Active, show "Deactivate instead" (cannot delete with tasks). Confirmation dialog for Active sources.

-   Bulk select: checkbox column (hidden by default, appears when user long-presses or right-clicks). Actions: Delete selected, Deactivate selected.

-   AI-generated rows: purple left border and "AI" badge on clause number cell.

-   Inline editing: all fields are editable directly in the table. No separate edit modal needed.

-   Auto-save: triggers 2 seconds after last edit (debounced). Saves to Draft.

**Step 2 → Step 3 Transition**

-   \"Next\" validates: at least 1 clause, all clause numbers filled and unique, all titles filled.

-   If AI path was used: task templates are pre-populated per clause in Step 3.

-   If validation fails: highlight problem rows in red.

**13.4 Step 3: Task Templates**

**Layout**

Accordion-style: each clause is a collapsible section. Click clause header to expand and see its task templates. Multiple can be open.

**Clause Section Header (Collapsed)**

-   Left: expand arrow + clause number + clause title

-   Right: task count badge + "+ Add Task" button

-   Click anywhere on header to expand/collapse

**Task Template Row (Expanded)**

Each task template is a card within the expanded clause section, not a table row (too many fields for a flat table). Card layout:

-   Row 1: Task Title (full width input), Priority dropdown, Active toggle, Delete button

-   Row 2: Frequency dropdown, Due Offset (number input + \"days after period start\" label)

-   Row 3: Review Required toggle, IF yes: Reviewer Logic dropdown (Fixed, Source Reviewer, Dept Manager, Round-robin)

-   Row 4: Evidence Required toggle, IF yes: Evidence Description textarea

-   Row 5: Expected Outcome textarea (collapsible, hidden by default)

-   Row 6: Assignment Logic dropdown, Reminder chips (7d, 3d, 1d --- click to toggle each), Escalation (number + target dropdown)

-   AI-generated templates: purple left border + "AI Suggested" badge on title

**Frequency Configuration**

When frequency is selected, additional config fields appear:

  --------------- ------------------------------------------------- ----------------------------------------------------------------------------
  **Frequency**   **Additional Config**                             **Due Offset Meaning**

  Daily           None                                              Days from task creation (typically 1)

  Weekly          Day of week dropdown (Mon--Fri)                   Days after the selected day

  Bi-weekly       Day of week + which week (1st/2nd of cycle)       Days after cycle start

  Monthly         Day of month (1--28, or Last)                     Days after month start. If 15: due on the 15th.

  Quarterly       Quarter start month (Jan/Apr/Jul/Oct or custom)   Days after quarter start

  Semi-annually   Start months (e.g. Jan+Jul)                       Days after period start

  Annually        Month + Day                                       Days after annual date

  One-time        Specific date                                     Due on that date. Template auto-deactivates after generation.

  Ad-hoc          None (manual trigger only)                        Not auto-generated. Template used as a blueprint for manual task creation.
  --------------- ------------------------------------------------- ----------------------------------------------------------------------------

**Interactions**

-   \"+ Add Task\" on a clause: adds a new empty template card at the bottom of that clause section. Focus on Title.

-   Delete template: confirmation if Active source. Immediate if Draft.

-   Collapse/expand clause sections: remembers state within session.

-   \"Expand All\" / \"Collapse All\" buttons at the top of Step 3.

-   Summary bar at top: \"X clauses, Y task templates total. Z review-required, W evidence-required.\"

-   Auto-save: debounced, 2 seconds after last edit.

**Step 3 → Step 4 Transition**

-   Validation: check all template-level rules (review_required needs reviewer_logic, escalation needs target, etc.)

-   Warning (non-blocking) for clauses with 0 templates: \"Clause \[X\] has no tasks. No work items will be generated.\"

-   If validation fails: expand the offending clause, highlight the problem template, show inline error.

**13.5 Step 4: Review & Activate**

**Layout**

Read-only summary of everything configured. No editing on this step --- user clicks \"Back\" to make changes.

**Summary Sections**

-   Source Information card: title, type, category, entities (as flag chips), department, dates, PIC, reviewer, risk level

-   Clause Summary card: table with clause number, title, task count per clause

-   Task Template Summary card: total count, grouped stats: by frequency (e.g. \"12 Monthly, 4 Quarterly, 2 Annual\"), review required count, evidence required count

-   Warnings section (yellow box): any non-blocking warnings from Steps 2--3

-   Validation section (green box if clean, red if issues): blocking issues that must be resolved before activation

**Status Selection**

Three clickable cards (radio-style selection):

-   Draft --- \"Save for later. No tasks will be generated.\" (gray card, default if issues exist)

-   Active --- \"Activate now. The cron job will begin generating tasks from the next scheduled cycle.\" (green card)

-   Pending Assignment --- \"Activate but PIC is not assigned. Source enters department queue.\" (amber card, auto-selected if PIC is null and user chose Active)

**Action Buttons**

-   \"Back\" --- returns to Step 3

-   \"Save as Draft\" --- saves with status=Draft. Redirect to Source Detail page. Toast: \"Source saved as draft.\"

-   \"Create & Activate\" --- saves with status=Active (or Pending Assignment). Full validation runs. On success: redirect to Source Detail page. Toast: \"Source created and activated. Tasks will be generated on the next scheduled run.\"

-   \"Create & Activate\" is disabled (grayed) if blocking validation issues exist. Tooltip on hover explains why.

**Post-Save Actions**

-   Audit log: source_created, clauses_created (with count), templates_created (with count)

-   If Active: next cron run picks up the new source and generates tasks

-   If PIC assigned: notification sent to PIC

-   If PIC null: source appears in department's unassigned queue

-   Redirect: /sources/{id} (Source Detail page)

**13.6 Resume Draft / Edit Active Source**

**Resume Draft**

-   Source List shows Draft sources with a \"Resume\" button

-   Clicking Resume opens /sources/{id}/edit which renders the wizard

-   Wizard pre-loads all saved data and opens at the last completed step

-   User can navigate to any step and continue editing

-   Save behavior is identical to creation (updates the existing Draft record)

**Edit Active Source**

-   Source Detail page has an \"Edit\" button (visible to CMP Manager and above)

-   Clicking Edit opens /sources/{id}/edit but NOT as a wizard --- as inline editing on the Source Detail page

-   Reason: active sources don't need the full wizard flow. Users edit specific sections in place.

-   Editable sections follow the editability matrix from Module 1B of the core blueprint

-   Changes to structural fields trigger the versioning dialog (\"This change requires a new version. Continue?\")

-   Adding new clauses or templates to an active source: allowed inline, takes effect from next cron cycle

**13.7 Reusable Components to Build**

These components are used in the wizard and across the entire application:

  ----------------------- ------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------
  **Component**           **Used In**                                                         **Props / Behavior**

  \<EntityPicker\>        Source creation, filters, admin entity access, reports              Typeahead input. Grouped dropdown (by business group). Multi-select. Flag icons. Selected items as tag chips. onSelect callback.

  \<UserSearch\>          PIC assignment, reviewer assignment, admin, AI chat actions         Typeahead input. Shows avatar, name, role, department. Filterable by department/role. Single select. onSelect callback.

  \<DatePresets\>         Task tracker filters, audit log filters, report filters             Chips: Today, This Week, This Month, This Quarter, Overdue. Plus custom date range inputs below. onSelect callback.

  \<ClauseTable\>         Source creation wizard (Step 2), Source Detail page (Clauses tab)   Editable inline table. Drag-and-drop reorder. Add/delete/toggle rows. Auto-save (debounced). AI badge support.

  \<TaskTemplateCard\>    Source creation wizard (Step 3), Source Detail page                 Card with all template fields. Conditional fields (reviewer logic shows if review=true, etc.). AI badge support.

  \<StatusBadge\>         Everywhere                                                          Props: status string, size (sm/md). Renders colored pill with dot.

  \<PriorityBadge\>       Task tracker, task detail, review queue                             Props: priority (High/Medium/Low). Renders colored chip.

  \<QuickViewChips\>      All list pages                                                      Props: views\[\] with label, count, active. Single-select toggle. onSelect callback.

  \<FilterPanel\>         All list pages                                                      Expandable panel. Grid of filter controls. Active filter tags below. onFilterChange callback.

  \<EmptyState\>          All data views                                                      Props: icon, message, cta_label, cta_action. Centered layout.

  \<ErrorBanner\>         All pages                                                           Props: message, onRetry, ref_code. Red-tinted banner with retry button.

  \<SkeletonLoader\>      All data views                                                      Props: type (table/card/stats/chart). Pulsing placeholder matching content shape.

  \<AISuggestionBadge\>   Wizard, source detail                                               Purple \"AI\" chip shown on AI-generated content. Disappears when user edits.

  \<WizardStepper\>       Source creation wizard                                              Props: steps\[\], current_step, completed_steps\[\]. Horizontal stepper with numbered circles.

  \<ConfirmDialog\>       All destructive actions                                             Props: title, message, confirm_label, cancel_label, variant (danger/warning/info). Modal.
  ----------------------- ------------------------------------------------------------------- ----------------------------------------------------------------------------------------------------------------------------------

**13.8 API Endpoints for Wizard**

  ------------ ----------------------------------------------- --------------------------------------------------------------- -----------------------------
  **Method**   **Endpoint**                                    **Purpose**                                                     **Auth**

  POST         /api/sources                                    Create source (Draft or Active)                                 CMP Manager+

  PUT          /api/sources/{id}                               Update source master fields                                     CMP Manager+

  PATCH        /api/sources/{id}/status                        Change status (activate, archive, etc.)                         CMP Manager+

  POST         /api/sources/{id}/clauses                       Add clause to source                                            CMP Manager+

  PUT          /api/sources/{id}/clauses/{id}                  Update clause                                                   CMP Manager+

  DELETE       /api/sources/{id}/clauses/{id}                  Delete clause (Draft only)                                      CMP Manager+

  PATCH        /api/sources/{id}/clauses/reorder               Reorder clauses (body: \[{id, sequence_order}\])                CMP Manager+

  POST         /api/sources/{id}/clauses/{id}/templates        Add task template                                               CMP Manager+

  PUT          /api/sources/{id}/clauses/{id}/templates/{id}   Update template                                                 CMP Manager+

  DELETE       /api/sources/{id}/clauses/{id}/templates/{id}   Delete template (Draft only)                                    CMP Manager+

  POST         /api/sources/ai-parse                           Upload file for AI parsing. Returns parsed JSON.                CMP Manager+ with AI access

  POST         /api/sources/{id}/activate                      Activate source (runs validation, creates tasks on next cron)   CMP Manager+

  GET          /api/sources/{id}/wizard-state                  Get full wizard state for resume                                CMP Manager+
  ------------ ----------------------------------------------- --------------------------------------------------------------- -----------------------------

**AI Parse Response Shape**

> POST /api/sources/ai-parse Body: { file: FormData } Response: { success: true, data: { suggested_title: string, suggested_type: string, suggested_category: string, suggested_description: string, clauses: \[{ clause_number: string, title: string, description: string, suggested_tasks: \[{ title: string, description: string, frequency: string, review_required: boolean, evidence_required: boolean, expected_outcome: string, priority: string }\] }\], confidence_score: number, warnings: string\[\] } }

**Bulk Save Endpoint**

For the wizard, use a single bulk save endpoint that creates/updates the entire source + clauses + templates in one transaction:

> POST /api/sources/wizard-save Body: { source: {\...}, clauses: \[{\..., task_templates: \[{\...}\]}\], status: \'Draft\' \| \'Active\' } Response: { success: true, source_id: string, stats: { clauses_created: N, templates_created: N } }

This ensures atomicity. If any part fails, the entire save is rolled back. The client does not need to manage partial state.
