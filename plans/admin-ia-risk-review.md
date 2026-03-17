# Admin Panel Restructure Plan - Risk Review

**Date:** 2026-03-17  
**Reviewer:** Code Skeptic  
**Objective:** Audit the admin restructure plan for hidden risks

---

## 1. Critical Risks

### 1.1 Homepage Media Keys are Hardcoded in Homepage

**Risk:** The homepage directly references specific media keys that cannot change without breaking the UI.

**Evidence from homepage code:**
```typescript
// Line 95-98: Testimonial images
media('testimonial_featured'), media('team_portrait')
media('testimonial_1'), media('testimonial_2'), media('testimonial_3')

// Line 1630: Team/Sandra image
media('team_portrait'), media('hero_main')

// Line 2231: Location image
media('location_studio')

// Line 2269: Aftercare image
media('aftercare_image')

// Line 2297: Gift card
media('giftcard_image')

// Lines 1019-1343: Service fallback images
media(serviceFallbackKeys[service.id])
```

**Impact:** Any admin restructure that changes media keys or storage will break the homepage.

**Mitigation Required:**
- DO NOT change media key names
- DO NOT move media storage without migration
- If adding image to service, continue using service-specific keys OR update homepage to use service.imageUrl first

---

### 1.2 Service Image Fallback Chain is Complex

**Risk:** Multiple fallback layers make it hard to understand which image shows.

**Current fallback chain:**
```
Service.imageUrl 
  → media(serviceFallbackKeys[service.id]) 
    → galleryUrls[0] 
      → galleryFallbackUrls[0] 
        → ''
```

**Problem:** If we add image upload to service editor but keep the fallback keys, admin won't understand why their uploaded image isn't showing (because fallback key takes precedence).

**Mitigation Required:**
- Change homepage to check service.imageUrl FIRST before fallback keys
- Document the image priority for admins

---

### 1.3 Backend API Endpoints Assume Current Structure

**Risk:** Admin forms POST to specific endpoints with specific payload shapes.

**Evidence:**
- `/api/services` expects specific fields (line 98-100 in services/route.ts)
- `/api/products` expects specific fields
- Adding new fields requires API changes

**Mitigation Required:**
- Keep existing API fields, add new ones as optional
- Version API if breaking changes needed

---

## 2. Medium-Risk Issues

### 2.1 Schema Changes Required for Ordering

**Risk:** Adding sort_order field requires database migration.

**Current services table:** No sort_order column  
**Current products table:** No sort_order column

**Migration needed:**
```sql
ALTER TABLE services ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0;
```

**Risk:** Existing services/products need initial sort_order values.

**Mitigation:** Set default based on created_at or isFeatured.

---

### 2.2 Search Requires New Backend Logic

**Risk:** Adding global search needs backend query patterns.

**Current state:** No unified search endpoint.

**Required:** New endpoint like `/api/search?q=term` that queries multiple tables.

**Complexity:**
- Services: LIKE query on name, description
- Products: LIKE query on name, description
- Bookings: Multiple fields to search
- Different return formats per entity

---

### 2.3 Homepage Rendering Assumes Media Location

**Risk:** Homepage uses `media()` helper that reads from homepage-media API.

**Current implementation (page.tsx line 94):**
```typescript
const media = (key: string) => homepageMedia[key]?.trim() ?? '';
```

If we split homepage-media into separate sections, we need:
1. Keep single API endpoint that returns all media
2. OR update homepage to call multiple endpoints
3. OR use a content delivery pattern

**Recommendation:** Keep single media API, reorganize admin UI only.

---

### 2.4 Breaking Deep Links

**Risk:** Current admin URLs would change.

| Current URL | Proposed URL |
|------------|-------------|
| /admin/services | /admin/content/services |
| /admin/products | /admin/content/products |
| /admin/homepage-media | /admin/content/homepage |

**Impact:** Bookmarks, browser history, shared links would break.

