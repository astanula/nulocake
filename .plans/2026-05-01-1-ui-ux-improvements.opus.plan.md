# UI/UX Improvements — Implementation Plan
**Project:** Nulo Cake Landing Page  
**Audit date:** 2026-05-01  
**Source issues:** [landing_page_audit.md](../../../Users/astan/.gemini/antigravity/brain/bcc1f12a-1fc0-4b9f-94a4-3e03bb9696d5/landing_page_audit.md)

---

## Scope

All issues surfaced by the UI/UX Pro Max audit are grouped into **6 change batches** ordered by priority (Critical → Low). Each batch lists exactly which files change and what, so items can be cherry-picked.

> [!IMPORTANT]
> **Batch independence:** Each batch is self-contained and can be applied separately. Dependencies between batches are noted explicitly.

---

## Open Questions

> [!WARNING]
> Before starting Batch 3 (Performance), please confirm:
> 1. **Hero video poster** — Should I generate a static poster frame from the video, or do you have a preferred still image to use as `/hero-poster.webp`?
> 2. **Gallery image format** — The gallery `<img>` tags already reference `.webp` files (e.g., `gallery-1.webp`). No change needed there. ✅

---

## Batch 1 — Critical Accessibility & Focus (🔴 Issues: A1, A2, T1)

**Goal:** Fix the three hardest blockers that affect keyboard users and WCAG compliance.

---

### [MODIFY] [Layout.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/layouts/Layout.astro)

#### A1 · Skip-to-content link
Add a visually hidden skip link as the very first element inside `<body>`. It becomes visible on focus via CSS.

```html
<a href="#main-content" class="skip-link">Przejdź do treści</a>
```

CSS to add globally (in `global.css`):
```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary-container);
  color: var(--color-on-primary);
  font-family: var(--font-family-body);
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.125rem;
  text-decoration: none;
  z-index: 9999;
  transition: top 0.2s;
}
.skip-link:focus {
  top: 1rem;
}
```

The `<main>` element in `index.astro` has `id="hero-scroll-container"`. **Do not add a second `id`** — HTML elements can only have one. Instead, either:
- Rename `id="hero-scroll-container"` to `id="main-content"` and update all JS references (`document.getElementById('hero-scroll-container')` → `document.getElementById('main-content')`), **or**
- Keep the existing id and change the skip link href to `#hero-scroll-container`.

The second option is simpler and avoids touching the GSAP script. Also add `tabindex="-1"` to the `<main>` so that the skip-link focus actually lands on it (native `<main>` is not focusable by default in all browsers).

---

### [MODIFY] [global.css](file:///c:/Users/astan/Personal/Dev/nulocake/src/styles/global.css)

#### A2 · Visible focus rings
Tailwind Preflight suppresses browser default outlines. Add explicit `:focus-visible` styles for all interactive elements:

```css
/* Global focus ring — applies to all interactive elements */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
  border-radius: 2px;
}

/* Override for elements with their own border-radius */
.btn-primary:focus-visible,
.btn-secondary:focus-visible {
  outline-offset: 4px;
}

.nav-link--cta:focus-visible {
  outline-offset: 4px;
  border-radius: 0.125rem;
}
```

#### T1 · Button touch target height
Increase button padding so the minimum computed height reaches 44px:

Current: `padding: 0.75rem 1.75rem` = 12px top + 12px bottom + ~14px font = **~38px**.
Needed: at least 44px.

```css
/* from */
.btn-primary  { padding: 0.75rem 1.75rem; }
.btn-secondary { padding: 0.75rem 1.75rem; }

/* to — increase vertical padding to 0.875rem (14px) */
.btn-primary  { padding: 0.875rem 1.75rem; } /* 14 + 14 + 16 ≈ 44px */
.btn-secondary { padding: 0.875rem 1.75rem; }
```

> [!NOTE]
> 0.8125rem (13px) yields ~40px which is still under 44px. Changed to 0.875rem (14px) for a safe 44px minimum. The font-size is 0.875rem (14px) but with line-height the rendered text height is ~16px, so 14+14+16 = 44px.

