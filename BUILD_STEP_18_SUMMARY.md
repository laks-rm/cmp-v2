# Build Step 18: Configurable Reports Page with Report Builder — Completed ✓

## What was built

### 1. Backend API

#### `/api/reports/route.ts`
**POST** - Execute or save report

**Actions:**
1. **Run Report** (`action: 'run'`):
   - Validates configuration with Zod
   - Executes query based on selected module
   - Returns filtered results with only requested columns
   - Limits to 1000 rows for performance

2. **Save Report** (`action: 'save'`):
   - Validates configuration + name/description
   - Saves report for later reuse (placeholder implementation)
   - Returns saved report object

**Request Body:**
```json
{
  "action": "run" | "save",
  "config": {
    "module": "sources" | "clauses" | "tasks" | "reviews" | "entities" | "audit",
    "filters": {},
    "columns": ["col1", "col2"],
    "groupBy": "optional",
    "sortBy": "optional",
    "sortOrder": "asc" | "desc",
    "format": "table" | "bar_chart" | "summary"
  }
}
```

**Supported Modules:**
- **sources**: Includes clauses, entities_in_scope, department
- **tasks**: Includes source, clause, entity, department, pic_user, reviewer_user
- **entities**: Includes group, task_instances (status count)
- **audit**: Includes user details

**Column Filtering:**
- Supports nested properties (e.g., `entity.name`, `pic_user.name`)
- Returns only requested columns in results
- Handles missing values gracefully

**GET** - List saved reports
- Returns array of saved reports (placeholder, empty for now)
- Requires authentication

### 2. Frontend Page

#### `/app/(dashboard)/reports/page.tsx`
Interactive 4-step report builder with live preview

**Step 1: Choose Module**
- 6 clickable module cards:
  - 📋 Sources (Compliance source documents)
  - 📄 Clauses (Compliance clauses)
  - ✅ Tasks (Task instances)
  - 👁️ Reviews (Review queue data)
  - 🏢 Entities (Entity performance)
  - 📜 Audit Logs (System audit trail)
- Large icons, titles, descriptions
- Selected module highlighted in red

**Step 2: Configure Filters (Placeholder)**
- Currently shows "Filters coming soon"
- Placeholder for future FilterPanel integration
- Back/Next navigation

**Step 3: Choose Columns**
- Toggle chips for each available column
- Module-specific column options:
  - **Sources**: title, type, category, status, created_at, updated_at
  - **Tasks**: task_code, title, status, priority, due_date, entity.name, pic_user.name
  - **Entities**: name, code, country_flag_emoji, group.name, is_active
  - **Audit**: action_type, module, user.name, channel, timestamp, success
- Selected columns highlighted in red
- Must select at least one column to proceed

**Step 4: Sort & Format**
- **Sort By** dropdown (choose from selected columns)
- **Sort Order** toggle (Ascending/Descending)
- **Run Report** button (triggers API call)

**Step Indicator:**
- Numbered circles (1-4) at top
- Red highlight for current/completed steps
- Clickable to jump between steps
- Progress line connects steps

**Results Preview Section:**
- Appears below builder after running report
- Shows total row count
- **Export CSV** button (downloads all results)
- **Results table:**
  - Shows first 100 rows
  - Displays only selected columns
  - Handles nested properties
  - Message if more than 100 rows: "Showing first 100 rows. Export CSV to see all X rows."

**Actions:**
- **Run Report**: Executes query, shows results
- **Export CSV**: Downloads results as CSV file
- **Back/Next**: Navigate between steps

### 3. Report Configuration

**Configuration Object:**
```typescript
interface ReportConfig {
  module: 'sources' | 'clauses' | 'tasks' | 'reviews' | 'entities' | 'audit'
  filters: Record<string, any>
  columns: string[]
  groupBy?: string
  sortBy?: string
  sortOrder: 'asc' | 'desc'
  format: 'table' | 'bar_chart' | 'summary'
}
```

**Column Options by Module:**
```typescript
{
  sources: ['title', 'type', 'category', 'status', 'created_at', 'updated_at'],
  tasks: ['task_code', 'title', 'status', 'priority', 'due_date', 'entity.name', 'pic_user.name'],
  entities: ['name', 'code', 'country_flag_emoji', 'group.name', 'is_active'],
  audit: ['action_type', 'module', 'user.name', 'channel', 'timestamp', 'success'],
}
```

### 4. CSV Export Functionality

