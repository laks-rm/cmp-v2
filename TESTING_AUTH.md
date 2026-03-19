# 🧪 Authentication Testing Guide

## Quick Start

```bash
# 1. Ensure database is running with seed data
npm run db:seed  # (if not already done)

# 2. Start development server
npm run dev

# 3. Navigate to http://localhost:3000
# Should auto-redirect to /login
```

---

## Test Credentials

All seeded users have password: **`password123`**

| Email | Role | Expected Access |
|-------|------|-----------------|
| laks.r@deriv.com | SUPER_ADMIN | Full access to all features |
| sarah.m@deriv.com | CMP_MANAGER | Source management, task planning |
| john.d@deriv.com | REVIEWER | Review queue access |
| ali.k@deriv.com | PIC | Task execution |
| maria.t@deriv.com | REVIEWER | Review queue access |

---

## Test Scenarios

### ✅ Scenario 1: Successful Login
**Steps:**
1. Navigate to http://localhost:3000
2. Enter email: `laks.r@deriv.com`
3. Enter password: `password123`
4. Click "Sign In"

**Expected:**
- Button shows "Signing in..."
- Redirects to dashboard (/)
- Sidebar shows "Laks R." with "SUPER ADMIN" role
- Logout button (🚪) visible in sidebar

**Verify:**
- Check DevTools → Application → Cookies
- Should see `refresh_token` (httpOnly, 7 days expiry)
- Navigate to different dashboard pages (no redirect)

---

### ❌ Scenario 2: Invalid Password
**Steps:**
1. Email: `laks.r@deriv.com`
2. Password: `wrongpassword`
3. Click "Sign In"

**Expected:**
- Red error box appears above button
- Message: "Invalid email or password"
- Does NOT reveal if email exists
- User stays on login page

**Verify:**
- Check database AuditLog table
- Should see entry: `action_type: "login_failed"`
- Metadata: `{ reason: "invalid_credentials" }`

---

### ❌ Scenario 3: Invalid Email
**Steps:**
1. Email: `nonexistent@deriv.com`
2. Password: `password123`
3. Click "Sign In"

**Expected:**
- Same error: "Invalid email or password"
- Does NOT reveal email doesn't exist (security)

---

### ⚠️ Scenario 4: Rate Limiting
**Steps:**
1. Try to login with wrong password 5 times in a row
2. On the 6th attempt

**Expected:**
- Red error box: "Too many login attempts. Please try again in 15 minutes."
- HTTP 429 status
- Cannot login even with correct password until 15 min pass

**Verify:**
- Check AuditLog: `action_type: "login_failed"`, `reason: "rate_limit"`
- Wait 15 minutes OR restart server (resets in-memory store)
- Login should work again

---

### 🔒 Scenario 5: Account Deactivated
**Setup:**
```sql
-- Run in database
UPDATE users SET is_active = false WHERE email = 'ali.k@deriv.com';
```

**Steps:**
1. Email: `ali.k@deriv.com`
2. Password: `password123`
3. Click "Sign In"

**Expected:**
- Red error: "Your account has been deactivated. Contact your administrator."
- HTTP 403 status

**Cleanup:**
```sql
UPDATE users SET is_active = true WHERE email = 'ali.k@deriv.com';
```

---

### 📧 Scenario 6: Client Validation
**Email Validation:**
1. Enter email: `invalid-email`
2. Tab out (blur)
3. Expected: Red text below field: "Please enter a valid email address"
4. Border turns red

**Password Validation:**
1. Enter password: `short`
2. Tab out (blur)
3. Expected: Red text: "Password must be at least 8 characters"
4. Border turns red

**Form Submission:**
- With errors present, form cannot submit
- Fix errors, validation passes
- Submit button becomes active

---

### 🔄 Scenario 7: Token Refresh
**Manual Testing:**
1. Login successfully
2. Open DevTools → Application → Cookies
3. Note the `refresh_token` value
4. Wait 16 minutes (access token expires in 15 min)
5. Navigate to any dashboard page or click a nav item

**Expected:**
- Page loads normally (no redirect to login)
- Access token automatically refreshed
- User stays logged in

**Automatic Testing:**
```javascript
// In browser console after login:
setTimeout(() => {
  fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${oldToken}` }
  }).then(r => console.log('Should be 401:', r.status))
}, 16 * 60 * 1000) // 16 minutes

// Then refresh the page - should auto-refresh token
```

---

### 🚪 Scenario 8: Logout
**Steps:**
1. Login as any user
2. Click logout button (🚪 icon) in sidebar
3. Observe redirect to /login

**Expected:**
- Immediate redirect to /login
- `refresh_token` cookie deleted
- Sidebar user info cleared

**Verify:**
1. Try to access http://localhost:3000/dashboard
2. Should redirect to /login
3. Check DevTools → Cookies → no `refresh_token`
4. Check AuditLog: `action_type: "logout"`

---

### 🔐 Scenario 9: Protected Routes
**Without Login:**
1. Open incognito/private window
2. Navigate to http://localhost:3000/sources

**Expected:**
- Redirects to /login?redirect=/sources
- After login, redirects back to /sources

**With Expired Session:**
1. Login normally
2. Open DevTools → Application → Cookies
3. Delete `refresh_token` cookie
4. Try to navigate to any dashboard page

**Expected:**
- Redirects to /login
- Return URL preserved

---

### 🔌 Scenario 10: API Protection
**Test with curl:**

```bash
# No token - should fail
curl http://localhost:3000/api/auth/me
# Expected: {"success":false,"error":{"code":"AUTHENTICATION_REQUIRED"}}

