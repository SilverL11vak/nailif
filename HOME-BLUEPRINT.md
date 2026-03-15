# Nailify Homepage Redesign Blueprint
# Inspired by Hairtemplate Home V3

## 1. Final Homepage Section Order

The homepage follows this order (top to bottom):

1. **Sticky Header** - Bright white, booking CTA visible
2. **Hero Section** - Editorial image + booking widget above fold
3. **Trust/Proof Strip** - 4 quick stats
4. **Services Section** - Premium service cards
5. **How It Works** - 3-step booking process
6. **Gallery Section** - Curated 6-image grid
7. **Signature Upgrades** - Add-ons cards
8. **Team Section** - Technician profiles
9. **Location/Hours** - Address + directions
10. **Aftercare + Gift Cards** - Supportive section
11. **Final CTA** - Strong booking CTA
12. **Footer** - Clean premium footer

---

## 2. Section Purpose Descriptions

### Sticky Header
- Keeps booking CTA always accessible
- Shows "Next available" live text
- Maintains brand visibility on scroll

### Hero Section
- Primary conversion section
- Editorial visual on left (desktop)
- Booking widget on right (desktop)
- Sticky positioning for quick access

### Trust/Proof Strip
- Quick social proof: rating, appointments, hygiene, products
- Reduces hesitation immediately after hero

### Services Section
- Showcases signature treatments
- Each card supports quick booking
- Visual-first premium presentation

### How It Works
- Simple 3-step explanation
- Reduces booking anxiety
- Sets expectations

### Gallery Section
- Quality proof through curated images
- Supports booking confidence
- 6-image editorial grid

### Signature Upgrades
- Increases average order value
- Shows add-on options before booking
- Supports upselling naturally

### Team Section
- Humanizes the salon
- Builds trust through expertise display
- Compact, not overwhelming

### Location Section
- Reduces hesitation about visit
- Shows accessibility
- Combined with booking CTA

### Aftercare + Gift Cards
- Supportive post-service content
- Gift cards as conversion opportunity

### Final CTA
- Last chance booking encouragement
- Strong visual closure

---

## 3. Desktop Layout Guidance

### Grid System
- Max-width: 1280px (7xl)
- Centered container with generous side padding
- 12-column grid for complex layouts

### Spacing System
- Section padding: py-20 lg:py-28 (80px-112px desktop)
- Component gaps: gap-6 to gap-12
- Generous whitespace between sections

### Visual Hierarchy
- Primary: Large editorial images (4:3 or 16:10 aspect)
- Secondary: Service cards (moderate imagery)
- Tertiary: Trust stats, CTAs

---

## 4. Mobile Layout Guidance

### Header
- Logo left, Book Now button right
- Hidden nav links (accessible via hamburger if needed)
- Compact height: h-16

### Hero
- Image on top
- Booking widget below image
- Single column stack
- Height: NOT too tall - keep booking visible

### Sections
- Single column stack
- Reduced padding: py-12 to py-16
- Cards: full-width or 2-column

### Sticky CTA
- Remains visible on mobile
- Fixed bottom position

---

## 5. Hero Section Composition Rules

### Desktop (lg: breakpoint and up)
- **Layout**: 2-column grid, 7fr + 5fr ratio
- **Left**: Editorial image (aspect 4:3 desktop)
- **Right**: Booking widget (sticky)
- **Vertical space**: pt-28 to account for sticky header

### Mobile
- **Layout**: Single column
- **Order**: Image first, then booking
- **Key**: Ensure at least "Book Now" button visible above fold

### Content Elements
- Headline: Large (4xl-5xl), premium font weight
- Subheadline: Short, benefit-focused
- Trust badges: Minimal, positioned under headline

---

## 6. Booking Widget Placement Rules

### Above the Fold
- Booking widget MUST be visible without scrolling on desktop
- On mobile, at minimum "Book Now" button visible

### Sticky Behavior
- On desktop: Widget sticky to top after header
- Ensures constant booking access

### Widget Contents
- Service selector (dropdown)
- Date selector
- 3 visible time slots
- Primary "Book Now" CTA

---

## 7. Image Strategy Rules

### Hero Image
- Large editorial style (placeholder: gradient + decorative)
- Aspect ratio: 4:3 desktop, responsive on mobile
- Bright, warm, inviting

