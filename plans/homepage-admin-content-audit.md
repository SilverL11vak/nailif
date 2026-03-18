# Homepage vs Admin Panel Content Consistency Audit

**Date:** 2026-03-17  
**Auditor:** Code Skeptic (Frontend Architect)  
**Task:** Analyze content mismatches between homepage and admin panel

---

## Executive Summary

**CRITICAL FINDING:** The homepage contains **multiple hardcoded fallback data sources** that bypass the admin panel/database. These fallbacks are used when the API returns empty results, meaning the homepage may show stale or incorrect content even when admin panel has different data.

---

## 1. Data Source Analysis

### 1.1 Products

| Source | Location | Used By | Localized |
|--------|----------|---------|----------|
| **Database** | PostgreSQL via `/api/products` | Admin panel + Homepage | ✅ Yes (nameEt, nameEn, etc.) |
| **defaultProducts** | `src/lib/catalog.ts:45-95` | Database seeding only | ✅ Yes (bilingual) |
| **fallbackProductsBase** | `src/app/page.tsx:48-125` | Homepage fallback | ❌ **English only** |

**Flow:**
```
Admin Panel → POST /api/products → Database → listProducts() → Homepage
                                                   ↓
                                    (if empty) → fallbackProductsBase (HARDCODED)
```

**Issue:** The fallback in homepage has **different product IDs** than the seeded default products:
- Database/Default: `cuticle-oil-rose`
- Homepage Fallback: `rose-cuticle-oil`

### 1.2 Services

| Source | Location | Used By | Localized |
|--------|----------|---------|----------|
| **Database** | PostgreSQL via `/api/services` | Admin panel + Homepage | ✅ Yes |
| **mockServices** | `src/store/mock-data.ts:4-50` | Homepage fallback | ❌ **English only** |

**Mock Services (lines 4-50 in mock-data.ts):**
```typescript
{ id: 'gel-manicure', name: 'Gel Manicure', price: 35, ... }
{ id: 'acrylic-extensions', name: 'Acrylic Extensions', price: 65, ... }
{ id: 'luxury-spa-manicure', name: 'Luxury Spa Manicure', price: 55, ... }
{ id: 'gel-pedicure', name: 'Gel Pedicure', price: 40, ... }
{ id: 'nail-art', name: 'Nail Art', price: 25, ... }
```

**Issue:** The mock data lacks many fields that the API returns:
- Missing: `resultDescriptionEt/En`, `longevityDescriptionEt/En`, `suitabilityNoteEt/En`, `imageUrl`

### 1.3 Gallery Images

| Source | Location | Used By |
|--------|----------|--------|
| **Database** | PostgreSQL via `/api/gallery` | Admin panel + Homepage |
| **galleryFallbackKeys** | `src/app/page.tsx:127-134` | Homepage fallback |

**Fallback Keys (line 127-134):**
```typescript
const galleryFallbackKeys = [
  'gallery_fallback_1',
  'gallery_fallback_2',
  'gallery_fallback_3',
  'gallery_fallback_4',
  'gallery_fallback_5',
  'gallery_fallback_6',
];
```

**Issue:** Homepage tries to load fallback images from `homepageMedia` API using these keys. If admin hasn't uploaded images with these exact keys, fallbacks won't work.

### 1.4 Homepage Media

| Source | Location | Used By |
|--------|----------|--------|
| **Database** | PostgreSQL via `/api/homepage-media` | Admin panel + Homepage |

**Media Keys Used by Homepage:**
- `product_fallback_1` through `product_fallback_6`
- `gallery_fallback_1` through `gallery_fallback_6`
- `service_fallback_gel-manicure`, `service_fallback_acrylic-extensions`, etc.
- `testimonial_featured`, `testimonial_1`, `testimonial_2`, `testimonial_3`
- `team_portrait`, `hero_main`, `location_studio`, `aftercare_image`, `giftcard_image`

---

## 2. Exact Mismatches Found

### 2.1 Product Data Mismatch

