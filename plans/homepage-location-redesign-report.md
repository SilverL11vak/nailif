# Homepage Local Trust / Visit Us — Redesign Report

## 1. Layout replaced

- **Previous:** Horizontal 2-column layout that felt like a banner:
  - **Left:** Google Maps iframe in a rounded rectangle with border.
  - **Right:** One combined card — salon image on top, then a single block below with eyebrow (“Studio preview”), title, subtitle, preview text, and two buttons (Book now, Get directions). No location feature badges. The right column was a single rounded rectangle card (image + content in one box), which read as a banner-style block.

- **Removed:** The map-from-left + single-card-right composition and the “one big rounded card” treatment. No more banner-style rounded rectangle wrapping the whole right column.

---

## 2. New structure implemented

- **Desktop (2-column editorial):**
  - **Left column (visual anchor):** One large editorial image from homepage media (`location_studio` → `team_portrait` → `hero_main`). Rounded corners (`rounded-2xl`), strong shadow (`shadow-xl`), aspect ratio ~4/3 (lg: 5/4). Bottom gradient overlay for readability. Optional floating label using `t('location.mustamae')` (e.g. “Mustamäe, Tallinn”). Subtle hover zoom on image (`group-hover:scale-[1.02]`). If no media URL is available, a neutral placeholder block is shown (no hardcoded image).
  - **Right column (content block):** Small uppercase eyebrow from `t('homepage.localAuthority.eyebrow')` (“Local trust”). Large heading from `t('homepage.location.title')`, supporting paragraph from `t('homepage.location.subtitle')` and `t('homepage.location.previewText')`. Four **location feature chips** (no pills): soft rectangular chips with icon + text (`badge1`–`badge4`), more padding, light border and glass-style background, 2×2 grid. Primary CTA: “Get directions” (existing maps link). Secondary ghost-style CTA: “Book visit” (`t('nav.bookNow')`).

- **Mobile (stacked):** Same content in one column: image first (order-2 in DOM so it appears below on small screens when using order-1 for content), then heading, paragraph, chips in a 2-per-row grid, then full-width CTAs. Generous vertical spacing (`gap-12`, `mt-8`, `mt-10`).

- **Section container:** Subtle background (`bg-slate-50/60`) to differentiate from pure white and avoid a “pink boxed banner” feel. Same `sectionClass` and `contentMax` as rest of homepage.

---

## 3. Components changed or created

- **Changed:** Only `src/app/page.tsx`:
  - **State/ref:** Added `locationInView` and `locationSectionRef` for scroll-triggered fade-in.
  - **Effect:** New `IntersectionObserver` on the location section to set `locationInView` (with `prefers-reduced-motion` respected: no animation when reduced motion is preferred).
  - **Imports:** Added `MapPin`, `Clock`, `Car`, `Building2` from `lucide-react` for the chips.
  - **Markup:** The whole “9. LOCATION + HOURS” block was replaced with the new “9. LOCAL TRUST / VISIT US” editorial layout (left image block, right content block, chips, CTAs). No new separate React components; everything lives in the page.

- **Created:** None. All markup is inline in `page.tsx`.

---

## 4. Content source-of-truth (media keys and translations)

- **Translations (all content still from `t()`):**
  - Eyebrow: `t('homepage.localAuthority.eyebrow')`
  - Title: `t('homepage.location.title')`
  - Subtitle: `t('homepage.location.subtitle')`
  - Supporting text: `t('homepage.location.previewText')`
  - Chips: `t('homepage.location.badge1')` … `t('homepage.location.badge4')`
  - Floating label: `t('location.mustamae')`
  - Primary CTA: `t('location.getDirections')`
  - Secondary CTA: `t('nav.bookNow')`
  - Image alt: `t('homepage.location.mapTitle')`
  - Placeholder when no image: `t('homepage.location.previewEyebrow')`

- **Images:** Still from `media()` only: `media('location_studio')`, then `media('team_portrait')`, then `media('hero_main')`. No new homepage-media keys, no hardcoded image URLs. If all are empty, a text placeholder is shown using the translation above.

- **Links/actions:** “Get directions” still uses the same Google Maps URL as before (functional link, not display copy). Book CTA uses `router.push(localizePath('/book'))` (i18n-safe).

- **No changes:** Database schema, homepage-media keys, API routes, or i18n usage. No fake or placeholder content beyond the existing translation and media keys.

---

## Success criteria (brief check)

- Section no longer looks like a horizontal banner; it is a clear 2-column editorial block (image-led left, content right).
- Stronger visual hierarchy: eyebrow → title → body → chips → CTAs.
- Location feels more credible and visit-worthy via large image, trust eyebrow, and feature chips.
- Layout is clearly different from the previous map + single-card layout.
- Content remains driven entirely by existing media keys and translations; mobile layout is stacked and spaced for a premium, breathable feel.
