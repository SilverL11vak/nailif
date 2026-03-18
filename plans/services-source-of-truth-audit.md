# Services Source-of-Truth Audit Report

**Date:** 2026-03-17  
**Scope:** Homepage services section (`id="services"`) vs `/admin/services` data source

---

## 1. Current Source-of-Truth Map

### Data Flow Architecture

```mermaid
flowchart TD
    A["/admin/services<br/>Page"] -->|POST/DELETE| B["/api/services<br/>Route"]
    B -->|upsertService| C["SQL: services table"]
    C -->|listServices| D["/api/services<br/>GET"]
    D -->|services| E["Homepage<br/>page.tsx"]
    E -->|setServiceCards| F["serviceCards State"]
    F -->|serviceCards| G["ServiceCard[]]

    subgraph "Source of Truth: services table"
    C
    end

    subgraph "Admin Editor"
    A
    end

    subgraph "Homepage Display"
    E
    G
    end

    H["homepage-media<br/>service_fallback_* keys"] -.->|optional image fallback| E
    I["i18n translations<br/>serviceDecision.fallback"] -.->|text fallback| E
```

### Primary Source-of-Truth
**The `/admin/services` page and its associated `/api/services` endpoint are the definitive source for homepage services.**

The homepage services section (`id="services"`) is **fully driven** by `/admin/services` records with **zero hardcoded service data** in the homepage component itself.

---

## 2. Field-by-Field Homepage vs /admin/services Mapping

| Field | Admin Page (`/admin/services`) | Homepage Section | Mapping Status |
|-------|-------------------------------|------------------|----------------|
| **name** | `nameEt`, `nameEn` (full editing) | `name` (localized) | ✅ Mapped - uses `localizedValue()` |
| **description** | `descriptionEt`, `descriptionEn` | `description` | ✅ Mapped - uses `localizedValue()` |
| **price** | `price` (number input) | `price` | ✅ Direct map |
| **duration** | `duration` (number, minutes) | `duration` | ✅ Direct map |
| **image** | `imageUrl` (file upload/URL) | `imageUrl` | ✅ Direct map with `sanitizePublicImage()` |
| **result** | `resultDescriptionEt`, `resultDescriptionEn` | `resultDescription` | ✅ Mapped - uses `localizedValue()` |
| **longevity** | `longevityDescriptionEt`, `longevityDescriptionEn` | `longevityDescription` | ✅ Mapped - uses `localizedValue()` |
| **suitability** | `suitabilityNoteEt`, `suitabilityNoteEn` | `suitabilityNote` | ✅ Mapped - uses `localizedValue()` |
| **isPopular** | `isPopular` (checkbox) | `isPopular` | ✅ Direct map - determines featured service |
| **active** | `active` (checkbox) | **NOT directly used** | ⚠️ Filtered at API level - only `active=TRUE` returned |
| **sort/order** | `sortOrder` (number input) | `sortOrder` | ✅ Used in API query: `ORDER BY sort_order ASC` |
| **category** | `category` (select dropdown) | Not displayed on homepage | ℹ️ Available but not rendered |

---

## 3. Image Ownership Analysis

### Image Sources for Homepage Services

| Image Type | Primary Source | Fallback Chain |
|------------|----------------|----------------|
| **Service images** | `service.imageUrl` from `/api/services` | `service_fallback_{serviceId}` from homepage-media → placeholder "MN" |

### Homepage-Media Keys Affecting Services
Found in [`src/lib/homepage-media.ts`](src/lib/homepage-media.ts):
- `service_fallback_gel-manicure`
- `service_fallback_acrylic-extensions`
- `service_fallback_luxury-spa-manicure`
- `service_fallback_gel-pedicure`

**Important:** These fallback keys are **defined in the code** but the homepage **does NOT currently use them** for service images. The homepage only checks the service's own `imageUrl` field. The fallback images exist in homepage-media but are not connected to the services section display logic.

---

## 4. Which Services Appear on Homepage and Why

### Selection Logic (from [`src/app/page.tsx:453-459`](src/app/page.tsx#L453-L459))

```typescript
const servicesSource = serviceCards.length > 0 ? serviceCards : [];
const featuredService = servicesSource.find((service) => Boolean(service.isPopular)) ?? servicesSource[0];
const services = [
  ...(featuredService ? [featuredService] : []),
  ...servicesSource.filter((service) => service.id !== featuredService?.id),
].slice(0, 5);
const regularServices = services.filter((service) => service.id !== featuredService?.id).slice(0, 4);
```

### Why Services Appear:
1. **Featured Service Selection:**
   - First looks for `isPopular = true` in `/admin/services` records
   - Falls back to first service in the sorted list
   - Only one featured service is displayed

2. **Regular Services (Grid):**
   - All other active services (excluding featured)
   - Limited to 4 cards in the grid view

3. **Total Display Cap:**
   - Maximum 5 services shown (1 featured + 4 regular)