| Aspect | Homepage Fallback | Admin Database | Impact |
|--------|------------------|----------------|--------|
| **ID** | `rose-cuticle-oil` | `cuticle-oil-rose` | Different products! |
| **Name** | English only | Bilingual (Et/En) | Missing Estonian |
| **Count** | 6 products | Variable (admin-controlled) | Homepage ignores admin |
| **Featured** | Hardcoded | Admin-controlled flag | May differ |

**Files Involved:**
- [`src/app/page.tsx:48-125`](src/app/page.tsx:48) - fallbackProductsBase
- [`src/lib/catalog.ts:45-95`](src/lib/catalog.ts:45) - defaultProducts (seeding)

### 2.2 Service Data Mismatch

| Aspect | Homepage Mock | Admin Database |
|--------|---------------|---------------|
| **Fields** | 7 fields | 15+ fields |
| **Localization** | English only | Bilingual |
| **Images** | None | imageUrl field ignored |

**Missing Fields in mockServices:**
- `resultDescriptionEt/En`
- `longevityDescriptionEt/En`
- `suitabilityNoteEt/En`
- `imageUrl`

**Files Involved:**
- [`src/store/mock-data.ts:4-50`](src/store/mock-data.ts:4) - mockServices
- [`src/app/page.tsx:160`](src/app/page.tsx:160) - useState initialization

### 2.3 Slot Data Mismatch

The homepage also has mock slots (lines 52-100 in mock-data.ts) with **hardcoded dates in the past**:
```typescript
{ date: '2026-03-15', ... }  // PAST DATE
{ date: '2026-03-16', ... }  // PAST DATE
```

This is less critical as slots are fetched from API on mount, but the mock data exists as fallback.

---

## 3. Sections Correctly Tied to Admin/Database

### ✅ Correct Implementations

| Section | Data Source | Notes |
|---------|-------------|-------|
| **Gallery Images** | `/api/gallery` | Properly fetches from database |
| **Homepage Media** | `/api/homepage-media` | Uses admin-uploaded media keys |
| **Slot Availability** | `/api/slots` | Fetches from database |
| **Service List** | `/api/services` | Properly fetches from database |

**Code References:**
- [`src/app/page.tsx:278`](src/app/page.tsx:278) - products fetch
- [`src/app/page.tsx:303`](src/app/page.tsx:303) - services fetch
- [`src/app/page.tsx:323`](src/app/page.tsx:323) - gallery fetch
- [`src/app/page.tsx:343`](src/app/page.tsx:343) - homepage media fetch

---

## 4. Sections Using Mock/Hardcoded Data

### ❌ Problem Areas

| Section | Fallback Type | Trigger Condition | Risk |
|---------|--------------|-------------------|------|
| **Products** | Hardcoded array | API returns empty | HIGH |
| **Services** | mockServices import | API fails or returns empty | HIGH |
| **Gallery Images** | Media keys | Media not uploaded | MEDIUM |
| **Service Images** | serviceFallbackKeys | Media not uploaded | MEDIUM |

**Trigger Logic (from page.tsx):**
```typescript
// Line 186: Products
const productSource = products.length > 0 ? products.slice(0, 8) : fallbackProducts;

// Line 542: Services  
const servicesSource = serviceCards.length > 0 ? serviceCards : (mockServices as ServiceCard[]);
```

---

## 5. Field Mapping Issues

### 5.1 Homepage → Product Type

The homepage imports `Product` type from `@/lib/catalog.ts` correctly:
```typescript
import type { Product } from '@/lib/catalog';
```

**No field mapping mismatch** - the API returns correct fields.

### 5.2 Homepage → ServiceCard Interface

**MISMATCH FOUND:** Homepage defines its own `ServiceCard` interface (lines 17-29):

```typescript
interface ServiceCard {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: 'manicure' | 'pedicure' | 'extensions' | 'nail-art';
  isPopular?: boolean;
  resultDescription?: string;
  longevityDescription?: string;
  suitabilityNote?: string;
  imageUrl?: string | null;
}
```

But mockServices only has:
```typescript
{ id, name, description, duration, price, category, isPopular }
```

The mock is missing: `resultDescription`, `longevityDescription`, `suitabilityNote`, `imageUrl`

---

