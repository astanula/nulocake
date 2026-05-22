# Interactive Infinite Looping Gallery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a premium infinite-scrolling vertical gallery on `/galeria` with 4 columns of cake images that loop seamlessly in alternating directions and pause smoothly on hover.

**Architecture:** Two files — a config module (`src/config/gallery.ts`) and the page itself (`src/pages/galeria.astro`). Images are fetched and rendered at build time via Astro's `<Image>` component. Client-side JS handles responsive column redistribution and GSAP-powered infinite scroll loops. The gallery takes full viewport height with no page scroll.

**Tech Stack:** Astro 6, GSAP 3.15 (core only, no ScrollTrigger needed), Tailwind CSS (via `@theme` tokens in `global.css`), TypeScript.

**Spec:** [`2026-05-20-interactive-gallery-design.md`](file:///c:/Users/astan/Personal/Dev/nulocake/docs/superpowers/specs/2026-05-20-interactive-gallery-design.md)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| CREATE | `src/config/gallery.ts` | Gallery constants: column speeds, image gap, breakpoints |
| MODIFY | `src/pages/galeria.astro` | Full gallery page: frontmatter image loading, HTML template, scoped CSS, client-side GSAP script |

---

## Task 1: Gallery Config Module

**Files:**
- Create: `src/config/gallery.ts`

- [ ] **Step 1: Create the config file**

```typescript
// src/config/gallery.ts

/**
 * Configuration for the infinite-scrolling gallery on /galeria.
 * Shared between build-time layout and client-side GSAP animation.
 */

/** Duration (seconds) for one full loop cycle per column. */
export const COLUMN_SPEEDS = [30, 30, 30, 30] as const;

/** Vertical gap between images in a column. */
export const IMAGE_GAP = '20px';

/** Responsive breakpoints for column count. */
export const BREAKPOINTS = {
  /** ≥1024px → 4 columns */
  desktop: 1024,
  /** ≥640px → 3 columns */
  tablet: 640,
  // Below 640px → 2 columns (implicit)
} as const;

/** Duration (seconds) for smooth timeScale transitions on hover. */
export const HOVER_TRANSITION_DURATION = 0.4;
```

- [ ] **Step 2: Verify the config compiles**

Run: `npx astro check`
Expected: No errors related to `src/config/gallery.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/config/gallery.ts
git commit -m "feat(gallery): add gallery config module"
```

---

## Task 2: Frontmatter — Image Loading & Column Assignment

**Files:**
- Modify: `src/pages/galeria.astro` (frontmatter block, lines 1–5)

This task replaces the placeholder page frontmatter with image-loading logic. The template will still render the placeholder — we replace it in Task 3.

- [ ] **Step 1: Write the frontmatter**

Replace the entire frontmatter of `src/pages/galeria.astro` with:

```astro
---
import { Image } from 'astro:assets';
import Layout from '../layouts/Layout.astro';
import Navigation from '../components/Navigation.astro';
import Footer from '../components/Footer.astro';
import { COLUMN_SPEEDS, IMAGE_GAP } from '../config/gallery';

// ── Fetch all gallery images at build time ──────────────
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/gallery/*.{jpeg,jpg,png,webp}',
  { eager: true }
);

// ── Parse filenames and sort by column-row ──────────────
type GalleryImage = {
  src: ImageMetadata;
  column: number;
  row: number;
};

const allImages: GalleryImage[] = Object.entries(imageModules)
  .map(([path, mod]) => {
    const filename = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    const [colStr, rowStr] = filename.split('-');
    return {
      src: mod.default,
      column: parseInt(colStr, 10),
      row: parseInt(rowStr, 10),
    };
  })
  .sort((a, b) => a.column - b.column || a.row - b.row);

// ── Distribute images into 4 columns (round-robin by original column) ──
const columns: GalleryImage[][] = [[], [], [], []];
allImages.forEach((img, i) => {
  columns[i % 4].push(img);
});
---
```

- [ ] **Step 2: Verify the build still works**

Run: `npx astro check`
Expected: No errors. The page still shows the placeholder content (we haven't changed the template yet).

- [ ] **Step 3: Commit**

```bash
git add src/pages/galeria.astro
git commit -m "feat(gallery): add frontmatter image loading and column assignment"
```

---

## Task 3: HTML Template — Gallery Layout

**Files:**
- Modify: `src/pages/galeria.astro` (HTML template, lines 7–18)

Replace the placeholder `<main>` block with the gallery structure. All 4 columns are rendered at build time with duplicated image sets for seamless looping.

- [ ] **Step 1: Replace the HTML template**

Replace everything between `<Layout>` tags (the `<Navigation />`, `<main>`, `<Footer />` block) with:

```astro
<Layout title="Galeria — Nulo Cake" description="Galeria artystycznych tortów na zamówienie. Torty weselne, urodzinowe i okolicznościowe.">
  <Navigation />
  <main class="gallery-page" id="gallery-page">
    <div class="gallery-container" id="gallery-container">
      {columns.map((colImages, colIndex) => (
        <div
          class="gallery-column"
          data-col-index={colIndex}
          data-col-direction={colIndex % 2 === 0 ? 'up' : 'down'}
          data-col-speed={COLUMN_SPEEDS[colIndex]}
        >
          <div class="gallery-column-inner" style={`gap: ${IMAGE_GAP};`}>
            {/* First set */}
            {colImages.map((img, imgIndex) => (
              <div class="gallery-image-wrapper">
                <Image
                  src={img.src}
                  alt={`Tort ${colIndex + 1}-${imgIndex + 1}`}
                  widths={[300, 500]}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading="lazy"
                  class="gallery-image"
                />
              </div>
            ))}
            {/* Duplicated set for seamless loop */}
            {colImages.map((img, imgIndex) => (
              <div class="gallery-image-wrapper" aria-hidden="true">
                <Image
                  src={img.src}
                  alt=""
                  widths={[300, 500]}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  loading="lazy"
                  class="gallery-image"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </main>
  <Footer />
</Layout>
```

Key design decisions:
- Each column has `data-col-direction` ("up"/"down") and `data-col-speed` for the client-side GSAP script.
- The duplicated image set has `aria-hidden="true"` and empty `alt` since it's purely decorative repetition.
- `IMAGE_GAP` is applied as inline `gap` on the column inner wrapper.
- Navigation and Footer are kept from the existing pattern.

- [ ] **Step 2: Verify the build succeeds**

Run: `npx astro check`
Expected: No errors. The page should render but won't animate yet (no CSS or JS).

- [ ] **Step 3: Commit**

```bash
git add src/pages/galeria.astro
git commit -m "feat(gallery): add gallery HTML template with 4 columns"
```

---

## Task 4: Scoped CSS — Gallery Styling

**Files:**
- Modify: `src/pages/galeria.astro` (replace existing `<style>` block)

- [ ] **Step 1: Replace the `<style>` block**

Remove the entire existing `<style>` block (the placeholder styles) and replace it with:

```css
<style>
  .gallery-page {
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    position: relative;
  }

  .gallery-container {
    display: flex;
    width: 100%;
    height: 100%;
    gap: 0;
  }

  .gallery-column {
    flex: 1;
    overflow: hidden;
    position: relative;
    min-width: 0;
  }

  /* Columns hidden on smaller viewports get display:none via JS class */
  .gallery-column.is-hidden {
    display: none;
  }

  .gallery-column-inner {
    display: flex;
    flex-direction: column;
    will-change: transform;
  }

  .gallery-image-wrapper {
    flex-shrink: 0;
    overflow: hidden;
  }

  .gallery-image {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
  }
</style>
```

Design notes:
- `.gallery-page` fills the viewport and hides overflow — the entire page is the gallery, no scrolling.
- `.gallery-column` uses `flex: 1` to distribute evenly.
- `.gallery-column-inner` is the element GSAP will translate for the infinite loop.
- `will-change: transform` on the inner wrapper hints GPU compositing for smooth animation.
- `.is-hidden` class is toggled by client-side JS for responsive column hiding.

- [ ] **Step 2: Verify the page renders visually**

Run: `npm run dev`
Open `http://localhost:3000/galeria` in a browser.
Expected: 4 columns of images visible, stacked vertically in each column. No animation yet. Images should fill the viewport width.

- [ ] **Step 3: Commit**

```bash
git add src/pages/galeria.astro
git commit -m "feat(gallery): add gallery CSS layout"
```

---

## Task 5: Client-Side JS — GSAP Infinite Loop & Hover Interaction

**Files:**
- Modify: `src/pages/galeria.astro` (add `<script>` block after `</style>`)

This is the core animation logic: responsive column management, GSAP infinite scroll loops, and smooth hover pause/resume.

- [ ] **Step 1: Add the client-side script**

Add the following `<script>` block after the closing `</style>` tag:

```typescript
<script>
  import gsap from 'gsap';
  import {
    COLUMN_SPEEDS,
    BREAKPOINTS,
    HOVER_TRANSITION_DURATION,
  } from '../config/gallery';

  let activeTweens: gsap.core.Tween[] = [];
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupController: AbortController | null = null;

  /**
   * Determine how many columns should be visible based on viewport width.
   */
  function getColumnCount(): number {
    const w = window.innerWidth;
    if (w >= BREAKPOINTS.desktop) return 4;
    if (w >= BREAKPOINTS.tablet) return 3;
    return 2;
  }

  /**
   * Redistribute images from hidden columns into visible ones.
   * Moves actual DOM nodes so Astro's optimized <img> elements are preserved.
   */
  function redistributeColumns(
    allColumns: HTMLElement[],
    visibleCount: number
  ): void {
    // Collect all image wrappers from hidden columns
    const hiddenImages: HTMLElement[] = [];
    for (let i = visibleCount; i < allColumns.length; i++) {
      const inner = allColumns[i].querySelector('.gallery-column-inner');
      if (!inner) continue;
      // Only take the first-half (non-duplicate) images
      const wrappers = Array.from(
        inner.querySelectorAll('.gallery-image-wrapper:not([aria-hidden])')
      ) as HTMLElement[];
      hiddenImages.push(...wrappers);
    }

    // Round-robin distribute hidden images into visible columns
    const visibleInners = allColumns
      .slice(0, visibleCount)
      .map((col) => col.querySelector('.gallery-column-inner')!);

    hiddenImages.forEach((wrapper, i) => {
      const targetInner = visibleInners[i % visibleCount];
      // Insert before the first aria-hidden duplicate
      const firstDupe = targetInner.querySelector('[aria-hidden]');
      if (firstDupe) {
        targetInner.insertBefore(wrapper, firstDupe);
      } else {
        targetInner.appendChild(wrapper);
      }
    });

    // Rebuild the duplicate set in each visible column
    visibleInners.forEach((inner) => {
      // Remove old duplicates
      inner
        .querySelectorAll('[aria-hidden]')
        .forEach((el) => el.remove());

      // Clone the current images as new duplicates
      const originals = Array.from(
        inner.querySelectorAll('.gallery-image-wrapper')
      );
      originals.forEach((orig) => {
        const clone = orig.cloneNode(true) as HTMLElement;
        clone.setAttribute('aria-hidden', 'true');
        // Clear alt on cloned images
        const img = clone.querySelector('img');
        if (img) img.alt = '';
        inner.appendChild(clone);
      });
    });

    // Toggle visibility
    allColumns.forEach((col, i) => {
      col.classList.toggle('is-hidden', i >= visibleCount);
    });
  }

  /**
   * Create GSAP infinite loop tweens for each visible column.
   */
  function createLoopTweens(allColumns: HTMLElement[]): void {
    // Kill any existing tweens
    activeTweens.forEach((t) => t.kill());
    activeTweens = [];

    allColumns.forEach((col) => {
      if (col.classList.contains('is-hidden')) return;

      const inner = col.querySelector('.gallery-column-inner') as HTMLElement;
      if (!inner) return;

      const direction = col.dataset.colDirection;
      const speed = parseFloat(col.dataset.colSpeed || '30');

      if (direction === 'up') {
        // Scroll up: translate from 0% to -50%
        const tween = gsap.to(inner, {
          yPercent: -50,
          duration: speed,
          ease: 'none',
          repeat: -1,
        });
        activeTweens.push(tween);
      } else {
        // Scroll down: translate from -50% to 0%
        const tween = gsap.fromTo(
          inner,
          { yPercent: -50 },
          {
            yPercent: 0,
            duration: speed,
            ease: 'none',
            repeat: -1,
          }
        );
        activeTweens.push(tween);
      }
    });
  }

  /**
   * Attach hover listeners for smooth pause/resume.
   * Uses the AbortController signal so listeners are auto-removed on cleanup.
   */
  function attachHoverListeners(
    container: HTMLElement,
    signal: AbortSignal
  ): void {
    container.addEventListener('mouseenter', () => {
      activeTweens.forEach((tween) => {
        gsap.to(tween, {
          timeScale: 0,
          duration: HOVER_TRANSITION_DURATION,
          ease: 'power2.out',
        });
      });
    }, { signal });

    container.addEventListener('mouseleave', () => {
      activeTweens.forEach((tween) => {
        gsap.to(tween, {
          timeScale: 1,
          duration: HOVER_TRANSITION_DURATION,
          ease: 'power2.in',
        });
      });
    }, { signal });
  }

  /**
   * Clean up all gallery resources (tweens, timers, event listeners).
   */
  function cleanupGallery(): void {
    // Kill all loop tweens
    activeTweens.forEach((t) => t.kill());
    activeTweens = [];

    // Clear debounce timer
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    // Abort all event listeners (resize + hover)
    if (cleanupController) {
      cleanupController.abort();
      cleanupController = null;
    }
  }

  /**
   * Main initialization — called on every page load.
   */
  function initGallery(): void {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    const allColumns = Array.from(
      container.querySelectorAll('.gallery-column')
    ) as HTMLElement[];
    if (allColumns.length === 0) return;

    // Reduced motion: show static grid, no animation
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    // Clean up any previous instance (e.g., from a prior page-load)
    cleanupGallery();

    // Create a new AbortController for this gallery instance
    cleanupController = new AbortController();
    const { signal } = cleanupController;

    const visibleCount = getColumnCount();
    redistributeColumns(allColumns, visibleCount);
    createLoopTweens(allColumns);
    attachHoverListeners(container, signal);

    // Handle resize — uses signal so it's auto-removed on cleanup
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const newCount = getColumnCount();
        // Kill old tweens
        activeTweens.forEach((t) => t.kill());
        activeTweens = [];
        // Reset column transforms
        allColumns.forEach((col) => {
          const inner = col.querySelector('.gallery-column-inner') as HTMLElement;
          if (inner) gsap.set(inner, { clearProps: 'all' });
        });
        redistributeColumns(allColumns, newCount);
        createLoopTweens(allColumns);
      }, 200);
    }, { signal });
  }

  // ── Astro lifecycle ───────────────────────────────
  if (!(window as any).__galleryListenerAdded) {
    document.addEventListener('astro:page-load', initGallery);
    (window as any).__galleryListenerAdded = true;
  }

  // Clean up on navigation away
  if (!(window as any).__galleryBeforeSwapAdded) {
    document.addEventListener('astro:before-swap', () => {
      const container = document.getElementById('gallery-container');
      if (!container) return;
      cleanupGallery();
    });
    (window as any).__galleryBeforeSwapAdded = true;
  }
</script>
```

Key implementation details:
- **Lifecycle pattern** matches `index.astro`: guards against duplicate listeners with `window.__galleryListenerAdded` flag, uses `astro:page-load` and `astro:before-swap`.
- **`AbortController` for cleanup** — all per-instance event listeners (`resize` on `window`, `mouseenter`/`mouseleave` on container) are attached with `{ signal }` from a shared `AbortController`. On navigation away (`astro:before-swap`) or re-init, `abort()` removes all listeners in one call. This prevents the memory leak where `resize` handlers would accumulate on every `/galeria` visit.
- **`cleanupGallery()`** is a single function that kills tweens, clears the debounce timer, and aborts the controller. Called both from `astro:before-swap` and at the top of `initGallery()` (defensive, in case page-load fires without a preceding before-swap).
- **`redistributeColumns`** moves real DOM nodes (not clones) from hidden columns into visible ones, then rebuilds the duplicate set for looping. This preserves Astro's optimized `<img>` elements.
- **`createLoopTweens`** reads `data-col-direction` and `data-col-speed` from each column div.
- **Hover** uses `gsap.to(tween, { timeScale: ... })` for smooth deceleration/acceleration.
- **Resize** is debounced at 200ms, kills all tweens, clears transforms, redistributes, and re-creates.
- **Reduced motion** is respected — if `prefers-reduced-motion: reduce` is active, the gallery shows as a static grid with no animation.

- [ ] **Step 2: Verify the gallery animates**

Run: `npm run dev`
Open `http://localhost:3000/galeria` in a browser.
Expected:
1. 4 columns of images scrolling in alternating up/down directions.
2. Seamless looping — no gaps or jumps.
3. Hovering over the gallery smoothly pauses all columns.
4. Moving the cursor away smoothly resumes scrolling.

- [ ] **Step 3: Verify responsive behavior**

In the browser, resize the window:
- Width ≥1024px → 4 columns visible
- Width ≥640px but <1024px → 3 columns visible, all images redistributed
- Width <640px → 2 columns visible, all images redistributed

Expected: No images are lost. Column count changes. Animation restarts.

- [ ] **Step 4: Commit**

```bash
git add src/pages/galeria.astro
git commit -m "feat(gallery): add GSAP infinite loop animation and hover interaction"
```

---

## Task 6: Build Verification & Final Polish

**Files:**
- No new files

- [ ] **Step 1: Run the production build**

Run: `npx astro build`
Expected: Build succeeds with no errors. All 16 gallery images are processed and optimized.

- [ ] **Step 2: Verify navigation integration**

Run: `npm run dev`
1. Go to `http://localhost:3000/` (home page).
2. Navigate to `/galeria` via the navigation bar.
3. Navigate back to `/` via the navigation bar.
4. Navigate to `/galeria` again.

Expected: Gallery animations start/stop cleanly on each navigation. No console errors. No memory leaks (tweens are killed on `astro:before-swap`).

- [ ] **Step 3: Verify `astro check` passes**

Run: `npx astro check`
Expected: 0 errors, 0 warnings related to gallery files.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(gallery): complete infinite looping gallery implementation"
```

---

## Verification Plan

### Manual Verification (from spec)
1. **Layout Check**: 4 columns on desktop (≥1024px), 3 on tablet (≥640px), 2 on mobile (<640px).
2. **Infinite Looping Check**: Columns scroll continuously without flashing, jumping, or empty gaps.
3. **Hover Control Check**: Hovering pauses all columns smoothly (~0.4s deceleration), leaving resumes.
4. **Dynamic Image Load Check**: Adding a new `5-1.jpeg` to `src/assets/gallery/` auto-includes it after rebuild.

### Automated Checks
- `npx astro check` — type checking
- `npx astro build` — production build succeeds
