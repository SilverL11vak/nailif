# Booking flow + homepage data integrity – audit and fix report

## 1. Issues found

### Slot availability
- **Risk (mitigated):** Homepage banner and hero widget each fetch slots separately (homepage: `/api/slots?upcoming=1&limit=1`, widget: `limit=6`). Both use `listUpcomingAvailableSlots`, which returns only `available = TRUE` slots, so they share the same source of truth. One edge case was possible: if the API ever returned a slot with `available: false`, the banner could still show it. **Fix:** Homepage next-slot logic now only sets “next available” when `slot.available !== false`.

### Services
- **Fallback key leakage:** When a service had no `resultDescription` / `suitabilityNote` / `longevityDescription`, the UI used `t(\`homepage.serviceDecision.fallback.${service.id}.result\`)` (and `.suitability`, `.longevity`). For service IDs not present in the JSON (e.g. new admin-created services), the raw key (e.g. `homepage.serviceDecision.fallback.nail-art.result`) could appear in the UI. **Fix:** Introduced `getServiceFallback(serviceId, kind, genericFallback)` that uses the dynamic key when it exists in i18n and otherwise returns a safe generic string (ET/EN), so no keys are shown.
- **Duplicate “Meie teenused” / services block:** A second, full services block lived in a section with `id="services-media"` and `className="hidden"`. It duplicated the visible `#services` section and could have caused confusion or duplicate content if ever shown. **Fix:** The entire hidden `#services-media` section was removed so there is a single services section and a single “Meie teenused” block.

### Add-ons
- **Homepage not using DB:** The add-ons block on the homepage used a hardcoded list (labels and prices from i18n + fixed “+EUR 12”, “+15 min”, etc.). The booking flow already used `/api/booking-addons` (DB). **Fix:** Homepage now fetches `/api/booking-addons?lang=...` and renders the returned add-ons (name, price, duration). If the API returns none, it shows a single CTA: “Lisateenused broneerimisel” / “Add-ons available when you book”.

### Products, gallery, feedback
- **Verified:** Homepage already uses only API data: `/api/products`, `/api/gallery`, `/api/feedback?visible=1`, `/api/homepage-media`. No hardcoded product/gallery/feedback lists are used on the homepage. Products use `productSource = products` (from state filled by API). Catalog’s `listProducts` / `listServices` use `WHERE active = TRUE` and no client-side fallback to default arrays for the public homepage.

### Specialist / visit us / how it works / contact / sticky CTA
- **Verified:** These use `t()` / `getI18nTextOrFallback()` for copy and `media(key)` for images/URLs from `homepageMedia` (filled by `/api/homepage-media`). No duplicate or conflicting source was found; they are consistent with the intended i18n + admin homepage-media source.

---

## 2. Files changed

| File | Change |
|------|--------|
| `src/app/page.tsx` | (1) Added `getServiceFallback(serviceId, kind, genericFallback)` and replaced all dynamic `t(\`homepage.serviceDecision.fallback.${...}.result/suitability/longevity\`)` usages so missing keys never leak. (2) Next-slot logic: only set `nextAvailable` when `slot.available !== false` and response type includes `available`. (3) Added `homepageAddOns` state and `useEffect` to fetch `/api/booking-addons?lang=${language}`; add-ons section now renders from that list (name, +€price, +duration min) or a single CTA when empty. (4) Removed the entire hidden section `#services-media` (duplicate services block). |

No changes were made to: API routes, DB schema, Stripe/payment/order logic, admin CRUD, `lib/slots.ts`, `lib/catalog.ts`, `lib/booking-content.ts`, or booking flow steps.

---

## 3. Booking-flow bugs fixed

- **Slot consistency:** Homepage “next available” and hero widget both rely on the same API (`listUpcomingAvailableSlots` → only available slots). The homepage display is now defensive so it never shows a slot when `available === false`.
- **Add-ons consistency:** Homepage add-ons and booking add-ons now both come from the same source: `/api/booking-addons` (DB/admin). Homepage no longer shows a fixed list that could diverge from what’s available in the booking flow.

---

## 4. Duplicate / fallback / untranslated content removed

- **Removed:** Hidden duplicate services section (`#services-media`), eliminating a full duplicate of “Meie teenused” and service cards.
- **Stopped leaking:** Service result/suitability/longevity text no longer falls back to raw i18n keys when a service ID is missing from `homepage.serviceDecision.fallback.*`; generic ET/EN strings are used instead.
- **Replaced:** Hardcoded add-ons list on the homepage with API-driven list; when there are no add-ons, a single CTA is shown instead of fake items.

---

## 5. Confirmation: source of truth

- **Free spots / next slot:** From `listUpcomingAvailableSlots()` (DB). Homepage and widget both use this via `/api/slots?upcoming=1`; homepage only shows the slot when `available !== false`.
- **Services:** From `listServices(locale)` (DB, active only). Homepage and booking use `/api/services`; no mock or default list on the client.
- **Add-ons:** From `listBookingAddOns(locale)` (DB, active only). Homepage and booking use `/api/booking-addons`; homepage section now uses this response only.
- **Products:** From `listProducts(activeOnly, locale)` (DB). Homepage uses `/api/products`; no default product array used on the client for the homepage.
- **Gallery:** From `listGalleryImages()` (DB). Homepage uses `/api/gallery`.
- **Feedback:** From feedback API with `visible=1`. Homepage uses `/api/feedback?visible=1`.
- **Homepage media (specialist, visit, CTA, etc.):** From `listHomepageMedia()` (DB). Homepage uses `/api/homepage-media` and `media(key)`.

---

## 6. Remaining risks and recommendations

- **useBookingAddOns fallback:** The hook still uses a hardcoded `fallbackAddOns` list when the add-ons API fails. That keeps the booking flow usable if the API is down but means users could see add-ons that are not in the DB. Consider logging and/or showing an “Add-ons temporarily unavailable” state instead of silent fallback.
- **Homepage fully client-fetched:** All homepage data (services, products, gallery, feedback, add-ons, slots, homepage-media) is loaded in the client with `useEffect`. That can cause a short period of empty or loading state and extra requests. A future improvement could be to feed some of this from server-side `getHomepageDataCached` (or similar) so the first paint has data and stays in sync with the same APIs.
- **i18n keys:** Ensure all `t('...')` keys used on the homepage exist in `et.json` / `en.json` (e.g. `homepage.addons.*`, `services.title`, `services.subtitle`) so no other keys leak. `getI18nTextOrFallback` is used where a fallback is intended.

---

## Summary

- Slot display is aligned and defensive; services no longer leak fallback keys or show a duplicate block; add-ons on the homepage now come from the same DB as the booking flow; products, gallery, feedback, and homepage media were confirmed to use API/DB only. No changes were made to payment, DB schema, or admin CRUD.
