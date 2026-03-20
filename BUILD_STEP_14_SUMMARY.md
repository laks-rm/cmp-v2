# Build Step 14: Entity and Group Monitoring Pages — Completed ✓

## What was built

### 1. Backend APIs

#### `/api/monitoring/entities/route.ts`
**GET** - Entity performance data
- **Authentication:** JWT required
- **Returns:** Array of entity performance stats including:
  - **Entity details:** id, code, name, country flag emoji, group name
  - **Compliance metrics:**
    - `compliance_score`: Percentage of approved tasks vs. total due tasks (approved / due * 100)
    - `source_count`: Number of active sources linked to entity
    - `total_tasks`: Total task instances
    - `approved_count`: Tasks with APPROVED status
    - `overdue_count`: Tasks with OVERDUE status
    - `open_task_count`: Tasks with NOT_STARTED or IN_PROGRESS status
    - `pending_review_count`: Tasks with PENDING_REVIEW or RETURNED status
    - `exception_count`: Tasks with RETURNED status (represents quality issues)
- **Sorting:** Entities ordered by group name, then entity name
- **Performance:** Parallel queries for optimal speed

#### `/api/monitoring/groups/route.ts`
**GET** - Group performance data
- **Authentication:** JWT required
- **Returns:** Array of group performance stats including:
  - **Group details:** id, code, name, group emoji (🌍)
  - **Aggregated metrics:**
    - `compliance_score`: Average of all member entity scores
    - `source_count`: Unique sources across all member entities
    - `total_tasks`: Sum of tasks across all entities
    - `overdue_count`: Sum of overdue tasks
    - `pending_review_count`: Sum of pending review tasks
    - `exception_count`: Sum of returned tasks
    - `entity_count`: Number of entities in group
  - **Member entities:** Full array of entity stats for drill-down
- **Calculation:** Aggregates entity-level data at group level
- **Unique source counting:** Uses Set to avoid double-counting sources across entities

### 2. Frontend Components

#### `/components/monitoring/EntityCard.tsx`
**Reusable entity card component** with:
- **Layout:**
  - Large country flag emoji (4xl)
  - Entity name (legal name) and code badge
  - Group name (secondary text)
- **Stats grid (3 columns):**
  - Compliance Score: Large colored number with %
    - Green >80% (healthy)
    - Amber 60-80% (warning)
    - Red <60% (critical)
  - Source Count: Blue number
  - Overdue Count: Red number (if > 0)
- **Secondary stats:** Open tasks, pending review (small text)
- **Bottom progress bar:** Gradient fill showing compliance score
- **Interactions:**
  - Hover: Lift effect (-translate-y-1) + teal border
  - Click: Navigate to filtered task tracker (`/tasks?entity_id=X`)
- **Visual design:** Card-based, rounded corners, smooth transitions

#### `/components/monitoring/GroupCard.tsx`
**Collapsible group card component** with:
- **Header (always visible):**
  - Group emoji (4xl)
  - Group name and code
  - Entity count badge
  - Expand/collapse button (▶/▼)
- **Stats grid (4 columns):**
  - Overall Score: Colored percentage
  - Sources: Blue number
  - Overdue: Red number (if > 0)
  - Review Backlog: Amber number (if > 0)
- **Progress bar:** Rounded gradient bar showing group score
- **Expanded view:**
  - "Member Entities" section header
  - Grid of EntityCard components (3 columns on lg screens)
  - Light background to distinguish from parent card
- **Interactions:**
  - Click header to toggle expansion
  - Each member entity card is individually clickable

### 3. Frontend Pages

#### `/app/(dashboard)/entities/page.tsx`
**Pattern C: Monitoring Page**
- **Page Header:**
  - Title: "Entity Monitoring"
  - Subtitle: "Real-time compliance performance across all entities"
- **Stats Strip (5 cards):**
  - Total Entities (blue)
  - Healthy >80% (green)
  - Warning 60-80% (amber)
  - Critical <60% (red)
  - Avg Compliance (teal)
- **Entity Cards Grid:**
  - Responsive: 1 col mobile, 2 cols tablet (md), 3 cols desktop (lg)
  - Gap: 6 (1.5rem spacing)
  - All EntityCard components in grid
- **States:**
  - Loading: Teal spinner
  - Error: Red banner with retry button
  - Empty: Icon (🏢) + "No entities found" message

#### `/app/(dashboard)/groups/page.tsx`
**Pattern C: Monitoring Page**
- **Page Header:**
  - Title: "Group Monitoring"
  - Subtitle: "Aggregated compliance performance by entity group"
- **Stats Strip (5 cards):**
  - Total Groups (blue)
  - Total Entities (purple)
  - Total Sources (green)
  - Total Overdue (red, conditional color)
  - Avg Compliance (teal)