### Service Cards
- Medium images (aspect 4:3)
- Gradient backgrounds as fallback
- Hover effects for interactivity

### Gallery
- 6 curated images in 2x3 or 3x2 grid
- Aspect: square (1:1)
- Rounded corners (rounded-2xl)
- Subtle hover zoom

### Team
- Circular avatars (w-24 h-24)
- Warm gradient backgrounds

---

## 8. Content Hierarchy Rules

### Primary (Hero, CTAs)
- Largest typography
- Brand color (#D4A59A) for emphasis
- Clear visual weight

### Secondary (Section titles)
- Medium-large (2xl-3xl)
- Dark gray (#1f2937)

### Tertiary (Body, descriptions)
- Regular weight
- Gray-500 to Gray-600

### Trust Elements
- Small icons + text
- Green for positive signals

---

## 9. CTA Placement Rules

### Primary CTAs
- Hero: In booking widget
- Services: On each card
- Location: Two CTAs (Book + Directions)
- Final: Large prominent button

### CTA Styling
- Brand color background (#D4A59A)
- White text
- Rounded-full or rounded-xl
- Hover states with darker shade

### Secondary CTAs
- Outlined (border-2)
- Neutral gray border
- Used for non-booking actions

---

## 10. Trust Signal Placement

### Header
- "Next available" with live dot indicator

### Hero
- Trust badges under headline
- Rating, hygiene, client count

### Trust Strip
- Immediately after hero
- 4 key stats in row

### Throughout
- Service cards include "Popular" badges
- Team section shows expertise

---

## 11. Visual Tone Rules

### Color Palette
- Backgrounds: White (#FFFFFF), Cream (#FDFCFB), Blush (#FFF9F5)
- Primary: #D4A59A (warm rose)
- Text: Gray-900 (headings), Gray-500/600 (body)
- Accents: Green (trust), Amber (ratings)

### Typography
- Headlines: Sans-serif, semibold
- Body: Sans-serif, regular
- Hierarchy through size and weight, not different fonts

### Borders & Shadows
- Soft borders: border-gray-100
- Subtle shadows: shadow-lg, hover:shadow-xl
- Rounded corners: 2xl-3xl for premium feel

---

## 12. What to Remove from Current Homepage

1. **Dense information blocks** - Reduce text density
2. **Gray backgrounds** - Replace with white/cream
3. **Emoji-only service icons** - Add image placeholders
4. **Marketing-heavy copy** - Shorten to benefit statements
5. **Multiple CTAs per section** - One primary, one secondary max

---

## 13. What to Keep from Current Homepage

1. **Booking widget** - Core conversion element
2. **Service data** - Real names, prices, durations
3. **Location details** - Real address, hours
4. **Booking flow logic** - All backend interactions
5. **Fast booking entry** - Above-fold accessibility
6. **Sticky CTA for mobile** - Proven conversion tool
7. **Guided booking flow** - /book page works
8. **Success page** - Already optimized

---

## 14. What to Adapt from Home V3

### Visual Elements
1. **Bright backgrounds** - White/cream, not gray
2. **Large editorial images** - Hero and service cards
3. **Generous spacing** - py-20+ section padding
4. **Rounded corners** - 2xl-3xl for premium feel
5. **Soft shadows** - Not heavy, subtle elevation
6. **Card design** - Clean with subtle borders

### Layout Patterns
1. **Hero 2-column** - Image + booking side by side
2. **Trust strip** - Horizontal stats below hero
3. **Service grid** - 4-column on desktop
4. **Gallery grid** - Curated image collection
5. **Location split** - Info + visual side by side
6. **Footer columns** - Organized link groups

### UX Patterns
1. **Sticky header** - Always visible navigation
2. **Clear CTAs** - One primary action per section
3. **Trust signals** - Prominent but not overwhelming
4. **Progressive disclosure** - Essential info first

---

## 15. What NOT to Borrow from Home V3

1. **Hair-specific content** - Nail salon is different
2. **Dark hero backgrounds** - Keep Nailify light
3. **Marketplace layouts** - Single salon, not multi-vendor
4. **Complex pricing tables** - Simple service cards only
5. **Blog/news sections** - Not relevant for booking site
6. **Heavy video content** - Keep lightweight
7. **Multi-page navigation** - Keep simple, booking-focused

---

## Hero Section Specifics

### Composition (Desktop)
```
┌─────────────────────────────────────────┐
│  Header (sticky)                        │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────┐ ┌──────────────┐ │
│  │                  │ │  BOOKING     │ │
│  │  HERO IMAGE     │ │  WIDGET      │ │
│  │  (4:3 aspect)   │ │              │ │
│  │                  │ │  [Service]   │ │
│  │                  │ │  [Date]      │ │
│  │                  │ │  [Slots]     │ │
│  │                  │ │  [CTA]       │ │
│  └──────────────────┘ └──────────────┘ │
│                                         │
│  Headline + Trust Badges                │
│                                         │
└─────────────────────────────────────────┘
```

### Mobile Stack
1. Hero image (top)
2. Booking widget (below image)
3. Headline + badges (below widget)

### Above-Fold Rules
- Desktop: Full booking widget visible
- Mobile: "Book Now" button visible without scroll

---

## Services Section

### Card Hierarchy
```
┌─────────────────────┐
│   IMAGE (4:3)       │
│   or gradient      │
├─────────────────────┤
│  Service Name       │
│  Short description │
│  Duration • Price  │
│  [Quick Book]      │
└─────────────────────┘
```

### Grid
- Desktop: 4 columns
- Tablet: 2 columns
- Mobile: 1 column

---

## Gallery Section

### Rules
- 6 images maximum
- Square aspect ratio (1:1)
- Editorial, curated placement
- Supports brand quality proof

### Image Types
- Nail art close-ups
- Salon interior
- Before/after
- Happy clients

---

## Team Section

### Decision: KEEP (Compact)

### Design
- 3 technicians max
- Circular photo
- Name + specialty
- Short credibility line
- NOT a "meet the team" feature

---

## Location Section

### Layout
```
┌──────────────────┐ ┌──────────────────┐
│  INFO            │ │  MAP             │
│                  │ │  (image or       │
│  Address         │ │   embed)         │
│  Hours                            │
│  Transport       │ │                  │
│                  │ │                  │
│  [Book] [Dir]   │ │                  │
└──────────────────┘ └──────────────────┘
```

---

## Aftercare/Gift Cards

### Decision: KEEP (Merged)

### Design
- Two-column grid
- Left: Aftercare products list
- Right: Gift card prominent CTA
- Supportive, not dominant

---

## Mobile Rules

### Hero
- Stack: Image → Widget
- Booking button visible above fold
- Reduce vertical space where possible

### Navigation
- Hidden links (hamburger)
- Visible: Logo + Book button

### Sticky CTA
- Remains at bottom
- Brand color background
- "Book Now" text

### Sections
- Stack vertically
- Full-width cards
- Reduced padding (py-12)

---

## Comparison

### A) Keep from Current Nailify
- Booking widget (correct position)
- Service data (real content)
- Location details
- Fast booking entry
- Guided booking flow (/book)
- Success page
- Mobile sticky CTA

### B) Remove from Current Nailify
- Dark gray backgrounds
- Dense text blocks
- Emoji-only icons
- Heavy section borders
- Marketing-heavy copy

### C) Borrow from Home V3
- Bright white/cream backgrounds
- Large editorial hero image
- Generous section padding
- Rounded premium corners
- Soft subtle shadows
- Clean card layouts
- Trust strip below hero

### D) NOT Borrow from Home V3
- Hair salon content
- Dark hero variants
- Marketplace structure
- Blog sections
- Video-heavy sections
- Complex pricing tables

---

## Implementation Notes

### Reused Components
- `HeroBookingWidget` - Already optimized
- `StickyBookingCTA` - Mobile conversion tool
- `TimeSlot` - Reused in booking flow
- `ServiceSelector` - Used in widget
- Booking store - All state management

### New Components
- Homepage sections are inline (in page.tsx)
- Could be split into reusable components if needed

### Performance
- Using placeholder gradients (no heavy images yet)
- CSS transitions for hover effects
- Lazy loading built into Next.js

### Next Steps
1. Replace gradient placeholders with real images
2. Add real testimonial content
3. Fine-tune spacing based on image assets
4. Test mobile booking flow
