# Nailify – Admin Panel Simplification – Implementation Report

**Date:** 2025-03-17  
**Scope:** Aggressive simplification of admin information architecture and UI; all business-critical functionality preserved.

---

## 1. Admin sections KEPT (unchanged capability)

| Section | Route | Purpose |
|--------|--------|--------|
| **Teenused** | `/admin/services` | Manage services (name, description, price, duration, image, active, sort). Homepage “Meie teenused” reflects this. |
| **Tooted** | `/admin/products` | Manage products (name, description, price, image, stock, active, sort). |
| **Galerii** | `/admin/gallery` | Manage gallery / “Meie töö” images. |
| **Tagasiside** | `/admin/feedback` | Create, edit, delete, sort, publish/unpublish client feedback. |
| **Avalehe pildid** | `/admin/homepage-media` | Hero, team (specialist), location images. |
| **Broneerimise tekstid ja lisateenused** | `/admin/booking` | Booking step texts (ET/EN), add-on services (name, price, duration, active, sort), loader texts, sticky CTA; preview. |
| **Vabad ajad** | `/admin/slots` | Calendar, free slots, SOS. |
| **Broneeringud** | `/admin/bookings` | View, search, edit, delete bookings; view details; status. |
| **Tellimused** | `/admin/orders` | View, search orders; order/payment state. |
| **Konto** | `/admin/account` | Profile, security, password. |

No CRUD, APIs, or booking/order logic were changed. Homepage content ownership and source-of-truth are unchanged.

---

## 2. Admin sections REMOVED / HIDDEN / CONSOLIDATED

| Previous | Change |
|----------|--------|
| **“Command Deck” + 4 card groups (Sisu, Broneerimine, Operatsioonid, Seaded)** | Replaced by one main column with 3 groups: **Sisu**, **Broneerimine**, **Seaded**. Same links, fewer labels and less duplication. |
| **Left sidebar** (“Operatsioonid täna”, “Kiired soovitused”) | Removed. “Tänased broneeringud” is now a single block on the main dashboard when there are today’s bookings, with link to full list. |
| **Right sidebar** (“Järgmine klient”, “Finantsplokk”, “Süsteemi maht”) | Removed to reduce clutter. Metrics (bookings today, free slots, revenue today) remain in the header chips. |
| **Extra metric chips** (SOS count, trend) | Reduced to 3 chips: Broneeringud täna, Vabad ajad, Käive täna. |
| **“Bookingu sisu haldus”** (technical name) | Renamed to **“Broneerimise tekstid ja lisateenused”**. Sectors reordered: **Tekstid** → **Lisateenused** → **Laadimise tekstid** → **Eelvaade**. Loader and Preview kept but with clearer, non-technical labels. |
| **Quick actions** (4 mixed items) | Simplified to 4 clear items: Broneeringud, Vabad ajad, Broneerimise tekstid, Avaleht. |

No routes were deleted. No data models or APIs were removed.

---

## 3. Files changed

| File | Changes |
|------|--------|
| `src/app/admin/page.tsx` | Rewritten: single-column layout; header with title “Halduspaneel”, 3 metric chips, search, logout; optional “Tänased broneeringud” block; 3 groups (Sisu with 5 links, Broneerimine with 4 links, Seaded with 1 link). Removed left/right sidebars and extra metrics. |
| `src/components/admin/AdminQuickActions.tsx` | Replaced with 4 quick links (Broneeringud, Vabad ajad, Broneerimise tekstid, Avaleht) and design-system classes. |
| `src/app/admin/booking/page.tsx` | Title set to “Broneerimise tekstid ja lisateenused”; back links to Halduspaneel and Broneeringud; sector order: Tekstid, Lisateenused, Laadimise tekstid, Eelvaade; labels made non-technical; header and sector buttons use admin design-system classes. |
| `src/app/api/admin/search/route.ts` | Bookings search fixed to use schema: contact_*, slot_*; orders to use amount_total. Response shape unchanged. |

