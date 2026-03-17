# Admin Panel Usability and Content Architecture Audit

**Date:** 2026-03-17  
**Auditor:** Frontend Architect  
**Objective:** Propose simpler admin information architecture

---

## 1. Current Homepage → Admin Mapping

### Homepage Sections and Their Admin Locations

| Homepage Section | Section ID | Admin Location | Status |
|-----------------|------------|---------------|--------|
| **Services** | `#services` | `/admin/services` | ✅ Direct |
| **Gallery** | `#gallery` | `/admin/gallery` | ✅ Direct |
| **Team/Sandra** | `#team` | `/admin/homepage-media` (team_portrait) | ⚠️ Fragmented |
| **Products** | `#products` | `/admin/products` | ✅ Direct |
| **Testimonials** | `#testimonials` | `/admin/homepage-media` (testimonial_*) | ⚠️ Fragmented |
| **Location** | `#location` | `/admin/homepage-media` (location_studio) | ⚠️ Fragmented |
| **Pricing** | `#pricing` | (Part of services) | ✅ In Services |
| **Hero/Main** | - | `/admin/homepage-media` (hero_main) | ⚠️ Fragmented |

### Booking Flow → Admin Mapping

| Booking Content | Admin Location | Status |
|-----------------|---------------|--------|
| Service step texts | `/admin/booking` → Texts tab | ✅ |
| Availability texts | `/admin/booking` → Texts tab | ✅ |
| Contact step texts | `/admin/booking` → Texts tab | ✅ |
| Add-ons | `/admin/booking` → Add-ons tab | ✅ |
| AI knowledge base | `/admin/booking` → AI tab | ✅ |
| Time slots | `/admin/slots` | ✅ Separate |

---

## 2. Current Admin Sections

```
/admin/
├── page.tsx          (Dashboard/Overview)
├── account/          (Account settings)
├── bookings/         (View all bookings)
├── booking/          (Booking texts, add-ons, AI)
├── services/         (Service catalog)
├── products/         (Product catalog)
├── gallery/          (Gallery images)
├── homepage-media/  (All other images - HEREC)
├── slots/           (Time slot management)
├── orders/          (Order history)
└── login/           (Login page)
```

---

## 3. Biggest Admin Usability Problems

### Problem 1: Homepage Media is a Catch-All Dump
**Location:** `/admin/homepage-media`  
**Issue:** This single page manages 15+ different image types:
- `hero_main`, `hero_alt`
- `team_portrait`, `testimonial_*`
- `product_fallback_*`, `gallery_fallback_*`
- `service_fallback_*`
- `location_studio`, `aftercare_image`, `giftcard_image`
- And many more...

**User Confusion:** Admin cannot find where to edit a specific image. They have to guess the key name.

### Problem 2: Content Fragmentation
| Content Type | Current Admin Locations | Problem |
|-------------|------------------------|---------|
| Service images | `/admin/services` + `/admin/homepage-media` | Two places |
| Product images | `/admin/products` + `/admin/homepage-media` | Two places |
| Gallery images | `/admin/gallery` | OK |
| Testimonials | `/admin/homepage-media` (only images) | Missing text! |

### Problem 3: Unclear Section Boundaries
- "Booking" vs "Bookings" - what's the difference?
- "Slots" - is this for availability or time management?
- No obvious "Homepage" section to manage homepage content

### Problem 4: No Search
- Cannot search for a specific product, service, or image
- Admin must navigate through multiple pages to find content

### Problem 5: Missing Visibility Controls
- Services have `isPopular` and `active` flags, but no ordering control
- Products have `isFeatured`, but no explicit ordering
- No drag-and-drop reordering

---

## 4. Proposed New Admin Information Architecture

### New Structure

```
/admin/
├── dashboard/        (Overview, quick stats)
├── content/          (ALL homepage & public content)
│   ├── services/     (Service catalog - COMPLETE)
│   ├── products/     (Product catalog - COMPLETE)
│   ├── gallery/      (Gallery images)
│   ├── homepage/     (Hero, team, testimonials, location images)
│   └── texts/        (Homepage translations - currently missing!)
├── booking/          (Booking flow configuration)
│   ├── flow/         (Booking step texts, UI strings)
│   ├── addons/       (Add-on services)
│   └── slots/        (Time slot management)
├── operations/       (Day-to-day management)
│   ├── bookings/     (View/manage bookings)
│   └── orders/       (Order history)
└── settings/         (Account, system)
    └── account/
```

### Rationale

