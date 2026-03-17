# Backend & API Security Audit Report

**Audit Date:** 2026-03-16  
**Project:** Nailify (SSNails)  
**Auditor:** Code Skeptic Mode

---

## EXECUTIVE SUMMARY

| Category | Rating |
|----------|--------|
| Critical Vulnerabilities | **4** |
| High-Risk Issues | **5** |
| Medium-Risk Issues | **4** |
| Low-Risk Issues | **3** |

**Overall Assessment:** The codebase has moderate security posture but contains **several critical issues** that must be addressed before production. Authentication is reasonably solid, but authorization, payment verification, and rate limiting need improvement.

---

## CRITICAL RISKS (Must Fix Before Production)

### 1. Stripe Payment Verification - CRITICAL
**File:** [`src/app/api/stripe/confirm/route.ts`](src/app/api/stripe/confirm/route.ts:1)

**Issue:** The payment confirmation endpoint has **NO authentication** and **NO server-side Stripe webhook verification**. Any client can call this endpoint to mark any booking/order as paid.

```typescript
// Line 6-18 - No auth check, no webhook signature verification
export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<{
    sessionId: string;
    type: 'booking' | 'order';
  }>;
  // Directly marks booking as paid based on client-provided sessionId
  const bookingId = await markBookingPaidBySession(payload.sessionId);
```

**Attack Vector:** Attacker can book a service, not pay, then call `/api/stripe/confirm` with their session ID to mark it as paid. Or worse - they can enumerate session IDs and mark other bookings as paid.

**Fix Required:**
- Add admin authentication to this endpoint
- Implement Stripe webhook signature verification
- Or verify session ownership before marking paid

---

### 2. Admin Account Creation - CRITICAL
**File:** [`src/app/api/admin/login/route.ts`](src/app/api/admin/login/route.ts:30)

**Issue:** The `createIfEmpty` flag in the login endpoint allows **unauthenticated admin account creation** when no admin exists.

```typescript
// Lines 30-36 - Creates admin without any auth when count === 0
if (count === 0 && payload.createIfEmpty) {
  await createAdminUser({
    email,
    password,
    name: payload.name?.trim() || 'Sandra',
  });
}
```

**Attack Vector:** First visitor to the site can create a superuser account by simply sending `createIfEmpty: true` in the login request. This is a classic "first-user-takeover" vulnerability.

**Fix Required:**
- Remove `createIfEmpty` from production
- Add a site-wide secret/flag to enable admin creation
- Or create admin via CLI only

---

### 3. Missing Rate Limiting on Public Endpoints - CRITICAL
**Issue:** **NO rate limiting exists anywhere** in the codebase. No middleware, no external library, nothing.

**Vulnerable Endpoints:**
- [`/api/assistant-chat`](src/app/api/assistant-chat/route.ts:1) - Unlimited AI calls (cost abuse)
- [`/api/bookings`](src/app/api/bookings/route.ts:1) - Unlimited booking creation
- [`/api/bookings/checkout`](src/app/api/bookings/checkout/route.ts:1) - Unlimited payment flow creation
- [`/api/cart/checkout`](src/app/api/cart/checkout/route.ts:1) - Unlimited checkout

**Attack Vector:** 
- AI chat spam: Attacker hammers the AI endpoint, draining the OpenRouter API quota
- Booking spam: Automated bot creates thousands of fake bookings
- DoS: API exhaustion from repeated requests

**Fix Required:**
- Implement rate limiting middleware (e.g., Upstash Redis, or Vercel KV)
- Limit: 10 requests/minute for AI, 5 requests/minute for bookings

---

### 4. Debug Mode Exposes Internal Info in Production - CRITICAL
**File:** [`src/app/api/assistant-chat/route.ts`](src/app/api/assistant-chat/route.ts:339)

**Issue:** The debug flag exposes internal AI information in production:

```typescript
const showDebug = process.env.NODE_ENV !== 'production';  // WRONG approach
// Exposes: providerChain, finalProvider, finalModel, intentHandled, stage
return NextResponse.json(showDebug ? { ok: true, ...fallback, debug } : ...);
```

**Problem:** 
1. This relies on NODE_ENV which may not be correctly set on all deployments
2. Leaks AI model names, API chain, fallback behavior to attackers

**Fix Required:**
- Remove debug output entirely OR use explicit env var
- Don't expose internal AI architecture to clients

