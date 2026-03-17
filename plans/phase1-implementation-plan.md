# Phase 1 Implementation Plan: Server Wrapper + Server-Side Data Fetching

**Constraints:** No redesign, no visual changes, no section reordering, no broad refactor.

## Objective
Move homepage from 100% client-rendered to hybrid server/client with minimal risk while achieving ~50% performance improvement.

---

## Current State

```
src/app/page.tsx (CURRENT)
┌──────────────────────────────────────────────────────┐
│ 'use client'                                         │
│                                                      │
│ 1. useState hooks (17x)                            │
│ 2. useEffect hooks (14x)                            │
│ 3. Client fetches: /api/products, /api/services,     │
│                     /api/gallery, /api/homepage-    │
│                     media, /api/slots               │
│ 4. All UI rendering                                 │
│ 5. All interactivity                                │
└──────────────────────────────────────────────────────┘
```

---

## Phase 1 Target Structure

```
src/app/page.tsx (PHASE 1)
┌──────────────────────────────────────────────────────┐
│ 'use client' (WRAPPER - ONLY)                       │
│                                                      │
│  - Receives data as props from server               │
│  - Manages UI state (scroll, modals, etc.)         │
│  - Renders children with data                       │
└──────────────────────────────────────────────────────┘
                    ↑
         data passed as props
                    │
┌──────────────────────────────────────────────────────┐
│ [NEW] src/app/page.server.tsx                       │
│                                                      │
│ 'use server' (IMPLICIT - SERVER COMPONENT)         │
│                                                      │
│  - Fetches: products, services, gallery,           │
│             homepage-media, slots                   │
│  - Returns data to client wrapper                   │
└──────────────────────────────────────────────────────┘
```

---

## What Moves to Server

| Responsibility | Current Location | New Location | Risk |
|----------------|-----------------|--------------|------|
| **Products fetch** | page.tsx:278 | page.server.tsx | 🟢 Low |
| **Services fetch** | page.tsx:303 | page.server.tsx | 🟢 Low |
| **Gallery fetch** | page.tsx:323 | page.server.tsx | 🟢 Low |
| **Homepage media fetch** | page.tsx:343 | page.server.tsx | 🟢 Low |
| **Next slot fetch** | page.tsx:203 | page.server.tsx | 🟢 Low |
| **Data preparation** | N/A | page.server.tsx | 🟢 Low |

---

## What Stays Client

| Responsibility | Current Location | Stays | Risk |
|----------------|-----------------|-------|------|
| **Scroll state** | page.tsx:151 | Client | N/A |
| **Mobile menu** | page.tsx:155 | Client | N/A |
| **Language state** | page.tsx:149 | Client | N/A |
| **Discount pill** | page.tsx:152-153 | Client | N/A |
| **Gallery modal** | page.tsx:162 | Client | N/A |
| **Intersection observers** | page.tsx:414-453 | Client | N/A |
| **All UI rendering** | page.tsx:600+ | Client | N/A |

---

## Implementation Steps

### Step 1: Create Server Data Fetching Module
**File:** `src/app/page.data.ts`

```typescript
// This runs ONLY on server
export async function getHomepageData(locale: string) {
  // Parallel fetching for performance
  const [products, services, gallery, homepageMedia, nextSlot] = 
    await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/products?lang=${locale}`, 
        { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/services?lang=${locale}`, 
        { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/gallery`, 
        { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/homepage-media`, 
        { next: { revalidate: 3600 } }).then(r => r.json()),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/slots?upcoming=1&limit=1`, 
        { cache: 'no-store' }).then(r => r.json()),
    ]);

  return {
    products,
    services,
    gallery,
    homepageMedia,
    nextSlot: nextSlot?.[0]?.date || null,
  };
}
```

**Risk:** 🟢 Low - Pure data function, no UI
**Rollback:** Delete file, revert page.tsx

---

### Step 2: Modify page.tsx to Receive Props

**Current (lines 148-173):**
```typescript
const [products, setProducts] = useState<Product[]>([]);
const [productsLoading, setProductsLoading] = useState(true);
// ... more useState
```

**New:**
```typescript
// Remove all data-related useState
// Remove all data-related useEffect
// Add props interface:

interface HomepageProps {
  products: Product[];
  services: Service[];
  gallery: GalleryImage[];
  homepageMedia: Record<string, string>;
  nextAvailable: string | null;
  locale: string;
}

