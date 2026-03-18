# Code Skeptic Review - Nailify Architecture

**Review Date:** 2024-01-15  
**Reviewer:** Code Skeptic Mode  
**Scope:** Recent architecture and implementation changes  
**Focus:** Migration risks, hidden runtime coupling, data loss, session edge cases, localization, admin editing, deployment, rollback

---

## 1. Critical Issues (MUST FIX)

### 1.1 Migration Risk: No Transaction Rollback
**File:** [`migrations/migrate.ts`](migrations/migrate.ts:120-132)

The migration runner splits SQL by semicolon and executes statements sequentially without transaction wrapping:

```typescript
for (const statement of statements) {
  if (statement.trim()) {
    await sql.unsafe(statement);
  }
}
```

**Risk:** If migration 010 fails halfway through (e.g., after inserting 20 of 40 rows), the database is left in partial state. The `__migrations` table records the migration as executed, preventing retry.

**Impact:** 
- Partial data in `homepage_sections` table
- Cannot re-run migration (marked as complete)
- Manual DB intervention required

**Recommendation:** Wrap each migration in explicit transaction:
```typescript
await sql.begin(async (tx) => {
  for (const statement of statements) {
    await tx.unsafe(statement);
  }
});
```

---

### 1.2 Data Loss Risk: CASCADE DELETE on Sessions
**File:** [`migrations/011_sessions.sql`](migrations/011_sessions.sql:21)

```sql
session_id TEXT NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE
```

**Risk:** When a session is deleted, ALL associated favorites and cart data are permanently lost without warning.

**Impact:**
- User clears cookies → their saved favorites vanish instantly
- No soft delete / archival
- No "recently deleted" recovery

**Recommendation:**
1. Add `deleted_at` column instead of CASCADE
2. Implement soft-delete cleanup job (run monthly)
3. Archive important data before deletion

---

### 1.3 Session Edge Case: Cookie Format Vulnerability
**File:** [`src/lib/session.ts`](src/lib/session.ts:60-61)

```typescript
const cookieValue = `${sessionId}; path=/; max-age=${SESSION_MAX_AGE}; samesite=lax; secure`;
document.cookie = `${SESSION_COOKIE}=${cookieValue}`;
```

**Issue:** The `secure` flag is set unconditionally, but on HTTP (development), the cookie won't be set at all, causing session to be recreated on every request.

**Risk:** Development mode appears broken; users can't stay logged in over HTTP.

**Recommendation:** Make `secure` conditional:
```typescript
const secure = window.location.protocol === 'https:' ? '; secure' : '';
document.cookie = `${SESSION_COOKIE}=${sessionId}; path=/; max-age=${SESSION_MAX_AGE}; samesite=lax${secure}`;
```

---

### 1.4 Localization Regression: Mixed Sources of Truth
**Files:** 
- [`src/lib/i18n/index.tsx`](src/lib/i18n/index.tsx:61)
- [`src/lib/homepage-content.ts`](src/lib/homepage-content.ts:68-88)
- [`src/app/page.tsx`](src/app/page.tsx) (hardcoded text)

**Risk:** Content exists in THREE places:
1. JSON translation files (`et.json`, `en.json`)
2. Database `homepage_sections` table
3. Hardcoded in components

**Current Behavior:** `getHomepageContent()` prioritizes DB, then falls back to JSON. But many components directly use `t()` from JSON, bypassing DB.

**Impact:**
- Admin edits DB content → some pages show DB, others show JSON
- Inconsistent user experience
- Confusion about which content is editable

**Recommendation:** 
- Audit all `t()` calls for homepage sections
- Move all visible homepage text to DB or all to JSON (not mixed)
- Document which keys are admin-editable

---

## 2. High-Risk Issues (SHOULD FIX)

### 2.1 Runtime Coupling: Schema Validator Bypass
**File:** [`src/lib/session.ts`](src/lib/session.ts:117-132)

```typescript
if (process.env.NODE_ENV === 'production') {
  const migrated = await isDatabaseMigrated();
  if (migrated) {
    return; // Skip table creation entirely
  }
}
```

**Risk:** In production, if migrations fail or are misconfigured, the app silently skips table creation. This creates a hidden dependency on migration state.

**Impact:**
- App works in dev (creates tables on-the-fly)
- App fails in production (expects migrations to have run)
- No error when tables missing in production

**Recommendation:** Remove the conditional skip - always ensure tables exist:
```typescript
export async function ensureSessionTables(): Promise<void> {
  await ensureSessionTablesInternal(); // Always run
}
```

---

### 2.2 Admin Editing: No Validation on Upsert
**File:** [`src/lib/homepage-content.ts`](src/lib/homepage-content.ts:191-218)

```typescript
export async function upsertHomepageSection(entry: { ... }) {
  await sql`...` // No length limits, no XSS sanitization
}
```

**Risk:** Admin can insert:
- Empty strings (content disappears)
- Very long text (layout breaks)
- Potentially malicious scripts (stored XSS if rendered without escaping)

**Impact:**
- Stored XSS if admin account is compromised
- UI breakage from oversized content

**Recommendation:** Add validation layer:
```typescript
function validateHomepageSection(entry) {
  if (entry.valueEt.length > 500) throw new Error('ET content too long');
  if (!entry.valueEt.trim()) throw new Error('Content required');
  // Sanitize HTML/script tags
}
```

---

### 2.3 Session Persistence: Expired Sessions Still Queried
**File:** [`src/lib/session.ts`](src/lib/session.ts:187-204)

