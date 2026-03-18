# Backend Security Audit - Nailify

## 🔴 CRITICAL Vulnerabilities

### 1. Stripe Payment Confirmation - No Authentication
**File:** `src/app/api/stripe/confirm/route.ts`
**Severity:** CRITICAL

```typescript
// CURRENT - NO AUTH CHECK
export async function POST(request: Request) {
  // Anyone can call this!
  const session = await stripe.checkout.sessions.retrieve(payload.sessionId);
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Marks payment as complete WITHOUT verifying ownership
  await markBookingPaidBySession(payload.sessionId);
}
```

**Impact:** Attacker can mark any Stripe session as paid, obtaining free bookings/orders.
**Fix Required:** Verify the session belongs to the caller - validate customer email or session metadata.

---

### 2. No Rate Limiting on AI Chat Endpoint
**File:** `src/app/api/assistant-chat/route.ts`
**Severity:** HIGH

The `/api/assistant-chat` endpoint has:
- No authentication
- No rate limiting
- No request size limits

**Impact:** 
- AI API key abuse (unlimited requests)
- Potential prompt injection
- Cost explosion

---

## 🟠 HIGH Risk Issues

### 3. Admin Status Information Disclosure
**File:** `src/app/api/admin/status/route.ts`
**Severity:** MEDIUM-HIGH

```typescript
// Returns whether admin exists - information disclosure
export async function GET() {
  const count = await adminCount();
  return NextResponse.json({ hasAdmin: count > 0 });
}
```

**Impact:** Reveals if admin account exists, helps attackers target login.

### 4. No Input Validation on Many Endpoints
**Files:** Multiple API routes

Most POST/PATCH endpoints use weak validation:
```typescript
// Example from services route
const payload = (await request.json()) as Partial<{...}>;
const id = payload.id?.trim() || slugify(nameEt);  // ID can be manipulated
```

**Impact:** Potential IDOR attacks, data corruption.

### 5. Session Token Not Validated Properly
**File:** `src/middleware.ts`
**Severity:** MEDIUM

```typescript
// Current - just checks cookie exists
const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
if (!token) {
  return NextResponse.redirect(loginUrl);
}
// No validation of token format or expiry at middleware level
```

---

## 🟡 MEDIUM Risk Issues

### 6. Debug Mode Exposes AI Keys in Non-Production
**File:** `src/app/api/assistant-chat/route.ts`

```typescript
const showDebug = process.env.NODE_ENV !== 'production';
// Could expose internal logic, AI responses in debug
```

### 7. Weak Password Requirements
**File:** `src/app/api/admin/account/route.ts`
**Severity:** MEDIUM

Password only requires 8 characters minimum - no complexity requirements.

---

## ✅ WHAT IS SAFE

| Area | Status | Notes |
|------|--------|-------|
| **Admin Auth** | ✅ Good | Uses scrypt with timing-safe comparison, sessions expire |
| **Password Hashing** | ✅ Good | Uses scrypt with random salt |
| **Session Cookies** | ✅ Good | httpOnly, secure in prod, sameSite=lax |
| **SQL Parameterization** | ✅ Good | All queries use tagged template literals |
| **Middleware Protection** | ✅ Good | /admin routes protected by cookie check |
| **Admin API Routes** | ✅ Good | All require getAdminFromCookies() validation |
| **Public Read Routes** | ✅ Good | GET on services/products/gallery is public with caching |
| **File Uploads** | ✅ Good | No direct file uploads - URLs only |

---

## ❌ WHAT IS RISKY

| Issue | Severity | Exploitability |
|-------|----------|-----------------|
| Stripe webhook confirmation | 🔴 CRITICAL | Anyone can call |
| No rate limiting | 🟠 HIGH | Easy to abuse |
| Admin status disclosure | 🟠 HIGH | Information leak |
| Weak input validation | 🟡 MEDIUM | Requires authenticated attack |
| Session validation in middleware | 🟡 MEDIUM | Cookie only, no token validation |

---

## 🚨 MUST FIX BEFORE PRODUCTION

### Priority 1 (Critical):
1. **Add authentication to `/api/stripe/confirm`** - This is actively exploitable!
2. **Add rate limiting to `/api/assistant-chat`**

### Priority 2 (High):
3. Remove or protect `/api/admin/status`
4. Add input validation/sanitization on all POST endpoints
5. Add CSRF protection

### Priority 3 (Medium):
6. Strengthen password requirements
7. Add request size limits
8. Add audit logging

---

## ⚡ QUICK WINS vs ⚠️ CRITICAL

| Fix | Effort | Risk Reduction |
|-----|--------|-----------------|
| Add auth to stripe/confirm | 2 hours | Prevents free bookings/orders |
| Add rate limit to chat | 1 hour | Prevents AI bill explosion |
| Remove admin status endpoint | 5 minutes | Reduces info disclosure |
| Validate all inputs | 8 hours | Prevents injection/IDOR |

---

## Summary

**Current Posture:** Not production-ready from security perspective

**Critical Gap:** Payment verification endpoint has no authentication - actively exploitable.

**Recommended Action:** 
1. IMMEDIATELY fix the Stripe confirmation endpoint
2. Add rate limiting to AI chat
3. Then proceed with full hardening
