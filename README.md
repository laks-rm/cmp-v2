# CMP 2.0 - Compliance Monitoring Platform

A comprehensive Next.js-based compliance monitoring system with real-time task tracking, automated workflows, and intelligent reporting.

## 🚀 Features

### Core Modules
- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Dashboard** - Real-time statistics with CSS-only visualizations
- **Source Management** - 4-step wizard for compliance source creation
- **Task Tracking** - Comprehensive task lifecycle management
- **Review Queue** - Card-based review system with SLA tracking
- **Entity & Group Monitoring** - Real-time compliance scoring
- **Admin Console** - User management with role assignment
- **Reports Builder** - Configurable reports with CSV export
- **Notifications** - In-app notification center with polling
- **Audit Logs** - Complete system traceability

### Technical Highlights
- **Next.js 14** with App Router and Server Components
- **TypeScript** (strict mode) for type safety
- **PostgreSQL + Prisma ORM** for data management
- **Tailwind CSS** with dynamic theming (dark/light mode)
- **JWT authentication** with access and refresh tokens
- **Zod validation** for all API inputs
- **Automated cron jobs** for task generation, reminders, and escalations
- **Concurrent protection** for self-assignment flows
- **Audit logging** for all critical actions

## 🧪 Test Users (Quick Login)

The login page includes test user cards for easy access:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Super Admin** | admin@deriv.com | password123 | Full system access |
| **CMP Manager** | cmp.manager@deriv.com | password123 | Compliance operations |
| **Dept Manager** | dept.manager@deriv.com | password123 | Department oversight |
| **Reviewer** | reviewer@deriv.com | password123 | Review queue access |
| **PIC** | pic@deriv.com | password123 | Task execution |

Simply click any role card on the login page to auto-fill credentials.

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/laks-rm/cmp-v2.git
   cd cmp-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/cmpv2"
   JWT_SECRET="your-secret-key-change-in-production"
   JWT_REFRESH_SECRET="your-refresh-secret-change-in-production"
   CRON_SECRET="cmp2-cron-secret-change-in-production"
   ```

4. **Setup database**
   ```bash
   # Run migrations
   npx prisma migrate dev
   
   # Seed with test data
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Database Schema

### Core Tables
- `User` - User accounts with roles and permissions
- `Department` - Organizational departments
- `Entity` - Monitored entities (legal entities)
- `Group` - Entity groupings
- `Source` - Compliance sources (regulations, policies)
- `Clause` - Compliance clauses within sources
- `TaskTemplate` - Template for recurring tasks
- `TaskInstance` - Individual task occurrences
- `Notification` - In-app notifications
- `AuditLog` - Complete audit trail

### Key Enums
- **UserRole**: SUPER_ADMIN, ADMIN, CMP_MANAGER, DEPT_MANAGER, REVIEWER, PIC, READ_ONLY, AI_ACTION_USER, AI_READ_ONLY
- **TaskStatus**: NOT_STARTED, IN_PROGRESS, SUBMITTED, PENDING_REVIEW, RETURNED, APPROVED, OVERDUE, CLOSED
- **TaskFrequency**: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUALLY, ONE_TIME

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:seed      # Seed database with test data
npx prisma studio    # Open Prisma Studio (DB GUI)
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and clear cookies

### Tasks
- `GET /api/tasks` - List tasks with filters
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task
- `PATCH /api/tasks/[id]` - Update task status
- `POST /api/tasks/[id]/assign` - Assign/self-assign task
- `POST /api/tasks/[id]/evidence` - Upload evidence
- `POST /api/tasks/[id]/comments` - Add comment

### Sources
- `GET /api/sources` - List sources
- `POST /api/sources` - Create source
- `GET /api/sources/[id]` - Get source details
- `PUT /api/sources/[id]` - Update source
- `POST /api/sources/wizard-save` - Bulk save source with clauses/templates

### Monitoring
- `GET /api/monitoring/entities` - Entity performance data
- `GET /api/monitoring/groups` - Group performance data

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/[id]` - Update user
- `PATCH /api/admin/users/[id]` - Activate/deactivate user

### Reports
- `POST /api/reports` - Run or save report
- `GET /api/reports` - List saved reports

### Dashboard
- `GET /api/dashboard` - Dashboard statistics

### Notifications
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications` - Mark as read

## 🎨 Theme System

The app supports dark/light mode with CSS custom properties:

```css
/* Colors automatically switch based on theme */
--bg-primary
--bg-secondary
--bg-tertiary
--bg-card
--text-primary
--text-secondary
--text-tertiary
--accent-red
--accent-blue
--accent-green
--accent-amber
--accent-purple
--accent-teal
```

Toggle theme using the sun/moon button in the topbar.

## 🔐 Security Features

- **Password hashing** with bcrypt (cost factor 12)
- **JWT tokens** with short expiry (15m access, 7d refresh)
- **HTTP-only cookies** for refresh tokens
- **Rate limiting** on login attempts
- **SQL injection protection** via Prisma
- **Input validation** with Zod schemas
- **Role-based authorization** on all endpoints
- **Audit logging** for all mutations
- **CSRF protection** via SameSite cookies

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```bash
# Build image
docker build -t cmp-v2 .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  cmp-v2
```

## 📊 Build Steps Completed

✅ Step 1: Database Schema  
✅ Step 2: Authentication System  
✅ Step 3: Dashboard Layout  
✅ Step 4: Reusable UI Components  
✅ Step 5: Source Management (List & CRUD)  
✅ Step 6: Clause & Task Template APIs  
✅ Step 7: Source Creation Wizard  
✅ Step 8: Source Detail Page  
✅ Step 9: Task Generation Engine (Cron)  
✅ Step 10: Task Tracker & Detail Pages  
✅ Step 11: Review Queue  
✅ Step 12: Audit Logs Page  
✅ Step 13: Admin Console  
✅ Step 14: Entity & Group Monitoring  
✅ Step 15: Main Dashboard  
✅ Step 16: Notification Center  
✅ Step 17: Department Queue & Self-Assignment  
✅ Step 18: Reports Builder  

## 🤝 Contributing

This is a private project. For access or questions, contact the repository owner.

## 📄 License

Proprietary - All rights reserved.

---

**Built with ❤️ using Next.js, TypeScript, Prisma, and Tailwind CSS**
