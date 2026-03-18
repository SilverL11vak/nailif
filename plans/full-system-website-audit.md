# Nailify Full-System Website Audit

**Date:** 2026-03-18  
**System:** Nailify - Nail Salon Booking & E-commerce Platform  
**Architecture:** Next.js 14 + Neon PostgreSQL + Stripe + Vercel  

---

## 1. Public Website Structure

### 1.1 Main Pages

| Page | Path | Purpose | Status |
|------|------|---------|--------|
| **Homepage** | `/` (root) | Main landing with hero, services, gallery, team, testimonials, location, CTA | **Complete** |
| **Booking** | `/[locale]/book` | Multi-step booking flow (guided & fast modes) | **Complete** |
| **Shop** | `/[locale]/shop` | Product catalog with categories | **Complete** |
| **Product Detail** | `/[locale]/shop/[id]` | Individual product pages | **Complete** |
| **Favorites** | `/[locale]/favorites` | Saved products (localStorage only) | **Complete** |
| **Success** | `/[locale]/success` | Post-booking confirmation page | **Complete** |

### 1.2 Homepage Sections (from [`src/app/page.tsx`](src/app/page.tsx))

| Section | Data Source | Admin-Editable |
|---------|-------------|----------------|
| Hero with booking widget | DB: `homepage_media` + API: `/api/slots` | Yes - hero image via admin |
| Services cards | DB: `services` table via `/api/services` | Yes - full CRUD in admin |
| Gallery | DB: `gallery_images` table via `/api/gallery` | Yes - full CRUD in admin |
| Team/Specialist (Sandra) | DB: `homepage_media` | Yes - image via admin |
| Testimonials/Feedback | DB: `feedback` table via `/api/feedback` | Yes - full CRUD in admin |
| Location section | Hardcoded ET address + `homepage_media` | Partially - text hardcoded |
| Products section | DB: `products` table via `/api/products` | Yes - full CRUD in admin |
| Add-ons | DB: `booking_addons` table via `/api/booking-addons` | Yes - admin interface |
| Final CTA | Hardcoded + translations | No - translation keys only |

---

## 2. Admin Panel Structure

### 2.1 Admin Pages

| Admin Section | Path | Functionality |
|---------------|------|---------------|
| **Dashboard** | `/admin` | Overview, quick stats |
| **Services** | `/admin/services` | CRUD for services with bilingual fields (ET/EN) |
| **Products** | `/admin/products` | CRUD for retail products with images |
| **Gallery** | `/admin/gallery` | Manage gallery images |
| **Homepage Media** | `/admin/homepage-media` | Upload/manage all homepage images by section |
| **Bookings** | `/admin/bookings` | View all bookings |
| **Slots** | `/admin/slots` | Manage availability time slots |
| **Booking Content** | `/admin/booking` | Manage booking flow helper texts |
| **Customers** | `/admin/customers` | Customer database |
| **Feedback** | `/admin/feedback` | Manage testimonials/reviews |
| **Analytics** | `/admin/analytics` | Booking analytics dashboard |
| **Funnel Analytics** | `/admin/funnel-analytics` | Conversion funnel data |
| **Orders** | `/admin/orders` | Product orders |
| **Account** | `/admin/account` | Admin user settings |

### 2.2 Admin Data Control

- **Services:** Fully admin-controlled via [`src/app/admin/services/page.tsx`](src/app/admin/services/page.tsx)
- **Products:** Fully admin-controlled via [`src/app/admin/products/page.tsx`](src/app/admin/products/page.tsx)
- **Gallery:** Fully admin-controlled via [`src/app/admin/gallery/page.tsx`](src/app/admin/gallery/page.tsx)
- **Homepage Media:** Fully admin-controlled via [`src/app/admin/homepage-media/page.tsx`](src/app/admin/homepage-media/page.tsx)
- **Slots:** Fully admin-controlled via [`src/app/admin/slots/page.tsx`](src/app/admin/slots/page.tsx)
- **Feedback:** Fully admin-controlled via [`src/app/admin/feedback/page.tsx`](src/app/admin/feedback/page.tsx)
- **Booking Content:** Partially admin-controlled via [`src/app/admin/booking/page.tsx`](src/app/admin/booking/page.tsx)