### Active/Published Logic:
- **API filters by `active = TRUE`** (see [`catalog.ts:409`](src/lib/catalog.ts#L409))
- Services with `active = false` are **completely hidden** from both admin list view and homepage
- No "published/draft" distinction exists beyond the `active` boolean

---

## 5. Exact Mismatches Found

### ✅ No Critical Mismatches
The core data flow is working correctly. Services are properly driven from `/admin/services`.

### ⚠️ Minor Issues & Gaps

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| **Fallback translations limited to 4 IDs** | [`et.json:336-357`](src/lib/i18n/et.json#L336-L357), [`en.json:336-357`](src/lib/i18n/en.json#L336-L357) | Low | Translation fallbacks only defined for: `gel-manicure`, `acrylic-extensions`, `luxury-spa-manicure`, `gel-pedicure`. New services without these IDs won't have fallback text. |
| **Homepage-media fallback unused** | [`homepage-media.ts`](src/lib/homepage-media.ts) | Low | Service fallback images exist in homepage-media but are not wired to homepage service display |
| **No fallback longevity for featured** | [`page.tsx:1286`](src/app/page.tsx#L1286) | Low | Featured service uses hardcoded fallback key: `t('homepage.featuredService.longevityFallback')` instead of dynamic `t(\`homepage.serviceDecision.fallback.${featuredService.id}.longevity\`)` |
| **Missing sortOrder in homepage** | [`page.tsx`](src/app/page.tsx) | Low | `sortOrder` is stored and returned by API but not used in homepage display logic - only `isPopular` drives ordering |
| **Data URL images sanitized** | [`catalog.ts:186-190`](src/lib/catalog.ts#L186-L190) | Info | Base64 data URLs in `imageUrl` are stripped for public API (security feature) |

---

## 6. Final Recommended Source-of-Truth Contract

### Data Contract: `/api/services` GET

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Unique service identifier |
| `name` | string | Yes | Localized name (ET or EN) |
| `description` | string | No | Localized description |
| `price` | number | Yes | Price in EUR |
| `duration` | number | Yes | Duration in minutes |
| `category` | 'manicure' \| 'pedicure' \| 'extensions' \| 'nail-art' | Yes | Service category |
| `imageUrl` | string \| null | No | Public image URL or null |
| `isPopular` | boolean | Yes | Determines featured service |
| `sortOrder` | number | Yes | Display order |
| `active` | boolean | Yes | Only active services returned |
| `resultDescription` | string | No | Result outcome text |
| `longevityDescription` | string | No | How long results last |
| `suitabilityNote` | string | No | Who the service is for |

### Homepage Display Contract

| Logic | Rule |
|-------|------|
| Max services shown | 5 total (1 featured + 4 grid) |
| Featured selection | First `isPopular=true` or first by sortOrder |
| Active filtering | API returns only `active=true` |
| Order by | `sortOrder ASC`, then `price ASC`, then `name ASC` |
| Fallback text | Uses translation key: `homepage.serviceDecision.fallback.{serviceId}.{field}` |
| Fallback image | Uses `service_fallback_{serviceId}` from homepage-media (NOT CURRENTLY CONNECTED) |

---

## 7. Lowest-Risk Implementation Plan

### Phase 1: Connect Unused Fallbacks (Low Risk)

1. **Wire homepage-media service fallbacks to display:**
   - In [`page.tsx`](src/app/page.tsx), add fallback image lookup using `media()` helper
   - Pattern: `featuredService.imageUrl || media(\`service_fallback_${featuredService.id}\`) || 'MN'`

2. **Expand translation fallbacks:**
   - Add new service IDs to [`et.json`](src/lib/i18n/et.json) and [`en.json`](src/lib/i18n/en.json) as admin creates them
   - Or: Create generic fallback text that works for any service ID

### Phase 2: Improve Sort Control (Low Risk)

1. **Add visual sortOrder indicator on homepage:**
   - Display services in their actual sortOrder sequence
   - Currently, only `isPopular` affects the featured selection

### Phase 3: Add Publishing Workflow (Medium Risk)

1. **Introduce draft/published states:**
   - Add `published` boolean alongside `active`
   - Homepage shows `active=true, published=true`
   - Admin shows all `active` services
   - Allows "save as draft" before going live

### Recommended Priority: **Phase 1 first** - connects existing unused infrastructure with minimal code changes.

---

## Summary

| Question | Answer |
|----------|--------|
| Is homepage driven by `/admin/services`? | **YES** - fully driven |
| Are there hardcoded service names/content? | **NO** - zero hardcoded data |
| Are there fallback sources? | **YES** - translation fallbacks and unused homepage-media images |
| Is there mismatch between admin fields and homepage? | **MINOR** - all fields map correctly; some unused |
| What controls what shows? | `isPopular` (featured), `active` (visibility), `sortOrder` (order) |

**Conclusion:** The services section is architecturally sound with `/admin/services` as the single source of truth. The implementation correctly uses the API data with appropriate fallback mechanisms for missing content.