# Invalid token - should fail
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:3000/api/auth/me
# Expected: {"success":false,"error":{"code":"AUTHENTICATION_REQUIRED"}}

# Valid token - should succeed
# (Get token from successful login response)
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:3000/api/auth/me
# Expected: {"success":true,"data":{...user data...}}
```

---

## 📊 Verify Audit Logs

After testing, check the database:

```sql
SELECT 
  action_type,
  success,
  error_message,
  metadata,
  created_at
FROM audit_logs
WHERE module = 'System'
ORDER BY timestamp DESC
LIMIT 20;
```

**Expected entries:**
- `login_success` (successful logins)
- `login_failed` with reason: `invalid_credentials`
- `login_failed` with reason: `rate_limit`
- `login_failed` with reason: `account_deactivated`
- `logout` (logout events)

---

## 🎨 Visual Testing

### Login Page Design
**Check:**
- ✅ Centered card with deep navy background
- ✅ Red "D" logo (64x64px)
- ✅ "CMP 2.0" title
- ✅ Email and password inputs with proper styling
- ✅ Red "Sign In" button
- ✅ Smooth animation on page load (slideIn)
- ✅ Proper spacing and alignment
- ✅ Responsive on mobile (test with DevTools responsive mode)

### Error Display
**Check:**
- ✅ General error: Red box above button
- ✅ Field errors: Red text below input, red border
- ✅ Error messages are clear and actionable
- ✅ Multiple errors can display simultaneously

### Loading States
**Check:**
- ✅ Button text changes to "Signing in..."
- ✅ Button disabled during submission
- ✅ Inputs disabled during submission
- ✅ No double-submission possible

---

## 🧹 Cleanup After Testing

```bash
# Reset rate limiting (restart server)
npm run dev

# Reset deactivated users
npm run db:seed  # Re-seed to reset all users

# Clear browser cookies
# DevTools → Application → Cookies → Delete All

# Clear audit logs (optional)
# DELETE FROM audit_logs WHERE module = 'System';
```

---

## 🐛 Common Issues & Solutions

**Issue: Infinite redirect loop**
- **Solution:** Clear cookies, ensure /login is in publicRoutes

**Issue: "JWT secrets are not configured"**
- **Solution:** Check .env file, restart server

**Issue: Token refresh not working**
- **Solution:** Check httpOnly cookie exists, verify expiry

**Issue: User not showing in sidebar**
- **Solution:** Check console errors, verify AuthProvider wraps layout

**Issue: Rate limiting not resetting**
- **Solution:** Restart server (in-memory store clears)

**Issue: CORS errors on API calls**
- **Solution:** API calls should be relative URLs (/api/...), not full URLs

---

## ✅ Testing Checklist

**Login:**
- [ ] Successful login with valid credentials
- [ ] Failed login with invalid password
- [ ] Failed login with invalid email
- [ ] Rate limiting after 5 failed attempts
- [ ] Account deactivation prevents login
- [ ] Client-side email validation
- [ ] Client-side password validation

**Session Management:**
- [ ] Access token stored in memory (not localStorage)
- [ ] Refresh token stored as httpOnly cookie
- [ ] Automatic token refresh after 15 minutes
- [ ] Logout clears session and redirects

**Route Protection:**
- [ ] Dashboard routes require authentication
- [ ] Unauthenticated users redirect to login
- [ ] Return URL preserved after redirect
- [ ] API routes require Authorization header

**User Experience:**
- [ ] Loading states during submission
- [ ] Clear error messages
- [ ] Proper form validation
- [ ] Logout button in sidebar works
- [ ] User info displays dynamically

**Security:**
- [ ] No email enumeration
- [ ] Rate limiting works
- [ ] Audit logs created
- [ ] httpOnly cookies used
- [ ] Deactivated users blocked

---

## 🎯 Performance Testing

**Login Performance:**
```javascript
// Measure login time
console.time('login')
await login('laks.r@deriv.com', 'password123')
console.timeEnd('login')
// Should be < 500ms on localhost
```

**Token Verification:**
```javascript
// Should be near-instant
console.time('verify')
await fetch('/api/auth/me', { 
  headers: { Authorization: `Bearer ${token}` } 
})
console.timeEnd('verify')
// Should be < 100ms
```

---

## 📱 Mobile Testing

1. Open DevTools → Toggle device toolbar
2. Select "iPhone 12 Pro" or similar
3. Test all scenarios above
4. Check:
   - Login form fits on screen
   - Buttons are touch-friendly
   - Error messages readable
   - No horizontal scroll

---

**Status:** Ready to test! All scenarios should pass. ✅
