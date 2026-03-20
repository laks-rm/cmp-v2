# Build Step 17: Department Queue and Self-Assignment Flow — Completed ✓

## What was built

### 1. Backend API

#### `/api/tasks/[id]/assign/route.ts`
**POST** - Assign or self-assign a task with concurrent protection

**Request Body:**
```json
{
  "pic_user_id": "optional-user-id"
}
```

**Two Assignment Modes:**

**1. Self-Assignment** (when `pic_user_id` is not provided):
- Task must have `assignment_status = 'UNASSIGNED'`
- User must be in the task's department
- First-come-first-served basis
- **Concurrent Protection:** Uses `updateMany` with WHERE clause to prevent race conditions
- If someone else grabbed it first: Returns 409 error with conflicting user's name

**2. Manager Assignment** (when `pic_user_id` is provided):
- Current user must be DEPT_MANAGER, CMP_MANAGER, ADMIN, or SUPER_ADMIN
- Target user must be in the task's department
- Can reassign tasks that aren't APPROVED or CLOSED
- Old PIC receives notification about reassignment
- Direct update (no race condition possible)

**Validation Rules:**
- Cannot assign APPROVED or CLOSED tasks
- Self-assign: Task must be UNASSIGNED
- Self-assign: User must be in task's department
- Manager assign: Target user must exist
- Manager assign: Target user must be in task's department

**Assignment Logic:**
- Sets `pic_user_id` to target user
- Sets `assignment_status` to:
  - `ASSIGNED` (first assignment)
  - `REASSIGNED` (subsequent assignments)

**Side Effects:**
1. **Audit Log:** Records `task_assigned` or `task_reassigned` action
   - Includes old/new `pic_user_id` values
   - Links to source and task

2. **Notification to New PIC:**
   - Type: `TASK_ASSIGNED`
   - Title varies:
     - Self-assign: "You claimed a task"
     - First assignment: "New task assigned to you"
     - Reassignment: "Task reassigned to you"
   - Message: Task title, entity name
   - Link: `/tasks/{id}`

3. **Notification to Old PIC (if reassignment):**
   - Type: `TASK_ASSIGNED`
   - Title: "Task reassigned"
   - Message: Task title, new assignee name
   - Link: `/tasks/{id}`

**Optimistic Concurrency Control:**
```typescript
// Self-assign uses optimistic update
const updateResult = await tx.taskInstance.updateMany({
  where: {
    id: params.id,
    assignment_status: 'UNASSIGNED', // Critical WHERE clause
  },
  data: {
    pic_user_id: targetUserId,
    assignment_status: 'ASSIGNED',
  },
})

// If count is 0, someone else already grabbed it
if (updateResult.count === 0) {
  throw new Error('CONCURRENT_ASSIGNMENT')
}
```

**Error Handling:**
- `401 AUTHENTICATION_REQUIRED`: No JWT token or invalid
- `403 WRONG_DEPARTMENT`: User not in task's department
- `403 INSUFFICIENT_PERMISSIONS`: Non-manager trying to assign to others
- `400 TASK_LOCKED`: Task is APPROVED or CLOSED
- `404 TASK_NOT_FOUND`: Task doesn't exist
- `404 TARGET_USER_NOT_FOUND`: Target user doesn't exist
- `409 TASK_ALREADY_ASSIGNED`: Concurrent assignment detected
  - Special message: "This task was already assigned to [Name]. Please refresh to see changes."

### 2. Frontend Integration Points

**Note:** This step focuses on the backend API. Frontend UI integration (task tracker buttons, department queue filter, source detail button) will be implemented when building the task tracker and source detail pages, as specified in the prompt.

**Planned Frontend Features:**

**1. Task Tracker "Assign to me" Button:**
- Button visible on unassigned task rows
- Only shown for tasks in user's department
- On click: Calls `/api/tasks/[id]/assign` with empty body
- Success: Button changes to show user's name + toast "Task assigned to you"
- Conflict: Shows alert "This task was already assigned to [name]. Refresh to see changes."

**2. Department Queue View (QuickViewChips filter):**
- Filter: `department = user's department AND assignment_status = UNASSIGNED`
- Shows prominent "Assign to me" button on each row
- Real-time updates after assignment

**3. Source Detail Header:**
- If `source.pic_user_id = null`: Shows "Unassigned — Assign to me" button
- Only visible to users in the source's department
- On click: Assigns source to current user

### 3. Database Operations

**Transaction Flow:**
```
START TRANSACTION
  1. Update task (with optimistic WHERE for self-assign)
  2. Check update count (self-assign only)
  3. Fetch updated task with relations
  4. Create audit log entry
  5. Create notification for new PIC
  6. Create notification for old PIC (if reassignment)
COMMIT
```

**Prisma Operations Used:**
- `taskInstance.updateMany()` - For optimistic self-assign
- `taskInstance.update()` - For manager assignment
- `taskInstance.findUnique()` - For fetching task details
- `user.findUnique()` - For user validation
- `auditLog.create()` - For audit trail
- `notification.create()` - For notifications (2 creates for reassignment)

### 4. Concurrency Control Mechanism

**Problem:** Multiple users trying to self-assign the same task simultaneously

**Solution:** Optimistic Concurrency Control with WHERE clause

**How it works:**
1. User A and User B both see unassigned task
2. Both click "Assign to me" at the same time
3. Database executes two `updateMany` queries:
   ```sql
   UPDATE task_instance 
   SET pic_user_id = 'userA', assignment_status = 'ASSIGNED'
   WHERE id = 'task123' AND assignment_status = 'UNASSIGNED'
   ```
4. First query succeeds (returns count = 1)
5. Second query fails (returns count = 0, because status is now 'ASSIGNED')
6. API returns 409 error to second user with helpful message
7. Second user sees: "This task was already assigned to User A. Please refresh to see changes."