| New Section | Contents | Why |
|-------------|----------|-----|
| **content/** | All public-facing content | One place for everything the customer sees |
| **content/services** | Services with images | Complete service object |
| **content/products** | Products with images | Complete product object |
| **content/homepage** | Hero, team, testimonials, location | All homepage-specific media |
| **content/texts** | Homepage translations | Currently scattered or missing |
| **booking/** | Booking flow | All booking-related configuration |
| **operations/** | Daily operations | Separated from configuration |

---

## 5. Proposed Service Editor Structure

### Current Problem
Service information is split:
- Core data: `/admin/services`
- Images: `/admin/homepage-media` (service_fallback_* keys)

### Proposed Solution: Unified Service Editor

```
/admin/content/services/[id]/edit
├── Basic Info
│   ├── Name (ET/EN)
│   ├── Category (dropdown)
│   └── Description (ET/EN)
├── Pricing
│   ├── Price (EUR)
│   └── Duration (minutes)
├── Details (all bilingual)
│   ├── Result Description (What customer gets)
│   ├── Longevity Description (How long it lasts)
│   └── Suitability Note (Who it's for)
├── Image
│   └── Upload/select image (replaces service_fallback_* keys)
├── Display Options
│   ├── Featured/Popular (toggle)
│   ├── Active/Published (toggle)
│   └── Sort Order (number or drag-drop)
└── Translations
    └── All text fields already bilingual
```

### Service Fields Summary

| Field Group | Fields | Current Editable? |
|-------------|--------|-------------------|
| **Basic** | name, category, description | ✅ Yes |
| **Pricing** | price, duration | ✅ Yes |
| **Details** | result, longevity, suitability | ✅ Yes |
| **Image** | imageUrl | ⚠️ Fragmented |
| **Display** | isPopular, active, order | ⚠️ No order control |

---

## 6. Proposed Admin Search Design

### Search Location
- **Global search bar** in top navigation (persistent across all admin pages)
- Keyboard shortcut: `Ctrl+K` / `Cmd+K`

### Searchable Entities

| Entity | Searchable Fields | Result Action |
|--------|------------------|---------------|
| **Services** | name, description, category | Jump to service in list |
| **Products** | name, description, category | Jump to product in list |
| **Gallery** | caption | Jump to image in gallery |
| **Bookings** | customer name, email, phone, ID | Open booking detail |
| **Orders** | order ID, customer name | Open order detail |
| **Content Keys** | homepage-media keys | Jump to media item |

### Search Results UI
```
[🔍 Search...________________________] (Ctrl+K)

Results for "gel":
├── Services (2)
│   ├── Gel Manicure → Edit
│   └── Gel Pedicure → Edit
├── Products (1)
│   └── Gel Polish Kit → Edit
└── Homepage Media (0)
```

### Auto-Complete Behavior
- Show up to 5 results per category
- Group by entity type
- Show entity icon for visual identification

---

## 7. Recommended Implementation Order

### Phase 1: Lowest Risk (Foundation)

1. **Add global search** (no structural changes)
   - Search services, products, bookings
   - Quick win for usability

2. **Add sort order to services/products**
   - Database migration
   - UI change only
   - No breaking changes

### Phase 2: Unification (Medium Risk)

3. **Consolidate homepage media**
   - Split `/admin/homepage-media` into logical sections
   - Keep same backend, reorganize UI
   - Add section headers: "Hero Images", "Team", "Testimonials", etc.

4. **Add homepage texts section**
   - Create `/admin/content/texts`
   - Gather all homepage translation keys
   - No backend changes needed

### Phase 3: Restructuring (Higher Risk)

5. **Reorganize admin navigation**
   - Create new section structure
   - Update routing
   - Add redirects for old URLs

6. **Unify service/product images**
   - Move image upload into service/product editors
   - Deprecate fallback keys (with migration path)
   - Remove duplicate upload UI

---

## 8. Specific Recommendations

### Immediate Quick Wins

1. **Rename "Homepage Media"** to something more descriptive OR split it
2. **Add service ordering** - most obvious missing control
3. **Add search** - highest impact for usability
4. **Add breadcrumbs** - help navigation

### For Next Sprint

5. **Service editor**: Add image upload inline (remove need for homepage-media)
6. **Product editor**: Same as services
7. **Homepage preview**: Add "view on site" links

### For Future Consideration

8. **Drag-and-drop ordering** for services and products
9. **Draft/publish workflow** for content changes
10. **Content versioning** for rollback capability

---

## Summary

| Current Problem | Proposed Fix |
|-----------------|--------------|
| Homepage media is a catch-all | Split into logical content sections |
| Service images in two places | Unified service editor with inline image |
| No search | Global search with Ctrl+K |
| Unclear navigation | Clear hierarchy: Content → Booking → Operations |
| No ordering control | Add explicit sort order fields |

**Core Principle:** Everything that belongs together should be editable together. A service is one complete object - edit it in one place.
