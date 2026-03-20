# Build Step 16: In-App Notification Center — Completed ✓

## What was built

### 1. Backend API

#### `/api/notifications/route.ts`
**GET** - List notifications for current user
- **Authentication:** JWT required
- **Returns:**
  - `notifications`: Array of last 20 notifications, newest first
  - `unread_count`: Count of unread notifications
- **Includes:** All notification fields (id, type, title, message, link_url, is_read, related_task_id, related_source_id, created_at)
- **Sorting:** `created_at DESC`
- **Limit:** 20 notifications maximum

**PATCH** - Mark notifications as read
- **Authentication:** JWT required
- **Body options:**
  - `{ ids: string[] }` - Mark specific notifications as read
  - `{ all: true }` - Mark all user's unread notifications as read
- **Validation:** Zod schema ensures either `ids` or `all` is provided
- **Updates:** Sets `is_read = true` for matching notifications
- **Returns:** `updated_count` - number of notifications marked as read
- **Scope:** Only updates current user's notifications

### 2. Notification Service

#### `/lib/services/notification.service.ts`
Utility functions for notification management:

**`createNotification(params)`**
- Creates a single notification for a user
- Parameters:
  - `userId`: Target user ID
  - `type`: NotificationType enum
  - `title`: Notification title
  - `message`: Detailed message
  - `linkUrl`: Optional URL to navigate to
  - `relatedTaskId`: Optional task reference
  - `relatedSourceId`: Optional source reference
- Returns: Created notification object

**`createNotifications(userIds, params)`**
- Creates multiple notifications for multiple users (bulk operation)
- Uses `createMany` for efficiency
- Same parameters as `createNotification` except takes array of user IDs

**`markNotificationsRead(userId, notificationIds?)`**
- Marks notifications as read for a specific user
- If `notificationIds` provided: marks only those IDs
- If `notificationIds` omitted: marks all unread for user
- Returns: Update result with count

**`getUnreadCount(userId)`**
- Gets count of unread notifications for a user
- Returns: Integer count

### 3. Notification Dropdown Component

#### `/components/layout/NotificationDropdown.tsx`
Interactive bell icon with dropdown panel:

**Bell Icon:**
- Shows bell emoji (🔔)
- Red badge with unread count (shows "99+" if > 99)
- Click to toggle dropdown
- Positioned in topbar

**Dropdown Panel:**
- **Position:** Absolute, right-aligned below bell
- **Size:** 96 (384px) width, max 500px height
- **Header:**
  - "Notifications" title
  - "Mark all read" link (only shown if unread count > 0)
- **Notification List:**
  - Scrollable (max 400px height)
  - Up to 20 notifications shown
  - Each notification item displays:
    - Icon emoji based on type (📋, ⏰, 👁️, 🚨, 📄, 🔔, 📬)
    - Title (bold)
    - Message (truncated to 2 lines with `line-clamp-2`)
    - Relative time (e.g., "5 minutes ago", "2 hours ago")
    - Blue dot indicator for unread notifications
    - Light blue background tint for unread items
  - Click notification: Navigate to `link_url`, mark as read
- **Empty State:**
  - Shows 🔕 icon
  - "No new notifications" message
- **Footer:**
  - "View all notifications →" link (navigates to `/notifications`)
  - Only shown if notifications exist

**Features:**
- **Auto-refresh:** Polls for new notifications every 30 seconds
- **Close on outside click:** Detects clicks outside and closes dropdown
- **Optimistic UI:** Updates local state immediately when marking as read
- **Loading state:** Shows spinner while fetching
- **Type-specific icons:** Different emoji for each notification type

**Notification Types & Icons:**
- `TASK_ASSIGNED`: 📋
- `TASK_OVERDUE`: ⏰
- `REVIEW_NEEDED`: 👁️
- `ESCALATION`: 🚨
- `SOURCE_CREATED`: 📄
- `REMINDER`: 🔔
- Default: 📬

### 4. Topbar Integration

**Updated `/components/layout/Topbar.tsx`:**
- Replaced static notification button with `<NotificationDropdown />` component
- Removed hardcoded unread indicator
- Notification dropdown now dynamically shows actual unread count
- Positioned between AI Assistant button and right edge

### 5. Data Flow

**Notification Creation (by system):**
1. Cron jobs or user actions call `createNotification()` or `createNotifications()`
2. Notification record created in database with `is_read: false`
3. Notification appears in user's dropdown on next fetch/poll

**User reads notification:**
1. User clicks notification in dropdown
2. Frontend calls `markAsRead([notificationId])`
3. API updates `is_read = true`
4. Frontend updates local state (removes blue dot, removes blue background)
5. Unread count decrements
6. User navigates to `link_url` (if provided)