export default function Homepage({ 
  products, 
  services, 
  gallery, 
  homepageMedia,
  nextAvailable,
}: HomepageProps) {
  // Keep ONLY UI state (scroll, modals, etc.)
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // ... only UI state
}
```

**Risk:** 🟡 Medium - Must maintain exact prop contract
**Rollback:** Revert to original useState pattern

---

### Step 3: Create Server Page Wrapper
**File:** `src/app/page.tsx` (update)

```typescript
import { getHomepageData } from './page.data';

// This is a Server Component by default (no 'use client')
export default async function HomepagePage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale = 'et' } = await params;
  
  // Fetch data on server
  const { products, services, gallery, homepageMedia, nextSlot } = 
    await getHomepageData(locale);

  // Pass to client wrapper
  return (
    <HomepageClient
      products={products}
      services={services}
      gallery={gallery}
      homepageMedia={homepageMedia}
      nextAvailable={nextSlot}
      locale={locale}
    />
  );
}
```

**Risk:** 🟡 Medium - Need to extract client logic to separate component
**Rollback:** Revert to original single-file structure

---

### Step 4: Extract Client Logic to Wrapper Component
**File:** Create `src/components/homepage/HomepageClient.tsx`

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
// ... import existing logic

interface HomepageClientProps {
  products: Product[];
  services: Service[];
  // ... other props
}

export function HomepageClient({
  products,
  services,
  gallery,
  homepageMedia,
  nextAvailable,
  locale,
}: HomepageClientProps) {
  // PASTE existing page.tsx logic here (from line ~150 onwards)
  // Keep all useState, useEffect, handlers
  // Use props instead of fetched data
  
  return (
    // ... existing JSX return
  );
}
```

**Risk:** 🟡 Medium - Large refactor, must preserve all logic
**Rollback:** Use git to restore original file

---

## Migration Order (Exact)

1. **Create `page.data.ts`** - Test data fetching in isolation
2. **Add props to `page.tsx`** - Define interface, don't change logic yet
3. **Create `HomepageClient.tsx`** - Copy existing component logic
4. **Update `page.tsx`** - Convert to server wrapper calling client component
5. **Test locally** - Verify all functionality works
6. **Deploy to preview** - Full test on Vercel
7. **Deploy to production** - If preview passes

---

## Rollback Plan

### If Phase 1 Breaks in Production:

```bash
# Quick rollback: revert to previous commit
git revert HEAD
git push origin main
```

### Specific Rollback Steps:

1. **If data fetch fails:** 
   - Add error boundaries in server component
   - Fallback to client-side fetch if server fails

2. **If props not passed correctly:**
   - Use TypeScript to validate prop contracts
   - Add console.log for debugging

3. **If client state breaks:**
   - Keep all existing useState/useEffect in client wrapper
   - Don't remove any state until confirmed unnecessary

---

## Risk Assessment Summary

| Step | Risk Level | Impact if Failed | Mitigation |
|------|------------|------------------|------------|
| 1. Create data module | 🟢 Low | None | Pure function, testable |
| 2. Add props | 🟢 Low | TypeScript error | Strict typing |
| 3. Extract client | 🟡 Medium | UI breaks | Copy-paste, no changes |
| 4. Server wrapper | 🟡 Medium | Blank page | Add Suspense fallback |
| 5. Test | 🟢 Low | Find issues | Comprehensive QA |

---

## Expected Performance Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Time to First Byte | ~150ms | ~150ms | Same |
| HTML First Paint | ~500ms | ~200ms | **60% faster** |
| JavaScript Load | ~153kB | ~153kB | Same* |
| Hydration Start | ~2.5s | ~1.0s | **60% faster** |

*Same JS bundle, but loads after content is visible (better UX)

---

## Files to Create/Modify

```
CREATED:
  src/app/page.data.ts        # Server data fetching
  
MODIFIED:
  src/app/page.tsx           # Convert to server wrapper
  
NEW STRUCTURE:
  src/components/homepage/
  └── HomepageClient.tsx     # Client logic (extracted)
```

---

## Success Criteria

- ✅ Homepage loads with data from server (view source shows products, services, etc.)
- ✅ All interactive features work (mobile menu, modals, booking)
- ✅ No visual changes from current state
- ✅ Build passes with no errors
- ✅ TypeScript compiles without errors