**Mitigation Required:**
- Add redirects in Next.js middleware or API routes
- Keep old routes working for at least 6 months

---

## 3. Usability Blind Spots

### 3.1 Service Editor Could Become Overloaded

**Proposed editor has 6+ sections:**
- Basic Info
- Pricing
- Details
- Image
- Display Options
- Translations

**Risk:** Admin might get lost in long scrollable form.

**Mitigation:** Use tabs or collapsible accordion sections.

---

### 3.2 Search Scope Questionable

**Proposed searchable entities:**
- Services, Products, Gallery, Bookings, Orders, Content Keys

**Missing considerations:**
- Should search include archived/deleted items?
- Should search include draft content?
- How to handle partial matches vs exact matches?
- Performance: Search across multiple tables could be slow

---

### 3.3 Homepage Media Split Might Not Help

**Proposed:** Split `/admin/homepage-media` into:
- Hero images
- Team images  
- Testimonial images
- Location images

**Risk:** Admin still needs to know the key names to find specific images.

**Alternative:** Better solution might be to show image previews with key names, not just key-based lists.

---

### 3.4 No Guidance for New Admins

**Missing:**
- Help tooltips on complex fields
- Contextual guidance for image keys
- Preview of how content looks on site

---

## 4. Safer Implementation Sequence

### Phase 0: Research & Preparation (Do First)

1. **Document all current media keys** - create inventory of what keys exist and where they're used
2. **Map current API payloads** - understand exact data shapes
3. **Create migration scripts** - prepare sort_order additions

### Phase 1: Low Risk (Foundation)

1. **Add global search**
   - Create unified search endpoint
   - Add search UI to existing layout
   - No breaking changes

2. **Add sort_order to database**
   - Migration with defaults
   - UI to edit (simple number field)
   - Homepage to use for ordering

### Phase 2: UI Reorganization (Medium Risk)

3. **Split homepage-media UI only**
   - Keep same API endpoints
   - Keep same media keys
   - Just reorganize admin page sections

4. **Add service ordering to UI**
   - Add sort_order field to service editor
   - Update homepage to respect order

### Phase 3: Structural Changes (Higher Risk)

5. **Add image upload to service editor**
   - Update service API to accept imageUrl
   - Update homepage to prioritize service.imageUrl over fallback keys
   - Deprecate serviceFallbackKeys gradually

6. **Navigation restructure**
   - Add new routes with redirects
   - Keep old routes working
   - Test all deep links

---

## 5. What Parts of Architect Plan Are Solid

### ✅ Good Recommendations

| Recommendation | Why Solid |
|---------------|----------|
| Global search | Solves real usability problem, no structural changes |
| Add sort_order | Clear need, straightforward implementation |
| Split homepage-media UI | Doesn't require backend changes |
| Separate booking content from operations | Logical separation |

### ⚠️ Needs Caution

| Recommendation | Concern |
|---------------|---------|
| Move images into service editor | Must update homepage fallback logic first |
| Completely new navigation structure | Needs redirects, testing |
| "texts" section | Might be large, unclear what belongs there |

### ❌ Avoid for Now

| Recommendation | Why Avoid |
|---------------|----------|
| Change media key names | Would break homepage |
| Remove fallback keys immediately | Would break if new images not uploaded |
| Combine booking and bookings | High confusion risk, low benefit |

---

## 6. Summary

| Risk Category | Count | Blockers |
|--------------|-------|----------|
| Critical | 3 | 1. Don't change media keys 2. Update homepage fallback logic first 3. Keep API compatibility |
| Medium | 4 | 1. Migration planning 2. Search backend design 3. Redirect strategy 4. Form overload |
| Blind Spots | 4 | 1. Editor complexity 2. Search scope 3. Media split value 4. Onboarding help |

**Overall Assessment:** Plan is implementable but requires careful sequencing. Key rule: **Don't break homepage media keys**, and **update homepage fallback logic before adding images to service editor**.