---

## 4. Route redirects

**None added.** All existing routes are unchanged:

- `/admin` – dashboard  
- `/admin/login` – login  
- `/admin/services` – services  
- `/admin/products` – products  
- `/admin/gallery` – gallery  
- `/admin/feedback` – feedback  
- `/admin/homepage-media` – homepage media (hero, team, location)  
- `/admin/booking` – booking content + add-ons + loader + preview  
- `/admin/slots` – slots/calendar  
- `/admin/bookings` – bookings list  
- `/admin/orders` – orders  
- `/admin/account` – account  

All in-page links (e.g. “Halduspaneel”) already point to `/admin`; no redirects were required.

---

## 5. Confirmation: bookings, orders, services, products, gallery

- **Bookings:** `/admin/bookings` unchanged. View, search, edit, delete, details, status still work.  
- **Orders:** `/admin/orders` unchanged. View, search, order/payment state unchanged.  
- **Services:** `/admin/services` unchanged. Homepage “Meie teenused” still uses services from API.  
- **Products:** `/admin/products` unchanged.  
- **Gallery:** `/admin/gallery` unchanged.  
- **Add-ons:** Still managed under `/admin/booking` → sector “Lisateenused”.  
- **Booking content / sticky CTA:** Still under `/admin/booking` (Tekstid, Laadimise tekstid, Eelvaade).  

Database, API contracts, and source-of-truth logic are unchanged.

---

## 6. Confirmation: homepage-important content still editable

| Content | Where to edit |
|---------|----------------|
| Services (“Meie teenused”) | `/admin/services` |
| Products (shop + homepage block) | `/admin/products` |
| Gallery (“Meie töö”) | `/admin/gallery` |
| Add-on services (homepage + booking) | `/admin/booking` → Lisateenused |
| Specialist/team images | `/admin/homepage-media` (team section) |
| Client feedback | `/admin/feedback` |
| Visit us / location images | `/admin/homepage-media` (location section) |
| Hero image | `/admin/homepage-media` (hero) |
| How it works / contact text | i18n (et.json / en.json); booking_content for step texts. Sticky CTA and step texts in `/admin/booking` → Tekstid. |
| Sticky CTA / booking CTA | `/admin/booking` → Tekstid (sticky_cta_*) and Eelvaade |

All listed content remains editable; no ownership or data flow was changed.

---

## 7. Search

- **Global admin search** is in the dashboard header (`AdminSearch`).  
- Placeholder: “Otsi teenuseid, tooteid, broneeringuid…”  
- Shortcut: Ctrl+K / Cmd+K.  
- API: `/api/admin/search` (services, products, bookings, orders, gallery, feedback).  
- No changes to search API or component in this task.

---

## 8. Follow-up recommendations

1. **Search API:** Bookings and orders search were updated to match the real DB schema (contact_* and slot_* for bookings, amount_total for orders). Response shape for the frontend is unchanged.  
2. **Specialist / visit us / how it works / contact:** These are currently i18n or single “Avalehe pildid” media. If the business wants dedicated “Specialist card”, “Visit us”, “How it works”, “Contact” editors, add them as separate admin pages or sub-sections and wire to existing or new APIs without changing current content ownership.  
3. **Mobile:** Dashboard and quick actions are responsive; subpages (services, products, bookings, etc.) were not changed. A later pass could add a compact admin nav (e.g. hamburger) on small screens if needed.

---

**Summary:** The admin dashboard is reduced to one main column with three groups (Sisu, Broneerimine, Seaded), clearer labels, and no left/right sidebars. All important sections (bookings, orders, services, products, gallery, feedback, homepage media, booking content and add-ons, slots, account) are still available and work as before. Renaming and reordering (e.g. booking page sectors) make the panel easier to use for a non-technical salon owner without removing or breaking any business-critical functionality.