---

## 3. Database / Content Model

### 3.1 Database Tables (PostgreSQL/Neon)

All tables are created via "ensure" functions with `CREATE TABLE IF NOT EXISTS` pattern:

| Entity | Table | Bilingual Support | Key Fields |
|--------|-------|------------------|------------|
| **Services** | `services` | Yes - `nameEt`, `nameEn`, `descriptionEt`, `descriptionEn`, `resultDescriptionEt/En`, `longevityDescriptionEt/En`, `suitabilityNoteEt/En` | id, name, duration, price, category, isPopular, imageUrl, active, sortOrder |
| **Products** | `products` | Yes - `nameEt`, `nameEn`, `descriptionEt`, `descriptionEn`, `categoryEt`, `categoryEn` | id, name, price, imageUrl, images[], category, stock, active, isFeatured |
| **Gallery** | `gallery_images` | No - Estonian captions only | id, imageUrl, caption, isFeatured, sortOrder |
| **Homepage Media** | `homepage_media` | No - internal labels only | id, key, label, section, imageUrl, mediaType, videoLoop, sortOrder |
| **Bookings** | `bookings` | No | id, service details, contact info, slot info, payment status, stripe data |
| **Slots** | `time_slots` | No | id, date, time, available, count, isPopular, isFastest, isSos, sosSurcharge |
| **Customers** | `customers` | No | id, fullName, email, phone, preferredLanguage, marketingOptIn, notes, trustScore, lifetimeValue |
| **Orders** | `orders` | No | id, orderType, status, amountTotal, stripeSessionId, items |
| **Feedback** | `feedback` | No - Estonian text only | id, clientName, clientAvatarUrl, rating, feedbackText, serviceId, sourceLabel |
| **Booking Content** | `booking_content` | Yes - separate rows per key per language | id, key, locale, content |
| **Analytics** | `booking_analytics_sessions`, `booking_analytics_events`, `booking_analytics_slot_clicks` | N/A | Session tracking, event tracking |
| **Booking Add-ons** | `booking_addons` | No | id, name, duration, price, active |

### 3.2 Key Database Service Files

- [`src/lib/bookings.ts`](src/lib/bookings.ts) - Booking CRUD
- [`src/lib/catalog.ts`](src/lib/catalog.ts) - Services & Products
- [`src/lib/slots.ts`](src/lib/slots.ts) - Time slot management
- [`src/lib/customers.ts`](src/lib/customers.ts) - Customer management
- [`src/lib/gallery.ts`](src/lib/gallery.ts) - Gallery images
- [`src/lib/homepage-media.ts`](src/lib/homepage-media.ts) - Homepage media
- [`src/lib/feedback.ts`](src/lib/feedback.ts) - Testimonials
- [`src/lib/orders.ts`](src/lib/orders.ts) - Product orders
- [`src/lib/booking-content.ts`](src/lib/booking-content.ts) - Booking helper texts
- [`src/lib/analytics.ts`](src/lib/analytics.ts) - Event tracking

---

## 4. Frontend vs Admin Data Sources

### 4.1 Homepage Data Flow

| Content | Data Source | Admin-Editable |
|---------|-------------|----------------|
| Hero image | DB: `homepage_media` (key: `hero_main`) | **YES** |
| Services list | API: `/api/services` → DB: `services` | **YES** |
| Gallery images | API: `/api/gallery` → DB: `gallery_images` | **YES** |
| Team image | DB: `homepage_media` (key: `team_portrait`) | **YES** |
| Testimonials | API: `/api/feedback` → DB: `feedback` | **YES** |
| Location image | DB: `homepage_media` (key: `location_studio`) | **YES** |
| Products | API: `/api/products` → DB: `products` | **YES** |
| Available slots | API: `/api/slots` → DB: `time_slots` | **YES** |
| Booking add-ons | API: `/api/booking-addons` → DB: `booking_addons` | **YES** |
| Location text | Hardcoded | **NO** |
| Hero headline | Translation key + override | **NO** |
| Final CTA text | Translation key | **NO** |