---

## HIGH-RISK ISSUES

### 5. Admin Status Endpoint Exposes Setup State
**File:** [`src/app/api/admin/status/route.ts`](src/app/api/admin/status/route.ts:1)

**Issue:** Publicly reveals whether admin account exists:

```typescript
// Returns { hasAdmin: true/false } to anyone
const count = await adminCount();
return NextResponse.json({ ok: true, hasAdmin: count > 0 });
```

**Attack Vector:** Attacker knows exactly when to attempt `createIfEmpty` takeover.

**Recommendation:** Remove this endpoint or require auth.

---

### 6. Weak Admin Session Validation in Middleware
**File:** [`src/middleware.ts`](src/middleware.ts:33)

**Issue:** Middleware only checks for cookie existence, not validity:

```typescript
// Line 38-42 - Only checks token exists, not if valid
const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
if (!token) {
  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}
return NextResponse.next();  // Redirects to login if no cookie
```

**Problem:** If someone sets a fake cookie, they get redirected to login (OK), but the redirect itself doesn't indicate whether user exists - could be enumerate-able. Actually, this is reasonable - it's checking cookie presence, not user validity.

**Actually:** This is borderline OK - it redirects if no cookie. But it doesn't validate token against DB, which is fine because that's done in the API routes.

---

### 7. AI Chat Message History Not Rate Limited
**File:** [`src/app/api/assistant-chat/route.ts`](src/app/api/assistant-chat/route.ts:356)

**Issue:** Messages array has no size limit:

```typescript
const messages = rawMessages
  .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
  .map((m) => ({ role: m.role, text: normalizeText(String(m.text ?? '')) }))
  .filter((m) => m.text.length > 0)
  .slice(-8);  // Only keeps last 8, but what if attacker sends huge payload?
```

**Problem:** Even with `.slice(-8)`, the incoming array could be massive, causing:
- Memory exhaustion
- Processing delay
- Cost inflation from parsing

**Fix:** Add request body size limit validation at the edge.

---

### 8. Slot Date/Time Validation in PATCH is Client-Side Only
**File:** [`src/app/api/bookings/route.ts`](src/app/api/bookings/route.ts:110)

**Issue:** While there IS validation for date/time format, there's no validation that:
- The slot exists
- The slot is available
- The slot belongs to the date/time being updated

**Attack Vector:** Admin can assign bookings to non-existent slots, creating data inconsistency.

---

### 9. No CSRF Protection
**Issue:** No CSRF tokens implemented anywhere. However, Next.js API routes are stateless by default, and SameSite cookies provide some protection. This is acceptable for this API design, but worth noting.

---

## MEDIUM-RISK ISSUES

### 10. Potential SQL Injection via Search Parameters
**File:** [`src/app/api/bookings/route.ts`](src/app/api/bookings/route.ts:52)

**Issue:** The `limit` parameter is parsed from URL and passed to SQL:

```typescript
const limitParam = url.searchParams.get('limit');
const limit = limitParam ? Number(limitParam) : 100;  // Not validated before use
```

**Analysis:** While there IS sanitization in [`listBookings()`](src/lib/bookings.ts:160) (`Math.max(1, Math.min(500, Math.floor(limit)))`), passing arbitrary numbers and having them silently clamped is poor practice. Could hide logic bugs.

---

### 11. No Input Length Limits on Text Fields
**Issue:** Contact notes, descriptions, and other text fields have no max length validation in the API.

**Vulnerable Fields:**
- `contactNotes` - no length limit
- `inspirationNote` - no length limit  
- Service/product descriptions - no length limit

**Attack Vector:** Large payload DoS, database storage bloat.

---

### 12. Cart Checkout Missing Price Verification
**File:** [`src/app/api/cart/checkout/route.ts`](src/app/api/cart/checkout/route.ts:40)

**Issue:** Price is taken from database, but quantity could be manipulated:

```typescript
const quantities = new Map<string, number>();
for (const item of payload.items) {
  quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + Math.max(1, item.quantity));
}
```

**Problem:** Max quantity is unbounded. Could order 10,000 of an item if stock is high enough.

**Fix:** Add max quantity per item (e.g., 10).

---

### 13. Gallery/Image URLs Not Validated
**File:** [`src/app/api/gallery/route.ts`](src/app/api/gallery/route.ts:56)