- **Group Cards:**
  - Vertical stack (space-y-4)
  - All GroupCard components in list
  - Each can expand to show member entities
- **States:**
  - Loading: Teal spinner
  - Error: Red banner with retry button
  - Empty: Icon (🌍) + "No groups found" message

### 4. Compliance Score Calculation

**Formula:**
```
compliance_score = (approved_tasks / due_tasks) * 100
```

**Rules:**
- **due_tasks:** Tasks where `due_date <= current_date`
- **approved_tasks:** Tasks with `status = APPROVED`
- **Default:** If no due tasks, score = 100% (perfect compliance)
- **Rounding:** Scores rounded to nearest integer

**Color Thresholds:**
- **Green (Healthy):** ≥80%
- **Amber (Warning):** 60-79%
- **Red (Critical):** <60%

### 5. Visual Design

**Entity Cards:**
- Gradient progress bar at bottom
- Lift effect on hover with teal border
- Smooth transitions (all properties)
- Clean stats grid with colored numbers
- Responsive font sizes

**Group Cards:**
- Collapsible design for space efficiency
- Two-level hierarchy (group → entities)
- Rounded progress bar (full border-radius)
- Clear visual separation between header and expanded content
- Nested EntityCard components reuse all entity card features

**Color Palette (Monitoring):**
- Compliance Score: Green/Amber/Red (conditional)
- Sources: Blue
- Overdue: Red
- Pending Review: Amber
- Hover Border: Teal
- Background: Card, Secondary (for expanded sections)

### 6. Navigation Flow

**User Journey:**
1. **Entry:** User navigates to "Entities" or "Groups" from sidebar
2. **Overview:** User sees high-level stats strip at top
3. **Entity view:**
   - Click entity card → Navigate to `/tasks?entity_id=X` (filtered task tracker)
4. **Group view:**
   - Click group header → Expand to see member entities
   - Click member entity → Navigate to `/tasks?entity_id=X`

**Filters applied on task tracker:**
- `entity_id` query parameter automatically filters tasks for selected entity
- Existing task tracker page already supports this filter

### 7. Performance Considerations

**API Optimization:**
- Parallel queries using `Promise.all()` for multiple entities
- Single database query per entity (includes all task statuses)
- In-memory filtering and aggregation (no multiple DB calls)
- Unique source counting via JavaScript Set (efficient)

**Frontend Optimization:**
- Client components only fetch data on mount
- No unnecessary re-renders (useState for expansion state only)
- Responsive grid with Tailwind breakpoints
- Hover effects use CSS transitions (no JS)

### 8. Integration Points

**Existing features used:**
- **Sidebar:** "Entities" and "Groups" links already present
- **Task Tracker:** `/tasks` page supports `entity_id` filter (from Step 10)
- **AuthContext:** JWT token for API authentication
- **Theme System:** All colors use CSS custom properties

**Data sources:**
- **Entities:** `prisma.entity` with `group` relation
- **Groups:** `prisma.group` with `entities` relation
- **Tasks:** `prisma.taskInstance` for all performance calculations
- **Sources:** `prisma.source` with `entities_in_scope` relation

## Testing Notes

1. **Compliance Score Calculation:**
   - Test with no due tasks → Should show 100%
   - Test with all approved → Should show 100%
   - Test with half approved → Should show 50%

2. **Entity Navigation:**
   - Click entity card → Should navigate to `/tasks?entity_id=X`
   - Task tracker should show only that entity's tasks

3. **Group Expansion:**
   - Click group header → Should expand to show entities
   - Click again → Should collapse
   - Member entity cards should be clickable

4. **Color Thresholds:**
   - Score 85% → Green
   - Score 70% → Amber
   - Score 40% → Red

5. **Responsive Layout:**
   - Mobile: 1 entity card per row
   - Tablet: 2 entity cards per row
   - Desktop: 3 entity cards per row

6. **Empty States:**
   - Test with no entities → Should show "No entities found"
   - Test with no groups → Should show "No groups found"

## Database Impact

No schema changes required. Uses existing tables:
- `Entity` (read-only)
- `Group` (read-only)
- `TaskInstance` (read-only for calculations)
- `Source` (read-only for counting)
- `SourceEntity` (join table for entity-source relation)

## Next Steps (Future Enhancements)

- Add date range filter for compliance calculations
- Add export functionality (CSV/Excel)
- Add drill-down to source-level compliance
- Add historical trend charts (compliance over time)
- Add threshold alerts (notify when score drops below X%)
- Add comparison view (compare entities side-by-side)
- Add group-level task filtering (click group → see all group tasks)

---

**Build Status:** ✅ Complete
**Files Created:** 6 (2 API routes, 2 components, 2 pages)
**Build Result:** Success (expected dynamic route warnings)
**Performance:** Optimized with parallel queries and in-memory aggregation