### 4.2 Booking Flow Data Sources

| Step | Data Source |
|------|-------------|
| Service selection | DB: `services` via `/api/services` |
| Time slot selection | DB: `time_slots` via `/api/slots` |
| Add-on selection | DB: `booking_addons` via `/api/booking-addons` |
| Helper texts | DB: `booking_content` via `/api/booking-content` |
| Booking submission | POST to `/api/bookings` → DB: `bookings` |
| Payment | Stripe integration via `/api/stripe/*` |

### 4.3 Client-Side Persistence

- **Favorites:** localStorage (`nailify_favorites_v1`) - NOT persisted to database
- **Cart:** localStorage (`nailify_cart_v1`) - NOT persisted to database

---

## 5. Plugins / Integrations / External Systems

### 5.1 Active Integrations

| System | Type | Status | Notes |
|--------|------|--------|-------|
| **Neon PostgreSQL** | Database | Active | Primary data store via `src/lib/db.ts` |
| **Stripe** | Payments | Active | Deposit payments for bookings, webhook handling |
| **Vercel** | Hosting | Active | Deployment platform |
| **Analytics** | Custom | Active | In-house analytics via `src/lib/analytics.ts` |
| **AI Assistant** | Chat | Active | Via `/api/assistant-chat` with booking knowledge |

