# Okta Migration Notes

## Current State: Simplified Authentication (Pre-Okta)

The authentication system has been **temporarily simplified** to prepare for Okta integration. JWT token validation has been disabled to allow easier testing and migration.

---

## Changes Made

### 1. **Login Page** (`src/app/(auth)/login/page.tsx`)
- Login now stores user data and token in `localStorage`
- Uses `window.location.href` for redirect instead of Next.js router
- Keys: `cmp_user` and `cmp_token`

### 2. **Auth Context** (`src/lib/auth-context.tsx`)
- Reads user session from `localStorage` on mount
- No longer validates JWT tokens via API calls
- Logout clears `localStorage` data

### 3. **Middleware** (`src/middleware.ts`)
- **API routes**: Only checks if Authorization header exists (no JWT verification)
- **Protected pages**: Only checks if `refresh_token` cookie exists (no validation)
- All JWT validation logic commented with `// TODO: Replace with Okta validation`

---

## Current Flow

### Login:
1. User submits email + password
2. API validates credentials → returns token
3. Token + user data stored in `localStorage`
4. Browser redirects to dashboard

### Protected Routes:
1. Middleware checks for Authorization header (API) or refresh_token cookie (pages)
2. **No token validation** — just checks existence
3. Auth context reads from `localStorage` if available

---

## Test Users (Quick Login Cards)

The login page includes 5 test cards for easy testing:

| Role            | Email                  | Password      | Color |
|-----------------|------------------------|---------------|-------|
| Super Admin     | laks.r@deriv.com       | password123   | Red   |
| CMP Manager     | sarah.m@deriv.com      | password123   | Blue  |
| Dept Manager    | michael.c@deriv.com    | password123   | Green |
| Reviewer        | david.p@deriv.com      | password123   | Purple|
| PIC             | emma.w@deriv.com       | password123   | Orange|

---

## Next Steps: Okta Integration

When ready to integrate Okta, you'll need to:

### 1. Install Okta SDK
```bash
npm install @okta/okta-auth-js @okta/okta-react
```

### 2. Replace Auth Logic

#### **Middleware** (`src/middleware.ts`)
- Replace token existence check with Okta JWT validation
- Use `@okta/jwt-verifier` for server-side validation

#### **Auth Context** (`src/lib/auth-context.tsx`)
- Replace `localStorage` with Okta's `OktaAuth` client
- Use Okta's `authStateManager` for session management

#### **Login Page** (`src/app/(auth)/login/page.tsx`)
- Remove custom login form
- Use Okta's hosted login page or widget
- Redirect to Okta for authentication

### 3. Update Environment Variables
Add to `.env`:
```bash
OKTA_DOMAIN=your-org.okta.com
OKTA_CLIENT_ID=your_client_id
OKTA_ISSUER=https://your-org.okta.com/oauth2/default
OKTA_REDIRECT_URI=http://localhost:3000/callback
```

### 4. Create Okta Callback Route
```typescript
// src/app/callback/page.tsx
// Handle Okta redirect after authentication
```

---

## Important Notes

- **Current state is NOT production-ready** — token validation is disabled
- All TODOs marked with `// TODO: Replace with Okta validation`
- User roles/permissions from database will need to be synced with Okta groups
- Consider using Okta's [custom claims](https://developer.okta.com/docs/guides/customize-tokens-returned-from-okta/main/) to include role info in JWT

---

## Files Modified for Okta Prep

1. `src/app/(auth)/login/page.tsx` — localStorage-based login
2. `src/lib/auth-context.tsx` — Simplified session management
3. `src/middleware.ts` — Disabled JWT validation

---

## Testing Current State

1. Navigate to http://localhost:3000/login
2. Click any test user card (or manually enter credentials)
3. You should be redirected to dashboard without token validation errors
4. Logout clears `localStorage` and redirects to login

---

**Last Updated:** March 20, 2026
**Status:** ✅ Ready for Okta integration