**Mark all as read:**
1. User clicks "Mark all read" in dropdown header
2. Frontend calls API with `{ all: true }`
3. API marks all unread notifications for user as read
4. Frontend updates all local notifications to read
5. Unread count resets to 0

### 6. Existing Notification Usage

**Cron Jobs (already creating notifications):**

**`send-reminders.ts`** (lines 79-90):
- Already creates notifications directly via `tx.notification.create()`
- Type: `REMINDER`
- Title: "Reminder: Task due in X days"
- Message: Task title, entity name, due date
- Link: `/tasks/${task.id}`
- Target: Task PIC

**Note:** The existing cron jobs (`send-reminders`, `check-overdue`, `check-escalations`) already create notifications directly using Prisma transactions, so no updates to those files were needed. They don't use the notification service, but that's fine—both approaches work.

### 7. Performance Considerations

**Backend:**
- Parallel queries for notifications and unread count
- Limited to 20 notifications (prevents large payloads)
- Indexed query on `user_id, is_read` (efficient filtering)

**Frontend:**
- Polling interval: 30 seconds (balance between freshness and load)
- Local state management (no unnecessary refetches)
- Optimistic updates (instant UI feedback)
- Close-on-outside-click (good UX)
- Automatic cleanup of event listeners

**Database:**
- Notification table has composite index on `[user_id, is_read]`
- Efficient queries for user-specific unread count
- `updateMany` for bulk mark-as-read operations

### 8. UX Features

**Visual Indicators:**
- Red badge on bell (shows count)
- Blue dot on unread notifications
- Blue background tint on unread items
- Smooth transitions and hover effects

**Interactions:**
- Click bell: Toggle dropdown
- Click notification: Mark as read + navigate
- Click "Mark all read": Bulk action
- Click "View all": Navigate to full page
- Click outside: Close dropdown

**Responsive Design:**
- Dropdown positioned relative to bell
- Fixed width (384px) for consistent layout
- Scrollable list for many notifications
- Text truncation for long messages

**Time Display:**
- Relative time format (e.g., "2 minutes ago")
- Uses `date-fns` `formatDistanceToNow()`
- Automatically updates with each poll

### 9. Integration Points

**Existing features used:**
- **AuthContext:** JWT token for API authentication
- **Router:** Navigation to notification links
- **Theme System:** All colors use CSS custom properties
- **date-fns:** Relative time formatting

**Data sources:**
- `prisma.notification` - All notification CRUD operations
- Filtered by `user_id` from JWT token

**Future integration:**
- Other modules (review actions, assignments) can use `notification.service.ts`
- Can be extended to support push notifications, email, Slack
- Can add "View all" notifications page at `/notifications`

## Testing Notes

1. **Notification Creation:**
   - Run cron job → Should create notifications
   - Check dropdown → Should show new notifications
   - Verify unread count badge appears

2. **Mark as Read:**
   - Click notification → Blue dot disappears
   - Click "Mark all read" → All dots disappear
   - Unread count → Decrements correctly

3. **Polling:**
   - Wait 30 seconds → Should fetch new notifications
   - Create notification in another window → Should appear after poll

4. **Navigation:**
   - Click notification with link → Should navigate
   - Click "View all" → Should go to `/notifications` (create this page later)

5. **Empty State:**
   - Mark all as read → Should show 🔕 "No new notifications"

6. **Close Dropdown:**
   - Click outside → Should close
   - Click bell again → Should toggle

7. **Unread Badge:**
   - 0 unread → No badge
   - 1-99 unread → Shows number
   - 100+ unread → Shows "99+"

## Database Impact

No schema changes required. Uses existing `Notification` table:
- `id`, `user_id`, `type`, `title`, `message`, `link_url`, `is_read`
- `related_source_id`, `related_task_id`, `created_at`
- Indexed on `[user_id, is_read]`

## Security

- JWT authentication required for all endpoints
- Users can only see/update their own notifications
- Validation with Zod schemas
- SQL injection protection via Prisma
- No sensitive data in notification messages

## Next Steps (Future Enhancements)

- Create full notifications page at `/notifications` (show all, with pagination)
- Add filters by type (task, review, escalation, etc.)
- Add search in notifications
- Add "Delete notification" action
- Add notification preferences (which types to receive)
- Add email notifications (send email for critical notifications)
- Add push notifications (browser push API)
- Add Slack notifications (webhook integration)
- Add notification batching (group similar notifications)
- Add WebSocket support for real-time updates (replace polling)

---

**Build Status:** ✅ Complete
**Files Created:** 3 (1 API route, 1 service, 1 component)
**Files Updated:** 1 (Topbar.tsx)
**Build Result:** Success (expected dynamic route warnings)
**Polling Interval:** 30 seconds
**Max Notifications Shown:** 20