**Issue:** Image URLs are accepted without validation:

```typescript
const id = await createGalleryImage({
  imageUrl: payload.imageUrl,  // No URL validation
  caption: payload.caption ?? '',
  isFeatured: payload.isFeatured ?? false,
});
```

**Attack Vector:** Store malicious URLs, XSS via URL payloads (if rendered in certain ways), SSRF if the app fetches these URLs.

---

## LOW-RISK ISSUES / RECOMMENDATIONS

### 14. No HTTPS Enforcement in Development
**File:** [`src/lib/admin-auth.ts`](src/lib/admin-auth.ts:49)

**Issue:** Cookie `secure` flag only set in production:

```typescript
response.cookies.set(ADMIN_SESSION_COOKIE, session.token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // OK but worth noting
  ...
});
```

**Recommendation:** This is correct - needed for localhost. No change needed.

---

### 15. Session Token Entropy
**File:** [`src/lib/admin-auth.ts`](src/lib/admin-auth.ts:111)

**Issue:** Token uses 32 bytes (256-bit) from `randomBytes(32)`. This is **excellent** - no change needed.

---

### 16. Password Hashing Uses Scrypt
**File:** [`src/lib/admin-auth.ts`](src/lib/admin-auth.ts:24)

**Issue:** Using scrypt with 64-byte output, 16-byte salt. This is **good** - no change needed.

---

## WHAT IS ALREADY SAFE

### ✅ Authentication System
- Session tokens are cryptographically secure (32 bytes)
- Passwords properly hashed with scrypt + salt
- HttpOnly, secure cookies in production
- Session expiry (14 days)

### ✅ Authorization on Admin Endpoints
- All POST/PATCH/DELETE operations on admin resources require auth
- Gallery, services, products, slots, bookings all check `getAdminFromCookies()`

### ✅ Database Parameterization
- Using `sql` tagged template literals throughout
- No string concatenation in SQL queries
- Proper use of parameterized queries

### ✅ Public vs Admin Route Separation
- Clear distinction between public GET and admin-only POST/PATCH/DELETE
- Cache headers appropriately set

### ✅ Input Validation (Partial)
- Validates required fields exist
- Validates enum values (status, paymentStatus, category)
- Validates date/time format regex

### ✅ Error Handling
- Errors caught and returned as generic messages
- No stack traces leaked to clients

---

## QUICK WINS (Low Effort, High Impact)

| Priority | Fix | Effort |
|----------|-----|--------|
| 1 | Remove `createIfEmpty` from login API | 5 min |
| 2 | Add rate limiting to AI chat endpoint | 30 min |
| 3 | Add auth to `/api/stripe/confirm` | 10 min |
| 4 | Remove debug output from AI chat | 5 min |
| 5 | Add input length limits | 20 min |
| 6 | Add max quantity to cart | 10 min |

---

## SILENT RISKS (Easy to Miss)

1. **OpenRouter API Key Exposure Risk**: If the key leaks, attackers can drain the quota. Currently the key is server-side only, but if Next.js ever renders client-side with that env var, it's exposed.

2. **Database Connection String**: If `DATABASE_URL` is logged anywhere or accidentally thrown in error messages, credentials exposed. Currently seems OK.

3. **Auto-table Creation**: The `ensure*Tables()` functions run on every request if tables don't exist. While not a security issue per se, it's unusual behavior that could be exploited for DoS (triggering many schema operations).

---

## PRODUCTION REQUIREMENTS CHECKLIST

- [ ] **CRITICAL**: Fix payment verification (add auth + webhook)
- [ ] **CRITICAL**: Disable admin auto-creation
- [ ] **CRITICAL**: Add rate limiting
- [ ] **CRITICAL**: Remove/fix debug output in AI chat
- [ ] HIGH: Remove or protect admin status endpoint
- [ ] HIGH: Add input length validation
- [ ] HIGH: Add cart quantity limits
- [ ] MEDIUM: Validate image URLs
- [ ] MEDIUM: Add request body size limits

---

## CONCLUSION

The codebase has a **reasonably solid foundation** for authentication and database access patterns. However, the **lack of rate limiting** and **missing payment verification** are critical production blockers. The admin auto-creation vulnerability is particularly severe as it allows complete site takeover on first visit.

**Recommended Action**: Address all 4 critical issues before any production deployment.