Also add `touch-action: manipulation` to both buttons and `.nav-link--cta` (fixes T2 at the same time — cheap fix, no downside):

```css
.btn-primary,
.btn-secondary,
.nav-link--cta {
  touch-action: manipulation;
}
```

---

## Batch 2 — Navigation & Mobile UX (🟠 Issues: A5, N1, N2, N3, T3)

> [!NOTE]
> Issue **A3** (prefers-reduced-motion guard ordering) was originally listed here but belongs in **Batch 6** where the entire GSAP script is restructured. It has been moved there.

**Goal:** Fix the mobile nav drawer and add active nav state.

---

### [MODIFY] [Navigation.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/components/Navigation.astro)

#### N1 · Active nav state
Astro provides `Astro.url.pathname` at build time. Use it to add an `aria-current="page"` attribute and an `.active` CSS class to the current nav link.

```astro
---
import logo from '../assets/nulocake logo.svg';
import { Image } from 'astro:assets';
const path = Astro.url.pathname;
---
<li><a href="/oferta"  class={`nav-link ${path === '/oferta'  ? 'nav-link--active' : ''}`} aria-current={path === '/oferta'  ? 'page' : undefined}>Oferta</a></li>
<li><a href="/galeria" class={`nav-link ${path === '/galeria' ? 'nav-link--active' : ''}`} aria-current={path === '/galeria' ? 'page' : undefined}>Galeria</a></li>
<li><a href="/o-mnie"  class={`nav-link ${path === '/o-mnie'  ? 'nav-link--active' : ''}`} aria-current={path === '/o-mnie'  ? 'page' : undefined}>O mnie</a></li>
```

CSS to add for the active indicator:
```css
.nav-link--active {
  color: var(--color-on-surface);
}
.nav-link--active::after {
  width: 100%;
}
```

#### A5 · Hamburger aria-label (dynamic)
Change the static `aria-label="Menu"` to update dynamically in the JS toggle handler:

```js
toggle.setAttribute('aria-label', expanded ? 'Zamknij menu' : 'Otwórz menu');
```

#### N3 · Close button inside mobile drawer
Add an explicit ✕ button inside `#nav-links` (visible only on mobile):

```html
<button id="nav-close" class="nav-close" aria-label="Zamknij menu">
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <path d="M4 4l12 12M16 4L4 16"/>
  </svg>
</button>
```

CSS:
```css
.nav-close {
  display: none;
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-on-surface-variant);
  padding: 0.5rem;
}
@media (max-width: 768px) {
  .nav-close { display: block; }
}
```

#### T3 · Backdrop overlay + tap-outside-to-close
Add a backdrop element after the `<nav>`:

```html
<div id="nav-backdrop" class="nav-backdrop" aria-hidden="true"></div>
```

CSS:
```css
.nav-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 30;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}
.nav-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}
```

> [!IMPORTANT]
> **Bug fix vs original draft:** Using `display: none` → `display: block` does **not** transition because `display` is not animatable. Changed to `opacity` + `pointer-events` pattern so the fade-in/out transition actually works.

JS additions:
```js
const backdrop = document.getElementById('nav-backdrop');

function openMenu() {
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Zamknij menu');
  toggle.classList.add('active');
  links?.classList.add('open');
  backdrop?.classList.add('open');
  // Move focus into drawer
  document.getElementById('nav-close')?.focus();
}

function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Otwórz menu');
  toggle.classList.remove('active');
  links?.classList.remove('open');
  backdrop?.classList.remove('open');
  toggle?.focus(); // Return focus to hamburger
}

backdrop?.addEventListener('click', closeMenu);
document.getElementById('nav-close')?.addEventListener('click', closeMenu);
```

#### N2 · Focus trap in mobile drawer
Add a minimal focus trap inside the open drawer. When the drawer is open, Tab should cycle only within it:

```js
function trapFocus(e: KeyboardEvent) {
  if (!links?.classList.contains('open')) return;
  const focusable = links.querySelectorAll<HTMLElement>('a, button');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.key === 'Tab') {
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  if (e.key === 'Escape') closeMenu();
}
document.addEventListener('keydown', trapFocus);
```