**Why `updateMany` instead of `update`?**
- `updateMany` returns affected row count
- Allows detecting when the WHERE condition wasn't met
- `update` would throw an error if row doesn't match (harder to handle)

### 5. Business Rules Enforced

**Self-Assignment Rules:**
- ✅ Task must be UNASSIGNED
- ✅ User must be in task's department
- ✅ First-come-first-served (concurrent protection)
- ❌ Cannot self-assign if task already assigned
- ❌ Cannot self-assign tasks from other departments
- ❌ Cannot self-assign APPROVED/CLOSED tasks

**Manager Assignment Rules:**
- ✅ User must be manager (DEPT_MANAGER, CMP_MANAGER, ADMIN, SUPER_ADMIN)
- ✅ Can reassign tasks (except APPROVED/CLOSED)
- ✅ Target user must be in task's department
- ❌ Cannot assign APPROVED/CLOSED tasks
- ❌ Cannot assign to users from other departments

**Notification Rules:**
- ✅ New PIC always receives notification
- ✅ Old PIC receives notification on reassignment (if different from new PIC)
- ✅ Different titles for self-assign vs. manager-assign vs. reassign
- ✅ Notifications link to task detail page

### 6. Audit Trail

**Action Types:**
- `task_assigned` - First assignment
- `task_reassigned` - Subsequent assignment

**Logged Data:**
- `user_id`: Who performed the assignment
- `task_instance_id`: Which task was assigned
- `source_id`: Parent source reference
- `channel`: Always 'WEB' for manual assignments
- `old_value`: Previous `pic_user_id` (if reassignment)
- `new_value`: New `pic_user_id`
- `success`: Always true (failures don't create logs)

### 7. Performance Considerations

**Optimizations:**
- Single transaction for all operations (atomic)
- Parallel fetch of user and task (no sequential waits)
- Efficient WHERE clause in optimistic update
- No unnecessary DB round-trips

**Scalability:**
- Handles concurrent assignments gracefully
- No database locks (optimistic approach)
- Fast failure for race conditions
- Clear error messages for debugging

### 8. Security Features

**Authentication:**
- JWT token required
- Token validation before any DB operations

**Authorization:**
- Role-based checks for manager assignments
- Department-based checks for self-assignments
- Verify target user exists and permissions

**Data Validation:**
- Zod schema for request body
- Optional `pic_user_id` field
- String validation for user IDs

**Audit & Compliance:**
- All assignments logged to audit trail
- Old/new values recorded
- User action attribution
- Timestamp tracking

### 9. Error Messages (User-Friendly)

**Self-Assignment Errors:**
- "This task was already assigned to [Name]. Please refresh to see changes." (409)
- "You can only self-assign tasks from your department" (403)

**Manager Assignment Errors:**
- "Only managers can assign tasks to others" (403)
- "Cannot assign to user from different department" (400)
- "Target user not found" (404)

**General Errors:**
- "Cannot assign a task that is approved or closed" (400)
- "Task not found" (404)
- "User not found" (404)

### 10. Integration with Existing Features

**Used by:**
- Task Tracker (unassigned tasks list)
- Department Queue view
- Source Detail page (for unassigned sources)

**Uses:**
- Notification service (creates notifications)
- Audit service (logs assignments)
- Auth system (JWT validation)
- User roles (permission checks)

**Updates:**
- `task_instance.pic_user_id`
- `task_instance.assignment_status`
- `notification` table (new records)
- `audit_log` table (new records)

## Testing Scenarios

### 1. Self-Assignment - Success
- User in Finance department
- Task in Finance department, UNASSIGNED
- Click "Assign to me"
- **Expected:** Task assigned, notification created, audit logged

### 2. Self-Assignment - Concurrent Conflict
- User A and User B both in Finance
- Both click "Assign to me" simultaneously
- **Expected:** One succeeds, one gets 409 error with name

### 3. Self-Assignment - Wrong Department
- User in Finance department
- Task in Operations department
- Click "Assign to me"
- **Expected:** 403 error, task not assigned

### 4. Manager Assignment - Success
- Manager assigns task to team member
- Both in same department
- **Expected:** Task assigned, both users notified

### 5. Reassignment
- Task currently assigned to User A
- Manager reassigns to User B
- **Expected:** Task reassigned, both users notified, audit logged

### 6. Locked Task
- Task status is APPROVED
- Try to assign
- **Expected:** 400 error, task not assigned

### 7. Non-Manager Assigns to Others
- Regular user (PIC role)
- Tries to assign task to colleague
- **Expected:** 403 error

## Database Impact

No schema changes required. Uses existing fields:
- `task_instance.pic_user_id` (nullable string)
- `task_instance.assignment_status` (enum: UNASSIGNED, ASSIGNED, REASSIGNED, ESCALATED)
- `notification` table (for new notifications)
- `audit_log` table (for assignment tracking)

## Next Steps (Future Enhancements)

- Add assignment queue analytics (average time to assign)
- Add "Claim and start" button (assign + change status to IN_PROGRESS)
- Add assignment history view (show all past assignments for a task)
- Add workload balancing (suggest least-busy team member)
- Add assignment rules (auto-assign based on expertise, availability)
- Add bulk assignment (manager assigns multiple tasks at once)
- Add assignment notifications to Slack
- Add "Return to queue" action (PIC can unassign themselves)

---

**Build Status:** ✅ Complete
**Files Created:** 1 (1 API route)
**Build Result:** Success (expected dynamic route warnings)
**Concurrent Protection:** Optimistic locking with `updateMany`
**Race Condition Handling:** Graceful 409 error with helpful message