**Implementation:**
```typescript
const exportCSV = () => {
  const headers = config.columns.join(',')
  const rows = results.results.map((row) =>
    config.columns.map((col) => JSON.stringify(row[col] || '')).join(',')
  )
  const csv = [headers, ...rows].join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

**Features:**
- Client-side CSV generation
- Includes all rows (not just first 100)
- Timestamped filename
- Handles nested properties
- Escapes values with JSON.stringify

### 5. Query Execution

**Backend Logic:**
1. Validate configuration with Zod
2. Switch based on module type
3. Build Prisma query with includes
4. Apply sorting if specified
5. Fetch results (limit 1000 for performance)
6. Filter to only include requested columns
7. Handle nested properties (e.g., `entity.name`)
8. Return results with total count

**Example Query (Tasks):**
```typescript
const tasks = await prisma.taskInstance.findMany({
  include: {
    source: true,
    clause: true,
    entity: true,
    department: true,
    pic_user: true,
    reviewer_user: true,
  },
  orderBy: config.sortBy
    ? { [config.sortBy]: config.sortOrder }
    : { created_at: 'desc' },
  take: 1000,
})
```

### 6. UI/UX Features

**Visual Design:**
- Clean card-based layout
- Step indicator with progress
- Module cards with large icons
- Toggle chips for column selection
- Preview table with scrolling
- Loading states during query execution
- Error banners with retry

**Interactions:**
- Click module card → Auto-advance to step 2
- Toggle columns → Add/remove from selection
- Run report → Fetch and display results
- Export CSV → Download file
- Step navigation → Jump between steps

**Responsive:**
- Module cards: 1 col mobile, 3 cols desktop
- Table: Horizontal scrolling on mobile
- Step indicator: Scales for mobile

**Colors:**
- Selected/Active: Red (accent-red)
- Background: Card, Tertiary
- Text: Primary, Secondary, Tertiary
- Buttons: Red (primary), Gray (secondary)

### 7. Validation & Error Handling

**Frontend Validation:**
- Must select at least one column
- Disable "Next" if validation fails
- Clear error messages

**Backend Validation:**
- Zod schema for configuration
- Module enum validation
- Column array validation
- Sort order enum validation

**Error States:**
- Loading spinner during execution
- Error banner with message
- Graceful handling of missing data
- Network error handling

### 8. Performance Considerations

**Optimizations:**
- Limit queries to 1000 rows (prevent large payloads)
- Show only 100 rows in preview (fast rendering)
- CSV export uses all results (complete data)
- Column filtering reduces data transfer
- No real-time updates (on-demand execution)

**Scalability:**
- Consider pagination for large datasets
- Consider caching for frequently-run reports
- Consider background processing for heavy queries

### 9. Future Enhancements (Not Implemented)

**Filters (Step 2):**
- Date range pickers
- Entity/Department selectors
- Status dropdowns
- Priority filters
- Custom SQL-like filters

**Grouping:**
- Group by entity, department, status
- Aggregate functions (COUNT, SUM, AVG)
- Subtotals and totals

**Visualizations:**
- Bar charts (format: 'bar_chart')
- Summary cards (format: 'summary')
- Pie charts
- Line charts for trends

**Saved Reports:**
- Save configuration for reuse
- Share reports with team
- Schedule automated reports
- Email delivery

**Advanced Features:**
- Custom formulas/calculated columns
- Drill-down capabilities
- Export to PDF
- Print formatting

### 10. Integration Points

**Existing features used:**
- **AuthContext**: JWT token for API authentication
- **Theme System**: All colors use CSS custom properties
- **Prisma**: Database queries with relations

**Data sources:**
- `prisma.source` - Sources module
- `prisma.taskInstance` - Tasks module
- `prisma.entity` - Entities module
- `prisma.auditLog` - Audit module

## Testing Scenarios

1. **Run Sources Report:**
   - Select Sources module
   - Choose columns: title, type, status
   - Sort by: created_at DESC
   - Click "Run Report"
   - **Expected:** Table shows source data

2. **Run Tasks Report:**
   - Select Tasks module
   - Choose columns: task_code, status, entity.name, pic_user.name
   - Sort by: due_date ASC
   - Click "Run Report"
   - **Expected:** Table shows task data with nested properties

3. **Export CSV:**
   - After running report
   - Click "Export CSV"
   - **Expected:** CSV file downloads with all columns/rows

4. **Step Navigation:**
   - Complete step 1
   - Click back to step 1
   - Change module
   - **Expected:** Columns reset, can reconfigure

5. **Validation:**
   - Go to step 3
   - Don't select any columns
   - Click "Next"
   - **Expected:** Button disabled

## Database Impact

No schema changes required. Reads from existing tables:
- `Source` (with clauses, entities)
- `TaskInstance` (with all relations)
- `Entity` (with group)
- `AuditLog` (with user)

Note: Saved reports would require a new `SavedReport` table (not implemented in this step).

## Next Steps (Future Implementation)

- Add SavedReport model to Prisma schema
- Implement save/load/delete functionality
- Add FilterPanel integration for Step 2
- Add chart visualizations (bar, pie, line)
- Add grouping and aggregation
- Add pagination for large datasets
- Add scheduled reports
- Add PDF export
- Add report sharing

---

**Build Status:** ✅ Complete
**Files Created:** 2 (1 API route, 1 page)
**Build Result:** Success (expected dynamic route warnings)
**CSV Export:** Client-side with full data
**Performance:** Limited to 1000 rows with 100-row preview