---

## Batch 3 — Performance (🟠 Issues: P1, P2, P3)

**Goal:** Eliminate render-blocking font loading and reduce video payload.

---

### [MODIFY] [Layout.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/layouts/Layout.astro)

#### P2 + P3 · Move Google Fonts to `<head>` as `<link>` tags with preconnect

Remove the `@import` from `global.css` and replace with proper `<link>` tags in `<head>`:

```html
<!-- DNS preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<!-- Non-blocking font load -->
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Epilogue:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Manrope:wght@300;400;500;600;700;800&display=swap"
/>
```

### [MODIFY] [global.css](file:///c:/Users/astan/Personal/Dev/nulocake/src/styles/global.css)

Remove line 2 (`@import url('https://fonts.googleapis.com/...')`).

---

### [MODIFY] [index.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/pages/index.astro)

#### P1 · Video poster + conditional preload

```html
<video
  id="hero-video"
  src="/hero-video.mp4"
  poster="/hero-poster.webp"
  muted
  playsinline
  preload="metadata"
  class="hero-video"
  aria-hidden="true"
  tabindex="-1"
>
</video>
```

Change `preload="auto"` → `preload="metadata"` so only metadata (duration) is fetched on load, not the full video. The scroll-driven seek will load video data on demand.

> [!NOTE]
> You will need a `hero-poster.webp` image in `/public/`. This can be a screenshot of the first frame of the video, or any representative cake photo.

---

## Batch 4 — Layout Fixes (🟠 Issues: L1, L2, L3)

**Goal:** Fix ultrawide layout drift and add a tablet breakpoint.

---

### [MODIFY] [index.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/pages/index.astro) (CSS `<style>` block)

#### L2 · Max-width constraint for hero container on ultrawide screens

```css
/* Add to .hero-container */
.hero-container {
  max-width: 1400px;
  margin: 0 auto;
  /* keep existing: position, display, grid-template-columns, min-height */
}
```

> [!NOTE]
> The page background color (`--color-background: #131313`) will fill the sides beyond 1400px, which is fine for this dark design. If a full-bleed look is desired instead, wrap only the inner content.

#### L1 · Tablet breakpoint (768px–1024px)

Add a new media query between the desktop layout and the mobile collapse:

```css
@media (min-width: 769px) and (max-width: 1024px) {
  .hero-container {
    grid-template-columns: 1fr 1fr;
  }
  .hero-section {
    padding: 3rem 1.5rem 3rem 2.5rem;
  }
  .hero-section-inner {
    max-width: 420px;
  }
  .hero-video {
    width: 90%;
    max-width: 400px;
  }
}
```

#### L3 · Mobile first-section top offset under fixed nav

Verify that on mobile, the first text section has sufficient top padding so the nav bar doesn't overlap the heading. The video is `order: -1` (rendered above the text), so the nav overlaps the video, not the text. If the nav overlaps the video, add a top padding/margin to the video wrapper:

```css
@media (max-width: 768px) {
  .hero-video-wrapper {
    padding-top: 4rem; /* nav height clearance */
    height: calc(50dvh + 4rem);
  }
}
```

> [!NOTE]
> This needs visual verification in the browser at 375px and 390px viewport widths.

---

## Batch 5 — Typography & Color Polish (🟡 Issues: TC2, TC3, TC6, S2, S3, AN1)

**Goal:** Tighten typography minimums, remove hardcoded hex values, minor visual polish.

---

### [MODIFY] [global.css](file:///c:/Users/astan/Personal/Dev/nulocake/src/styles/global.css)

#### TC6 · Tokenize the gradient end-stop color

Add to `@theme` block in `global.css`:
```css
--color-primary-gradient-end: #eb9fe4;
```