### 5.2 Data Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Public Site   │────▶│   API Routes    │────▶│  PostgreSQL     │
│  (Next.js App)  │◀────│  (/api/*)       │◀────│  (Neon DB)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │
        │                        ▼
        │               ┌─────────────────┐
        │               │    Stripe       │
        └──────────────▶│   (Payments)    │
                        └─────────────────┘
```

### 5.3 Upload Systems

- **Product images:** Uploaded via `/api/admin/upload-product-image` - stored as data URLs in DB
- **Feedback avatars:** Uploaded via `/api/admin/upload-feedback-avatar`
- **Homepage media:** Managed via admin panel, URLs stored in DB

---

## 6. Bilingual System Status

### 6.1 Translation System

- **Implementation:** Client-side via [`src/lib/i18n/index.tsx`](src/lib/i18n/index.tsx)
- **Languages:** Estonian (et) - Default, English (en)
- **Storage:** JSON files (`src/lib/i18n/et.json`, `src/lib/i18n/en.json`)
- **Detection:** URL path prefix, cookie, localStorage, browser default

### 6.2 Bilingual Support by Entity

| Entity | Bilingual Fields | Status |
|--------|------------------|--------|
| Services | name, description, resultDescription, longevityDescription, suitabilityNote | **FULL** |
| Products | name, description, category | **FULL** |
| Booking Content | All keys have ET and EN rows | **FULL** |
| Gallery | Caption (ET only) | **PARTIAL** |
| Feedback | Text (ET only) | **PARTIAL** |
| Homepage Media | Labels (internal only) | **NO** |

### 6.3 Language Persistence

- URL prefix (`/et/*`, `/en/*`)
- Cookie: `nailify_locale`
- localStorage: `language`
- Default: Estonian

---

## 7. System Health Snapshot

### 7.1 Production-Ready Components

✅ **Complete:**
- Homepage with dynamic content
- Full booking flow (guided + fast modes)
- Product catalog and shopping
- Admin panel for services, products, gallery, bookings, customers
- Time slot management with SOS slots
- Stripe payment integration
- Bilingual support (ET/EN)
- Analytics tracking

### 7.2 Partially Complete

⚠️ **Partially Complete:**
- Gallery captions are Estonian-only (no EN translation support)
- Feedback system is Estonian-only
- Location section has hardcoded address text
- Final CTA sections use hardcoded text
- Favorites/Cart are localStorage-only (not persisted to DB)

### 7.3 Fragile Areas

⚠️ **Fragile:**
- Many "ensure" functions run on every request - could cause DB schema issues in production
- Hardcoded fallback images rely on external Unsplash URLs
- Some translation keys may be missing EN translations
- No database migrations system (relies on `CREATE TABLE IF NOT EXISTS`)

### 7.4 Misleadingly "Done"

⚠️ **Misleading:**
- Gallery system exists but lacks bilingual support for captions
- Favorites page exists but data is local-only (no user account persistence)
- Cart exists but checkout flow may be incomplete

---

## 8. Critical Risks Before Further Frontend Work

### 8.1 High-Risk Areas

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Hardcoded content** | Location address, CTA text hardcoded | Move to admin-editable content or translations |
| **localStorage-only persistence** | Favorites/Cart lost on device clear | Consider DB-backed user accounts |
| **ET-only content** | Gallery captions, feedback in Estonian only | Add bilingual fields if needed |
| **External image dependencies** | Unsplash fallback images | Self-host or use CDN |

### 8.2 Data Source Awareness

⚠️ **Must Not Bypass:**
1. **Services** - Always fetch from `/api/services` (not hardcoded)
2. **Products** - Always fetch from `/api/products` (not hardcoded)
3. **Gallery** - Always fetch from `/api/gallery` (not hardcoded)
4. **Slots** - Always fetch from `/api/slots` (not hardcoded)
5. **Homepage Media** - Use `homepage_media` DB table
6. **Booking Content** - Use `booking_content` table for helper texts
7. **Translations** - Use i18n system, not hardcoded text

### 8.3 Admin-Editable Must-Stay

- All service details (name, price, duration, descriptions)
- Product catalog with images
- Gallery images and order
- Time slot availability
- Feedback/testimonials
- Homepage media assets

---

## 9. Recommended Next Steps

### 9.1 Immediate Actions (Before Redesign)

1. **Audit translation coverage** - Ensure all keys have both ET and EN
2. **Document hardcoded content locations** - For future admin-ability
3. **Test booking flow end-to-end** - Especially payment webhook handling
4. **Verify analytics tracking** - Ensure funnel data is accurate

### 9.2 Future Frontend Work Guidelines

1. **Always use existing API endpoints** - Don't bypass data layer
2. **Respect bilingual architecture** - Use `*Et`/`*En` fields for services/products
3. **Keep admin-editable content editable** - Don't hardcode what should be dynamic
4. **Test with both languages** - ET (default) and EN
5. **Use existing components** - Check `/components` before creating new ones

### 9.3 Architecture Cleanup Recommendations

1. **Migrate hardcoded content** - Location section → DB or i18n
2. **Add EN translations** - Gallery captions, feedback display
3. **Consider user accounts** - For favorites/cart persistence
4. **Database migrations** - Move from "ensure" pattern to proper migrations

---

## Appendix: File Reference Quick Map

### Key Files for Data Flow

| Purpose | File |
|---------|------|
| Database connection | [`src/lib/db.ts`](src/lib/db.ts) |
| Services data | [`src/lib/catalog.ts`](src/lib/catalog.ts) |
| Slots management | [`src/lib/slots.ts`](src/lib/slots.ts) |
| Bookings CRUD | [`src/lib/bookings.ts`](src/lib/bookings.ts) |
| Customers | [`src/lib/customers.ts`](src/lib/customers.ts) |
| Gallery | [`src/lib/gallery.ts`](src/lib/gallery.ts) |
| Homepage media | [`src/lib/homepage-media.ts`](src/lib/homepage-media.ts) |
| Booking content | [`src/lib/booking-content.ts`](src/lib/booking-content.ts) |
| Analytics | [`src/lib/analytics.ts`](src/lib/analytics.ts) |
| i18n system | [`src/lib/i18n/index.tsx`](src/lib/i18n/index.tsx) |
| Translations ET | [`src/lib/i18n/et.json`](src/lib/i18n/et.json) |
| Translations EN | [`src/lib/i18n/en.json`](src/lib/i18n/en.json) |

### API Routes Summary

| Endpoint | Purpose |
|----------|---------|
| `/api/services` | Get services list |
| `/api/products` | Get products list |
| `/api/gallery` | Get gallery images |
| `/api/slots` | Get available time slots |
| `/api/bookings` | Create/manage bookings |
| `/api/booking-addons` | Get add-ons |
| `/api/booking-content` | Get booking helper texts |
| `/api/feedback` | Get testimonials |
| `/api/stripe/*` | Payment processing |

---

*End of Audit Report*