## 6. Ordering and Visibility Rules

### ✅ Correctly Implemented

| Rule | Implementation | Status |
|------|----------------|--------|
| **Active products only** | `listProducts(true, locale)` filters `WHERE active = TRUE` | ✅ Correct |
| **Featured first** | `ORDER BY is_featured DESC, created_at DESC` | ✅ Correct |
| **Admin sees all** | `?admin=1` bypasses active filter | ✅ Correct |

### ⚠️ Potential Issues

1. **Product limit on homepage:** `products.slice(0, 8)` - Homepage only shows first 8 products
2. **No pagination:** If admin adds many products, older ones never appear on homepage

---

## 7. Fallback Behavior Analysis

### When Homepage Shows Hardcoded Content

**Scenario 1: Fresh database (no products)**
```
Database: Empty
API: Returns []
Homepage: Shows fallbackProductsBase (6 English products)
```

**Scenario 2: API error**
```
API: 500 Error
Homepage: Shows fallbackProductsBase (6 English products)
```

**Scenario 3: API timeout**
```
API: Request timeout
Homepage: Shows fallbackProductsBase (6 English products)
```

### Risk Assessment

| Scenario | User Sees | Admin Intended | Risk |
|----------|-----------|----------------|------|
| Empty DB | Hardcoded English products | Nothing | HIGH |
| Admin deleted all | Hardcoded English products | Empty store | HIGH |
| API error | Hardcoded English products | Error message | MEDIUM |

---

## 8. Minimal Fix Plan (Priority Order)

### 🔴 Priority 1: Remove Hardcoded Fallbacks

**Products:**
- Remove `fallbackProductsBase` from `src/app/page.tsx:48-125`
- Show empty state or loading indicator instead
- Or: Create a "default catalog" in admin panel, not code

**Services:**
- Remove `mockServices` fallback from `src/app/page.tsx:160, 310, 542`
- Show empty state or error message
- Never fallback to mock data in production

### 🟠 Priority 2: Improve Error Handling

- Add user-facing error states (not silent fallbacks)
- Log errors to monitoring
- Consider adding a "maintenance mode" banner

### 🟡 Priority 3: Improve Media Fallbacks

- Add better error/placeholder images
- Document required media keys for admins
- Add validation in admin panel for required keys

---

## 9. Risk to Upcoming Performance Refactor

### ⚠️ Critical Concerns

1. **Silent data bypass:** The performance refactor moving data to server-side may **hide the fallback behavior** - server will fetch from API (same source), but if DB is empty, server returns empty, homepage still shows hardcoded English fallbacks.

2. **Server-side caching:** Currently homepage has `Cache-Control: public, s-maxage=300, stale-while-revalidate=900`. If admin adds products, homepage may show stale cached data for up to 15 minutes while hardcoded fallback would show immediately.

3. **Hydration mismatch risk:** The current client-side fetch + fallback happens after hydration. Server-side refactor must ensure:
   - Server passes data to client
   - Client doesn't re-fetch and overwrite with different data
   - Fallback logic is consistent

### Recommendations Before Refactor

1. **Remove all hardcoded fallbacks first** - or at minimum make them only show when explicitly configured
2. **Ensure empty state handling** - not fallback to hardcoded data
3. **Add real-time invalidation** - when admin changes data, homepage should reflect it
4. **Test empty database scenario** - verify homepage shows appropriate empty state

---

## 10. Summary

| Category | Status | Count |
|----------|--------|-------|
| Products | ⚠️ Mixed | 1 proper source, 1 hardcoded fallback |
| Services | ⚠️ Mixed | 1 proper source, 1 mock fallback |
| Gallery | ✅ Good | Database only |
| Homepage Media | ✅ Good | Database only |
| Slots | ✅ Good | API only |

**Root Cause:** The homepage was built with development fallbacks that were never removed or properly gated for production use.

**Impact:** Users may see outdated English-only content when:
- Database is empty
- API has errors
- Admin expects different products to show

**Recommended Action:** Remove all hardcoded fallback data sources before the performance refactor to ensure admin-controlled content is the only source of truth.

---

*End of Audit*
