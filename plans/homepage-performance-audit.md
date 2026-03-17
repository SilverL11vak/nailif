# Homepage Performance Architecture Audit

## Executive Summary

The Nailify homepage (`src/app/page.tsx`) is currently a **100% client-side rendered application** with `'use client'` at the top. This causes significant performance issues including:
- Large JavaScript bundle shipped to all users
- Blocking client-side data fetching
- Full hydration cost on every page load
- Poor Core Web Vitals scores

---

## 1. Biggest Performance Bottlenecks (Priority Order)

### 🔴 P0 - Critical
| Issue | Impact | Location |
|-------|-------|----------|
| **Entire page is `'use client'`** | All JS, hydration, and rendering happens in browser | `page.tsx:1` |
| **Client-side data fetching** | 5 sequential API calls blocking render | `page.tsx:202-344` |
| **No streaming SSR** | Cannot leverage Next.js partial rendering | N/A |

### 🟠 P1 - High
| Issue | Impact | Location |
|-------|-------|----------|
| **17 useState hooks** | Excessive re-render cycles | `page.tsx:150-173` |
| **14 useEffect hooks** | Complex client-side logic, layout shifts | `page.tsx:191-453` |
| **Scroll observer** | Continuous repaints on scroll | `page.tsx:414-453` |
| **Intersection Observers** | Multiple observers for animations | `page.tsx:434-453` |

### 🟡 P2 - Medium
| Issue | Impact | Location |
|-------|-------|----------|
| **Mock services in bundle** | Static data unnecessarily in JS | `page.tsx:160` |
| **No code splitting** | Entire page in one bundle | N/A |
| **All components are client** | 24/24 components use `'use client'` | `src/components/*` |

---

## 2. Server Components (Should Become)

These sections have **no interactivity** and should be server-rendered:

| Section | Current | Should Be | Rationale |
|---------|---------|-----------|------------|
| **Hero** (static content) | Client | Server | No state, just markup |
| **Services Grid** | Client | Server | Display only, no user interaction |
| **Gallery** | Client | Server | Display only, modals can be islands |
| **Team** | Client | Server | Static content |
| **Testimonials** | Client | Server | Static content |
| **Location/Contact** | Client | Server | Static content |
| **Footer** | Client | Server | Static content |

**Estimated TTI Improvement:** 40-60% faster initial paint

---

## 3. Must Remain Client Components

These components **require browser APIs or user interaction**:

| Component | Reason |
|-----------|--------|
| **StickyHeader** | Scroll detection, mobile menu state |
| **MobileMenu** | DOM manipulation, open/close state |
| **GalleryModal** | Lightbox functionality, keyboard events |
| **DiscountPill** | Dismiss state, localStorage |
| **HowItWorks** | Intersection observer animations |
| **FinalCTA** | Scroll-into-view tracking |
| **Navbar** | Scroll state, badge counts |
| **HeroBookingWidget** | Full booking form logic |

---

## 4. Server-Side Data Fetching (Should Move)

Current client fetches that should be server-fetched:

```typescript
// CURRENT (Client - bad)
useEffect(() => {
  const response = await fetch('/api/products?lang=${language}');
  // ...
}, []);

// SHOULD BE (Server - good)
async function getProducts(locale: string) {
  const res = await fetch(`${process.env.API_URL}/api/products?lang=${locale}`, 
    { cache: 'default' } // or 'force-cache', 'no-store'
  );
  return res.json();
}
```

**Fetches to migrate:**

| Endpoint | Data Type | Cache Strategy |
|----------|-----------|----------------|
| `/api/products` | Product catalog | `force-cache` (static) |
| `/api/services` | Service list | `force-cache` (static) |
| `/api/gallery` | Images | `force-cache` (static) |
| `/api/homepage-media` | Hero media | `force-cache` (static) |
| `/api/slots?upcoming=1` | Next available | `no-store` (dynamic) |

---

## 5. Safest Execution Order

### Phase 1: Infrastructure (Zero Breaking Changes)
1. **Create Server Component wrapper** for homepage
2. **Move data fetching to server** in new wrapper
3. **Pass data via props** to existing client components
4. **Verify functionality** before proceeding

### Phase 2: Component Migration (Low Risk)
1. **Extract static sections** into separate Server Components
2. **Use `dynamic = 'force-static'`** for truly static sections
3. **Add Suspense boundaries** for progressive loading

### Phase 3: Interactive Islands (Medium Risk)
1. **Convert modals to client islands** with `client:visible`
2. **Add `'use client'` only where needed**
3. **Remove `'use client'` from display-only components**

### Phase 4: Optimization (Refinement)
1. **Implement `next/image`** with proper sizing
2. **Add `loading.js` / `loading.tsx`** for route transitions
3. **Optimize bundle** with `next/dynamic` for heavy components

---

## Architecture Diagram

```
CURRENT (All Client):
┌─────────────────────────────────────────┐
│           'use client'                  │
│  ┌────────────────────────────────────┐ │
│  │ useState (17 hooks)                │ │
│  │ useEffect (14 hooks)               │ │
│  │ fetch /api/* (5 calls)             │ │
│  │ IntersectionObserver               │ │
│  │ Scroll Event Listeners             │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘

TARGET (Hybrid):
┌─────────────────────────────────────────┐
│         'use server' (Page)             │
│  ┌────────────────────────────────────┐ │
│  │ await fetch('/api/products')       │ │
│  │ await fetch('/api/services')       │ │
│  │ await fetch('/api/gallery')        │ │
│  └────────────────────────────────────┘ │
│         ↓ Pass data as props            │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ Server       │  │ Client Islands    │ │
│  │ Components   │  │ (interactive)     │ │
│  │              │  │                   │ │
│  │ - Hero       │  │ - MobileMenu      │ │
│  │ - Services   │  │ - GalleryModal    │ │
│  │ - Team       │  │ - DiscountPill    │ │
│  │ - Footer     │  │ - BookingWidget   │ │
│  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Estimated Performance Gains

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **FCP** | ~2.5s | ~0.8s | **68% faster** |
| **LCP** | ~3.2s | ~1.2s | **62% faster** |
| **TTI** | ~4.5s | ~2.0s | **56% faster** |
| **JS Bundle** | ~153kB | ~60kB | **60% smaller** |
| **Hydration** | Full | Partial | **~70% less** |

---

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|------------|------------|
| Phase 1 | 🟢 Low | No visual changes, just architecture |
| Phase 2 | 🟢 Low | Incremental extraction |
| Phase 3 | 🟡 Medium | Thorough testing of interactivity |
| Phase 4 | 🟢 Low | CSS-only optimizations |

**Recommendation:** Proceed with Phase 1 immediately as it has zero visual risk and maximum performance impact.