Then replace **all three** raw `#eb9fe4` / `rgba(235,...)` occurrences:
- `global.css` line 117: `.btn-primary` gradient end-stop → `var(--color-primary-gradient-end)`
- `Navigation.astro` line 146: `.nav-link--cta` gradient end-stop → `var(--color-primary-gradient-end)`
- `index.astro` line 289: `.hero-video-glow` uses `rgba(235, 101, 235, 0.08)` — this is `--color-primary-container` (#eb65eb) at 8% opacity. Replace with `color-mix(in srgb, var(--color-primary-container) 8%, transparent)` or a dedicated token `--color-glow: rgba(235, 101, 235, 0.08)`.

#### S3 · `cursor: pointer` on gallery items

Add `cursor: pointer` to the existing `.gallery-item` rule in `index.astro` line 302 (`<style>` block), not in `global.css`:

```css
.gallery-item {
  /* ...existing properties... */
  cursor: pointer;
}
```

> [!NOTE]
> If the gallery items are **not** intended to be clickable (they are currently plain `<div>`s with no link), consider whether `cursor: pointer` is misleading. The alternative is wrapping each `<img>` in an `<a href="/galeria">` which would also fix issue **A4** (keyboard-navigability) from the audit.

#### AN1 · Section text stays visible on reverse scroll

In `index.astro` script, change `toggleActions`:
```js
// from
toggleActions: 'play none none reverse',
// to
toggleActions: 'play none none none',
```

This makes sections reveal once and stay visible. Matches the story-scroll editorial intent better.

---

### [MODIFY] [Footer.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/components/Footer.astro)

#### TC2 · Copyright text minimum size

```css
/* from */
.footer-copy { font-size: 0.6875rem; } /* 11px */
/* to */
.footer-copy { font-size: 0.75rem; }   /* 12px */
```

#### TC3 · Footer link minimum size

```css
/* from */
.footer-link { font-size: 0.75rem; }   /* 12px */
/* to */
.footer-link { font-size: 0.8125rem; } /* 13px */
```

---

### [MODIFY] [Navigation.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/components/Navigation.astro)

#### S2 · Reduce nav "Kontakt" CTA visual weight

The nav CTA currently uses the same `btn-primary`-style gradient as the hero button. Soften it to a ghost/outlined style so the hero CTA remains the clear primary action:

```css
.nav-link--cta {
  /* Remove gradient background */
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-outline-variant);
  /* Keep existing: padding, font, border-radius, transition */
}
.nav-link--cta:hover {
  border-color: var(--color-primary);
  background: rgba(255, 170, 248, 0.06);
  color: var(--color-primary);
  /* Remove: transform: scale, filter: brightness — keep it subtle */
}
```

---

## Batch 6 — Animation & Reduced Motion (🟡 Issues: A3, AN2, AN3, AN4, P4)

**Goal:** Fix the reduced-motion guard ordering and add a hero entrance animation.

---

### [MODIFY] [index.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/pages/index.astro) (script block)

#### A3 + AN4 · `prefers-reduced-motion` guard — check first, listen for changes

Restructure the script to check motion preference **before** registering any ScrollTrigger:

```js
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = motionQuery.matches;

if (!reducedMotion) {
  // All GSAP / ScrollTrigger code goes here
  // ... (video scroll, section reveals, gallery stagger, testimonial stagger)
} else {
  // Immediately make all sections visible
  document.querySelectorAll('.hero-section-inner').forEach((el) => {
    (el as HTMLElement).style.opacity = '1';
    (el as HTMLElement).style.transform = 'none';
  });
}

// React to live OS changes
motionQuery.addEventListener('change', (e) => {
  if (e.matches) {
    ScrollTrigger.getAll().forEach((t) => t.kill());
    document.querySelectorAll('.hero-section-inner').forEach((el) => {
      (el as HTMLElement).style.opacity = '1';
      (el as HTMLElement).style.transform = 'none';
    });
  }
});
```

#### AN2 · Hero Section 1 entrance animation on page load

Add a staggered entrance for the first section's children after a short page-load delay:

```js
if (!reducedMotion) {
  // Existing section scroll reveals...

  // Hero load entrance (Section 1 only — already visible via CSS)
  const heroInner = document.querySelector('#section-hero .hero-section-inner');
  if (heroInner) {
    const heroChildren = heroInner.querySelectorAll('.section-label, .section-heading, .section-body, .section-cta-group');
    gsap.from(heroChildren, {
      opacity: 0,
      y: 24,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.1,
      delay: 0.15,
      clearProps: 'all',
    });
  }
}
```

> [!NOTE]
> This requires the hero elements to *start* with opacity 0 (via `will-change` or `gsap.set`) and the `--active` CSS class to be removed from the initial state. The current `hero-section--active` sets them visible via CSS which would compete. The CSS initial state (`opacity: 0; transform: translateY(60px)`) already handles this for other sections — for section 1, the simplest approach is to keep the `.hero-section--active` class but have GSAP override with `gsap.from()` which uses the CSS-defined end state as target automatically via `clearProps`.

#### AN3 · Video seek debounce (optional micro-optimisation)

The `Math.abs > 0.05` guard already throttles most redundant seeks. For production, consider a more robust approach:

```js
let seeking = false;
onUpdate: (self) => {
  if (seeking) return;
  const targetTime = self.progress * duration;
  if (Math.abs(video.currentTime - targetTime) > 0.05) {
    seeking = true;
    video.currentTime = targetTime;
    requestAnimationFrame(() => { seeking = false; });
  }
}
```

#### P4 · Conditional GSAP import (optional)

For reduced-motion users, avoid loading GSAP at all with a dynamic import:

```js
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const { default: gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  // ... rest of animation setup
} else {
  // Make everything visible immediately
}
```

> [!NOTE]
> This requires changing the `<script>` block to use top-level `await`, which Astro supports natively. However it adds code complexity. Mark as **optional** — implement only if Lighthouse scores show GSAP as a significant blocking resource.

---

## Batch 7 — Additional Issues Found During Plan Review (🟡)

**Goal:** Items discovered during the cross-reference that were not in the original audit.

---

### [MODIFY] [index.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/pages/index.astro)

#### NEW-1 · Gallery 4-column grid is cramped inside the 50% split-screen `[line-length-control]` `[touch-density]`
On desktop, `.gallery-grid` uses `grid-template-columns: repeat(4, 1fr)` inside the left column which is 50% viewport. With `max-width: 560px` on `.hero-section-inner`, each gallery cell is ~130px. That's very small for image thumbnails on a 1440px screen and below touch-target comfort on tablets.

**Proposed fix:** Change desktop gallery to `repeat(2, 1fr)` (matching mobile) inside the split-screen layout. The gallery is a preview, not the full gallery — 2×2 is sufficient. If 4 images are desired, use `repeat(2, 1fr)` with larger images.

```css
.gallery-grid {
  grid-template-columns: repeat(2, 1fr);  /* was repeat(4, 1fr) */
  gap: 0.75rem;
  margin-top: 1.5rem;
}
```

#### NEW-2 · Section-link arrow SVG missing `aria-hidden="true"` `[aria-labels]`
The arrow icon SVG inside the "Poznaj moją historię" link (line 51) is decorative but has no `aria-hidden="true"`. Screen readers will attempt to announce the SVG paths.

```html
<!-- Add aria-hidden="true" -->
<svg aria-hidden="true" width="16" height="16" ...>
```

#### NEW-3 · `.testimonial-text` font-size is 0.9375rem (15px) — non-standard `[font-scale]`
The testimonial quote text uses `font-size: 0.9375rem` (15px). This is not on a standard type scale (12 → 14 → 16 → 18...). Consider rounding to `1rem` (16px) for consistency with the `.body-lg` class and readability.

#### NEW-4 · `body { overflow-x: hidden }` masks layout overflow bugs `[horizontal-scroll]`
`global.css` line 52 sets `overflow-x: hidden` on `<body>`. This hides horizontal overflow instead of fixing it. If any element overflows, it will be silently clipped. This is a common anti-pattern. Better to find and fix the actual overflow source (likely the `.hero-video-glow` with `width: 70%` and `filter: blur(60px)` on the video column, or the gallery grid).

**Proposed fix:** Remove `overflow-x: hidden` from `body` and instead add `overflow: hidden` only to `.hero-video-wrapper` (which already has it) and `.hero-container` if needed.

#### NEW-5 · Gallery section `toggleActions: 'play none none reverse'` also hides gallery on scroll-up `[motion-meaning]`
Batch 5 changes the section reveal `toggleActions` to `'play none none none'`, but the **gallery stagger** (line 506) and **testimonial stagger** (line 529) also use `'play none none reverse'`. These should be updated to `'play none none none'` as well for consistency — otherwise gallery images disappear when scrolling back up even though the section heading remains visible.

#### NEW-6 · Mobile: hero first section `min-height: 50dvh` but no vertical centering `[visual-hierarchy]`
On mobile, `.hero-section:first-child { min-height: 50dvh }` creates a tall container but `.hero-section` only has `align-items: center` from the desktop flex rule. Since the mobile override sets `min-height: auto` for all sections *before* the `:first-child` override sets `min-height: 50dvh`, the `display: flex; align-items: center` is maintained. ✅ This is actually fine — just verify the content is vertically centered in the 50dvh block.

#### NEW-7 · `will-change: transform, opacity` set permanently on `.hero-section-inner` `[transform-performance]`
`will-change` is meant to be applied **before** an animation and removed **after**. Setting it permanently in CSS promotes the element to a compositing layer indefinitely, consuming GPU memory for all 5 sections even after they've finished animating. GSAP sets `will-change` automatically during animation.

**Proposed fix:** Remove `will-change: transform, opacity` from the CSS rule and let GSAP handle it.

```css
.hero-section-inner {
  max-width: 560px;
  opacity: 0;
  transform: translateY(60px);
  /* Remove: will-change: transform, opacity; — GSAP handles this */
}
```

---

## Files Changed Summary

| File | Batches |
|------|---------|
| `src/layouts/Layout.astro` | 1 (skip link), 3 (font preconnect) |
| `src/styles/global.css` | 1 (focus rings, button height, touch-action), 3 (remove @import), 5 (token), 7 (overflow-x) |
| `src/pages/index.astro` | 3 (video poster/preload), 4 (max-width, breakpoints), 5 (gallery cursor, toggleActions), 6 (reduced-motion guard, hero entrance, seek debounce), 7 (gallery grid, arrow a11y, will-change, gallery/testimonial toggleActions, testimonial font) |
| `src/components/Navigation.astro` | 2 (active state, aria-label, close btn, backdrop, focus trap), 5 (nav CTA style, token) |
| `src/components/Footer.astro` | 5 (font size) |
| `/public/hero-poster.webp` | 3 — **new file** (requires manual action or generation) |

---

## Verification Plan

### After each batch
- Run `npm run dev` and inspect in browser at:
  - **375px** (iPhone SE) — mobile
  - **768px** — breakpoint boundary
  - **1024px** — tablet landscape
  - **1440px** — standard desktop
  - **2560px** — ultrawide (emulated via DevTools)
- Tab through the page with keyboard only to verify focus rings and skip link.
- Open DevTools → Rendering → "Emulate CSS media: prefers-reduced-motion: reduce" and verify animations don't flash.

### Accessibility spot-checks
- Run axe DevTools browser extension or Lighthouse accessibility audit.
- Verify skip link appears on first Tab press.
- Verify mobile drawer traps focus and closes on Escape and backdrop click.
- Verify nav active state is correct on each route.
- Verify arrow SVGs have `aria-hidden="true"` (NEW-2).

### Performance
- After Batch 3, run Lighthouse Performance in an incognito window and confirm font LCP improvement.
- Check Network panel that video downloads only `metadata` bytes on initial load.
- After Batch 7, verify no horizontal scroll appears anywhere after removing `overflow-x: hidden` (NEW-4). If it does, add targeted `overflow: hidden` to the offending container.

### Visual regression
- After Batch 7, compare gallery grid layout before/after (NEW-1: 4→2 columns).
- After Batch 5, verify nav "Kontakt" CTA no longer competes visually with the hero CTA (S2).