```typescript
export async function getSessionData<T>(sessionId: string, dataType: SessionDataType): Promise<T | null> {
  // No check if session is expired
  const result = await sql`SELECT data_value FROM session_data WHERE session_id = ${sessionId} ...`;
}
```

**Risk:** Even after session expires, old data is still retrieved until manually cleaned up.

**Impact:**
- Stale data served to users
- Wasteful DB queries for expired sessions
- Inconsistent state between server and client

**Recommendation:** Add expiry check:
```typescript
const session = await sql`SELECT expires_at FROM user_sessions WHERE session_id = ${sessionId}`;
if (new Date(session[0].expires_at) < new Date()) {
  return null; // Session expired
}
```

---

### 2.4 Deployment Risk: No Database Backup Before Migration
**File:** [`scripts/build-deploy-restart.ps1`](scripts/build-deploy-restart.ps1:10-16)

```powershell
Write-Host "==> Building app..."
cmd /c "if exist .next rmdir /s /q .next"
npm run build

Write-Host "==> Deploying to Vercel (preview)..."
$deployOutput = vercel deploy -y
```

**Risk:** 
1. Migrations run on Vercel's first request
2. No pre-deployment backup
3. If migration fails, database may be in inconsistent state

**Impact:**
- Failed migrations leave partial data
- No way to roll back to previous state
- Production downtime until fixed

**Recommendation:**
1. Add backup step before deployment
2. Run migrations separately from deployment
3. Add health check to verify migration success

---

## 3. Medium-Risk Issues

### 3.1 Duplicate Migration Logic
**Files:**
- [`migrations/010_homepage_sections.sql`](migrations/010_homepage_sections.sql:5-13)
- [`src/lib/homepage-content.ts`](src/lib/homepage-content.ts:27-42)
- [`src/lib/session.ts`](src/lib/session.ts:134-164)

**Issue:** Each feature duplicates table creation logic:
- SQL migration file
- Runtime `ensureHomepageContentTables()`
- Runtime `ensureSessionTables()`

**Risk:** 
- Inconsistency between SQL-defined schema and runtime expectations
- Runtime tables may have different indexes/constraints than migrations

**Recommendation:** Use migrations as single source of truth, remove runtime table creation:
```typescript
export async function ensureHomepageContentTables() {
  // Just verify tables exist, don't create
  const result = await sql`SELECT 1 FROM homepage_sections LIMIT 1`;
}
```

---

### 3.2 i18n Cookie Conflicts
**File:** [`src/lib/i18n/index.tsx`](src/lib/i18n/index.tsx:53)

```typescript
document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
```

**Issue:** Language cookie and session cookie both use `samesite=lax`. When navigating between subdomains, cookies may not propagate.

**Risk:** User sets language → switches device → language not remembered

**Recommendation:** Consider using `samesite=strict` for primary cookie or implement subdomain-aware cookie domain.

---

### 3.3 Migration Race Condition
**File:** [`migrations/migrate.ts`](src/lib/session.ts:103-110)

```typescript
async function acquireLock(sql: ReturnType<typeof postgres>): Promise<boolean> {
  const result = await sql`SELECT pg_try_advisory_lock(${LOCK_ID}) as acquired`;
  return result[0]?.acquired ?? false;
}
```

**Risk:** If migration runner crashes after acquiring lock but before completing, lock is never released. Next migration run will fail indefinitely.

**Impact:** Requires manual `SELECT pg_advisory_unlock(1234567890)` to recover.

**Recommendation:** Add lock timeout or use `pg_advisory_lock` (blocking) instead of `pg_try_advisory_lock`.

---

## 4. Minor Issues / Cleanup

### 4.1 Unused Code
- [`src/lib/homepage-data.ts`](src/lib/homepage-data.ts) - appears unused
- Legacy booking content fields in database

### 4.2 Magic Numbers
- Session expiry: `30 * 24 * 60 * 60` (should be constant)
- Cleanup limit: `100` in `cleanupExpiredSessions()`

### 4.3 Error Handling Gaps
- No try-catch around `document.cookie` parsing (line 44 in session.ts)
- Missing error boundaries in admin pages

---

## 5. Rollback Weaknesses

### 5.1 No Reverse Migrations
**Issue:** No `DOWN` migrations exist. Once applied, changes cannot be rolled back via migration runner.

**Mitigation:** Manual DB restore required from backup.

### 5.2 Seed Data Overwrites
**File:** [`migrations/010_homepage_sections.sql`](migrations/010_homepage_sections.sql:22-63)

```sql
INSERT INTO homepage_sections ... ON CONFLICT (id) DO NOTHING;
```

**Issue:** If admin edits content AFTER migration runs, re-running migration does nothing. But if migration is manually reversed, content is lost.

---

## 6. Summary Table

| Category | Issue Count | Severity |
|----------|-------------|----------|
| Critical | 4 | MUST FIX |
| High | 4 | SHOULD FIX |
| Medium | 3 | CONSIDER FIXING |
| Minor | 3 | CLEANUP |

### Priority Actions

1. **Immediate:** Add transaction wrapping to migrations
2. **Immediate:** Fix CASCADE DELETE to soft-delete
3. **Before Production:** Fix cookie `secure` flag for HTTP
4. **Before Production:** Remove dual schema creation (migrations OR runtime)
5. **Before Production:** Add admin input validation
6. **Roadmap:** Implement backup strategy for migrations
