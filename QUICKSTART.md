# 🚀 CMP 2.0 - Quick Start Guide

## ✅ Steps Completed

1. **Step 1:** Database Schema ✅
2. **Step 2:** Authentication ✅ 
3. **Step 3:** Dashboard Layout Shell ✅

## 🎨 What's New in Step 3

### Theme System
- **Dark mode** (default) with exact colors from cursorrules
- **Light mode** with proper contrast
- **Animated toggle** in topbar (🌙 ↔ ☀️)
- **Persistent** via localStorage
- **No flash** on page load

### Layout Components
- **Sidebar** (232px desktop, 52px mobile)
  - 13 navigation items across 5 sections
  - Active state with red accent
  - Badge support (Task Tracker: 12, Review Queue: 5)
  - User profile at bottom
  
- **Topbar** (52px height)
  - Global search with ⌘K hint
  - Theme toggle button
  - AI assistant button (🤖)
  - Notification bell (🔔) with red dot

### Files Created (Step 3)
```
✅ src/styles/globals.css           - CSS custom properties + themes
✅ src/hooks/useTheme.ts             - Theme context hook
✅ src/components/layout/ThemeProvider.tsx
✅ src/components/layout/Sidebar.tsx
✅ src/components/layout/Topbar.tsx
✅ src/app/layout.tsx                - Root layout
✅ src/app/(dashboard)/layout.tsx   - Dashboard layout
✅ src/app/(dashboard)/page.tsx     - Dashboard page
✅ tailwind.config.ts
✅ postcss.config.js
✅ tsconfig.json
✅ next.config.js
```

## 🏃 Run the Application

```bash
# If you haven't installed dependencies yet
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## 🧪 Test the Layout

### 1. Theme Toggle
- Click the theme button in the topbar (🌙/☀️)
- Watch colors smoothly transition
- Reload the page — theme should persist

### 2. Navigation
- Click any nav item in the sidebar
- Active indicator (red left border) should move
- Notice the red tinted background on active item
- Dashboard is active by default

### 3. Responsive Design
- Resize browser below 768px width
- Sidebar collapses to icon-only mode (52px)
- Section titles and labels hide
- Only emoji icons remain visible

### 4. Visual Elements
- Custom scrollbar in dark/light modes
- Smooth transitions (0.2s ease)
- Proper font rendering (DM Sans + JetBrains Mono)
- User avatar with gradient (LR initials)
- Badge counts on Task Tracker (12) and Review Queue (5)

## 📋 Navigation Structure

**Overview**
- 📊 Dashboard

**Compliance Ops**
- 📋 Sources
- 📝 Task Plans
- ✅ Task Tracker (12)
- 👁️ Review Queue (5)

**Monitoring**
- 🏢 Entities
- 🌍 Groups

**Intelligence**
- 📈 Reports

**System**
- 📜 Audit Logs
- ⚙️ Admin Console
- 💬 Slack Config

## 🎨 Color System

### Dark Theme (Default)
| Variable | Color | Usage |
|----------|-------|-------|
| --bg-primary | #0a0e17 | Main background |
| --bg-secondary | #111827 | Sidebar, cards |
| --bg-tertiary | #1a2235 | Hover states |
| --text-primary | #e8ecf4 | Main text |
| --text-secondary | #8b97b0 | Secondary text |
| --accent-red | #FF444F | Primary CTA, active states |
| --accent-teal | #85ACB0 | Codes, links |
| --border-primary | #1e2d45 | Borders |

### Light Theme
Automatically inverts with proper contrast while maintaining accent colors.

## 🔧 Key Technologies

- **Next.js 14** - App Router with Server Components
- **TypeScript** - Strict mode enabled
- **Tailwind CSS** - Utility-first styling
- **CSS Variables** - Theme system
- **React Context** - Theme state management
- **LocalStorage** - Theme persistence

## 📝 Component Patterns

### Using Theme
```tsx
import { useTheme } from '@/hooks/useTheme'

function MyComponent() {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <div style={{ color: 'var(--text-primary)' }}>
      Current theme: {theme}
    </div>
  )
}
```

### Using CSS Variables
```tsx
<div 
  className="p-4 rounded-lg"
  style={{
    backgroundColor: 'var(--bg-card)',
    borderColor: 'var(--border-primary)',
    color: 'var(--text-primary)'
  }}
>
  Content with theme support
</div>
```

### Navigation
```tsx
import { usePathname, useRouter } from 'next/navigation'

const pathname = usePathname()
const router = useRouter()

const isActive = pathname === '/sources'
router.push('/sources')
```

## 🐛 Troubleshooting

### Theme Flash on Load
- Already handled with `suppressHydrationWarning`
- Theme loads from localStorage before first render

### Sidebar Not Responsive
- Check Tailwind classes: `md:w-[232px] sm:w-[52px]`
- Verify breakpoint: 768px for desktop

### CSS Variables Not Working
- Ensure `data-theme` attribute is on `<html>` element
- Check browser DevTools → Elements → html[data-theme="dark"]

### Navigation Not Working
- Routes don't exist yet (will be built in next steps)
- Navigation logic works, pages will show 404 until created

## 📚 Documentation

- `STEP3_VERIFICATION.md` - Detailed verification checklist
- `DATABASE_SETUP.md` - Database setup (Step 1)
- `BUILD_VERIFICATION.md` - Database verification (Step 1)

## 🎯 Next Steps

Choose one of the following paths:

**Option A: Build Admin Features First**
- Step 4: Admin Console (user CRUD, roles)
- Step 5: Entity & Department management

**Option B: Build Core Compliance Features First**
- Step 6: Source CRUD API + Source List page
- Step 7: Clause CRUD + inline table
- Step 8: Task Template CRUD
- Step 9: Source Creation Wizard

**Recommended:** Follow the build order from cursorrules (Admin first)

## 📞 Support

If you encounter issues:
1. Check `STEP3_VERIFICATION.md` for detailed requirements
2. Verify all files were created correctly
3. Run `npm install` to ensure dependencies are installed
4. Check browser console for errors
5. Ensure Node.js version ≥18.0.0

---

**Status:** ✅ Dashboard layout shell is production-ready

**Quality:** All requirements from cursorrules implemented with exact color values and responsive design

**Ready for:** Step 4 - Admin Console
