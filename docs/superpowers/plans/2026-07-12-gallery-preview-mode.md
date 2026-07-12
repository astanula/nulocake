# Gallery Preview Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen preview mode to `/galeria` that opens when any gallery image is clicked/tapped, pausing the scrolling gallery while the user browses images large with arrows, side peeks, a thumbnail strip, keyboard, and history navigation.

**Architecture:** A single self-contained `GalleryPreview.astro` component owns the dialog markup, styles, and all open/close/navigation logic. `galeria.astro` owns the gallery loop + float state and the delegated click handler; the two scripts communicate only via `CustomEvent`s on `document` (`gallery:open-preview`, `gallery:preview-closed`). A build-time manifest (JSON `<script>`) maps each image's `data-original-index` to its grid/thumb/peek/preview sources.

**Tech Stack:** Astro v6.1.5 (View Transitions / `astro:assets` `getImage`), GSAP v3.15.0, native `<dialog>` + History API, Tailwind CSS.

## Global Constraints

- Astro `^6.1.5`, GSAP `^3.15.0` — no new dependencies.
- Node `>=22.12.0`.
- All UI copy is **Polish** (matches existing site). Exact strings are given verbatim in tasks.
- Respect `prefers-reduced-motion: reduce` everywhere (mirror the gallery's existing handling).
- Rely on CSS `transform`/`opacity` for animation (per `DESIGN.md`).
- Design tokens live in `src/styles/global.css` (e.g. `--color-background: #131313`, `--color-on-surface: #e5e2e1`, `--color-primary: #ffaaf8`). Reference tokens, do not hard-code new colors except where a config constant is specified.
- **Pause-first / resume-last ordering is sacred:** `pauseGallery()` runs synchronously in the click task before the dialog opens; `resumeGallery()` runs only after the dialog is fully closed (its native `close` event).
- The gallery loop state (`activeTweens`, `pauseGallery`, `resumeGallery`) and float state (`activeFloatWrapper`, `forceResetActiveFloat`) are **private to `galeria.astro`** and must never be imported by the preview component (Astro bundles component scripts independently).

## Verification Model (read before starting)

This feature is browser-only (native `<dialog>`, GSAP tweens, History API). The spec (§11) **defers automated E2E to a follow-up pass**, and the repo rule (`AGENTS.md`) says *never run tests unless explicitly asked*. Therefore each task's verification is:

1. **Type/build check:** `npm run build` (runs `astro build`, which type-checks `.astro` frontmatter and TS). Expected: build succeeds with no new errors.
2. **Manual browser check:** `npm run dev`, then a concrete checklist of what to observe at `http://localhost:4321/galeria`.

Do **not** write Playwright specs in this plan. Do **not** run `npm run test:e2e`.

Every task ends with a commit. Use `git add <exact files>` then a conventional-commit message.

---

## File Structure

- `src/config/gallery.ts` — **Modify.** Add `PREVIEW_*` constants (config + numeric generation sizes). Existing `FLOAT_*` / loop constants unchanged.
- `src/pages/galeria.astro` — **Modify.** (a) Frontmatter: build the manifest via `getImage` and inject it as a JSON `<script>`. (b) Template: render `<GalleryPreview />`. (c) Script: add resume-free float cancel, the unified delegated click handler, and the `gallery:preview-closed` → `resumeGallery()` listener; **remove** the touch-only float-toggle `click` listener.
- `src/components/gallery/GalleryPreview.astro` — **Create.** Dialog markup + scoped styles + client `<script>` (manifest parse, `render(index)`, open sequence, navigation, close/history, HQ decode/swap + preload, teardown).

---

## Task 1: Preview configuration constants

**Files:**
- Modify: `src/config/gallery.ts` (append after existing exports, before trailing blank lines)

**Interfaces:**
- Produces (imported by `galeria.astro` frontmatter + `GalleryPreview.astro`):
  - CSS-string constants: `PREVIEW_MARGIN_TOP`, `PREVIEW_MARGIN_BOTTOM`, `PREVIEW_COUNTER_GAP`, `PREVIEW_COUNTER_FONT_SIZE`, `PREVIEW_THUMB_SIZE`, `PREVIEW_BACKDROP_BLUR`, `PREVIEW_BACKDROP_DIM` — all `string`.
  - number constants: `PREVIEW_COUNTER_OPACITY`, `PREVIEW_THUMB_ACTIVE_SCALE`, `PREVIEW_THUMB_SIDE_OPACITY`, `PREVIEW_PEEK_OPACITY`, `PREVIEW_PEEK_WIDTH_RATIO`, `PREVIEW_PEEK_HEIGHT_RATIO`, `PREVIEW_OPEN_DURATION`, `PREVIEW_OPEN_START_SCALE` — all `number`.
  - `PREVIEW_OPEN_EASE: string` (GSAP ease name).
  - image-generation sizes (used only in the build-time manifest): `PREVIEW_MAX_WIDTH: number`, `PREVIEW_THUMB_RES: number`, `PREVIEW_PEEK_RES: number`.

- [ ] **Step 1: Add the constants**

Append to `src/config/gallery.ts` (after `FLOAT_SAFETY_BUFFER`, replacing the trailing empty lines):

```typescript
// ── Gallery preview mode ────────────────────────────────
// Layout & chrome (CSS strings unless noted).

/** Hero top inset (also min top for the close button). */
export const PREVIEW_MARGIN_TOP = '4rem';

/** Hero bottom inset, above the thumbnail rail. */
export const PREVIEW_MARGIN_BOTTOM = '1.5rem';

/** Gap between the hero and the counter. */
export const PREVIEW_COUNTER_GAP = '0.75rem';

/** Counter text size. */
export const PREVIEW_COUNTER_FONT_SIZE = '0.95rem';

/** Opacity for the counter text (0..1). */
export const PREVIEW_COUNTER_OPACITY = 0.7;

/** Thumbnail cell size (square). */
export const PREVIEW_THUMB_SIZE = '64px';

/** Center (active) thumb scale relative to side thumbs. */
export const PREVIEW_THUMB_ACTIVE_SCALE = 1.15;

/** Opacity of non-center thumbnails in the strip (0..1). */
export const PREVIEW_THUMB_SIDE_OPACITY = 0.5;

/** Side-peek opacity (0..1). */
export const PREVIEW_PEEK_OPACITY = 0.35;

/** Peek visible width as a ratio of hero width (0..1). */
export const PREVIEW_PEEK_WIDTH_RATIO = 0.08;

/** Peek visible height as a ratio of hero height (0..1). */
export const PREVIEW_PEEK_HEIGHT_RATIO = 0.6;

/** `::backdrop` blur radius. */
export const PREVIEW_BACKDROP_BLUR = '20px';

/** `::backdrop` dim overlay color. */
export const PREVIEW_BACKDROP_DIM = 'rgba(19, 19, 19, 0.72)';

// Motion (the single open/close hero tween).

/** Duration (seconds) of the hero open/close tween. */
export const PREVIEW_OPEN_DURATION = 0.3;

/** Hero starting scale on open / ending scale on close. */
export const PREVIEW_OPEN_START_SCALE = 0.9;

/** GSAP ease for the hero open/close tween. */
export const PREVIEW_OPEN_EASE = 'power2.out';

// Build-time image generation (getImage widths, px).

/** Cap for the full-resolution preview image. */
export const PREVIEW_MAX_WIDTH = 1600;

/** Generated width for thumbnail-strip images (retina-friendly). */
export const PREVIEW_THUMB_RES = 160;

/** Generated width for side-peek images. */
export const PREVIEW_PEEK_RES = 600;
```

- [ ] **Step 2: Verify the build type-checks**

Run: `npm run build`
Expected: build completes with no errors (the new exports are valid TS; nothing imports them yet).

- [ ] **Step 3: Commit**

```bash
git add src/config/gallery.ts
git commit -m "feat(gallery): add preview mode config constants"
```

---

## Task 2: Build-time image manifest

**Files:**
- Modify: `src/pages/galeria.astro` (frontmatter lines 1-37; template — add a JSON `<script>` inside `<main>`)

**Interfaces:**
- Consumes: `getImage` from `astro:assets`; `PREVIEW_MAX_WIDTH`, `PREVIEW_THUMB_RES`, `PREVIEW_PEEK_RES` from Task 1; existing `columns` array (`GalleryImage[][]`) already built in frontmatter.
- Produces: a DOM element `<script type="application/json" id="gallery-manifest">` whose text content is `JSON.stringify(ManifestEntry[])`, sorted ascending by `index`, where:
  ```typescript
  type ManifestEntry = {
    index: number;      // === data-original-index
    alt: string;
    gridSrc: string;
    thumbSrc: string;
    peekSrc: string;
    previewSrc: string;
  };
  ```
  `index` is computed identically to the template's `data-original-index` (`imgIndex * 4 + colIndex`). This shape is consumed by `GalleryPreview.astro` (Task 4).

- [ ] **Step 1: Extend the frontmatter to build the manifest**

In `src/pages/galeria.astro`, update the import on line 2 and the config import on line 5, then append the manifest builder after the column-distribution block (after current line 36 `});`, before the closing `---`).

Change line 2 from:

```astro
import { Image } from 'astro:assets';
```

to:

```astro
import { Image, getImage } from 'astro:assets';
```

Append the preview constants to the existing config import on line 5 (add them to the destructured list):

```astro
import { COLUMN_SPEEDS, IMAGE_GAP, IMAGE_BORDER_RADIUS, GALLERY_PADDING_DESKTOP, GALLERY_PADDING_MOBILE, GALLERY_FADE_HEIGHT, GALLERY_FADE_MIDPOINT_RATIO, FLOAT_HOVER_DELAY_MS, FLOAT_SCALE_AMOUNT, FLOAT_ZOOM_AMOUNT, FLOAT_ANIMATION_DURATION, FLOAT_EASE, PREVIEW_MAX_WIDTH, PREVIEW_THUMB_RES, PREVIEW_PEEK_RES } from '../config/gallery';
```

Append this block just before the closing `---` of the frontmatter:

```astro
// ── Build the preview manifest (sorted by data-original-index) ──
type ManifestEntry = {
  index: number;
  alt: string;
  gridSrc: string;
  thumbSrc: string;
  peekSrc: string;
  previewSrc: string;
};

const manifestPromises: Promise<ManifestEntry>[] = [];
columns.forEach((colImages, colIndex) => {
  colImages.forEach((img, imgIndex) => {
    const index = imgIndex * 4 + colIndex;
    const alt = `Tort ${colIndex + 1}-${imgIndex + 1}`;
    const src = img.src;
    manifestPromises.push(
      (async () => {
        const [grid, thumb, peek, preview] = await Promise.all([
          getImage({ src, width: 500, format: 'webp' }),
          getImage({ src, width: PREVIEW_THUMB_RES, format: 'webp' }),
          getImage({ src, width: PREVIEW_PEEK_RES, format: 'webp' }),
          getImage({ src, width: Math.min(src.width, PREVIEW_MAX_WIDTH), format: 'webp' }),
        ]);
        return {
          index,
          alt,
          gridSrc: grid.src,
          thumbSrc: thumb.src,
          peekSrc: peek.src,
          previewSrc: preview.src,
        };
      })()
    );
  });
});

const galleryManifest: ManifestEntry[] = (await Promise.all(manifestPromises)).sort(
  (a, b) => a.index - b.index
);
```

- [ ] **Step 2: Inject the manifest as a JSON script**

In the template, add the JSON `<script>` immediately after the opening `<main ...>` tag (before the `.gallery-container` div, current line 41):

```astro
    <script type="application/json" id="gallery-manifest" set:html={JSON.stringify(galleryManifest)} is:inline></script>
```

- [ ] **Step 3: Verify the build and manifest output**

Run: `npm run build`
Expected: build succeeds; `getImage` generates the extra variants without errors.

Then run: `npm run dev`, open `http://localhost:4321/galeria`, open DevTools console and run:

```js
JSON.parse(document.getElementById('gallery-manifest').textContent).slice(0, 2)
```

Expected: an array of objects each with `index`, `alt`, `gridSrc`, `thumbSrc`, `peekSrc`, `previewSrc`; `index` values start at 0 and are contiguous/ascending; total length equals the number of gallery images.

- [ ] **Step 4: Commit**

```bash
git add src/pages/galeria.astro
git commit -m "feat(gallery): build preview image manifest at build time"
```

---

## Task 3: GalleryPreview component markup + styles (static shell)

**Files:**
- Create: `src/components/gallery/GalleryPreview.astro`
- Modify: `src/pages/galeria.astro` (import + render the component)

**Interfaces:**
- Consumes: all chrome/layout `PREVIEW_*` constants from Task 1.
- Produces: a closed `<dialog id="gallery-preview">` in the DOM with this stable structure (IDs/classes are the script's contract in Task 4):
  - `.gp-close` (button, `aria-label="Zamknij podgląd"`)
  - `.gp-counter` (`aria-live="polite"`)
  - `.gp-stage` containing `.gp-peek-prev` (img), `.gp-arrow-prev` (button), `.gp-hero` (img, `tabindex="0"`), `.gp-arrow-next` (button), `.gp-peek-next` (img)
  - `.gp-strip` containing 5 `.gp-thumb` buttons (`data-slot="-2..2"`)

- [ ] **Step 1: Create the component with frontmatter + markup**

Create `src/components/gallery/GalleryPreview.astro`:

```astro
---
import {
  PREVIEW_MARGIN_TOP,
  PREVIEW_MARGIN_BOTTOM,
  PREVIEW_COUNTER_GAP,
  PREVIEW_COUNTER_FONT_SIZE,
  PREVIEW_COUNTER_OPACITY,
  PREVIEW_THUMB_SIZE,
  PREVIEW_THUMB_ACTIVE_SCALE,
  PREVIEW_THUMB_SIDE_OPACITY,
  PREVIEW_PEEK_OPACITY,
  PREVIEW_PEEK_WIDTH_RATIO,
  PREVIEW_PEEK_HEIGHT_RATIO,
  PREVIEW_BACKDROP_BLUR,
  PREVIEW_BACKDROP_DIM,
} from '../../config/gallery';

const styleVars = [
  `--gp-margin-top: ${PREVIEW_MARGIN_TOP}`,
  `--gp-margin-bottom: ${PREVIEW_MARGIN_BOTTOM}`,
  `--gp-counter-gap: ${PREVIEW_COUNTER_GAP}`,
  `--gp-counter-font-size: ${PREVIEW_COUNTER_FONT_SIZE}`,
  `--gp-counter-opacity: ${PREVIEW_COUNTER_OPACITY}`,
  `--gp-thumb-size: ${PREVIEW_THUMB_SIZE}`,
  `--gp-thumb-active-scale: ${PREVIEW_THUMB_ACTIVE_SCALE}`,
  `--gp-thumb-side-opacity: ${PREVIEW_THUMB_SIDE_OPACITY}`,
  `--gp-peek-opacity: ${PREVIEW_PEEK_OPACITY}`,
  `--gp-peek-width-ratio: ${PREVIEW_PEEK_WIDTH_RATIO}`,
  `--gp-peek-height-ratio: ${PREVIEW_PEEK_HEIGHT_RATIO}`,
  `--gp-backdrop-blur: ${PREVIEW_BACKDROP_BLUR}`,
  `--gp-backdrop-dim: ${PREVIEW_BACKDROP_DIM}`,
].join('; ');
---

<dialog
  id="gallery-preview"
  class="gallery-preview"
  aria-roledescription="Podgląd galerii"
  style={styleVars}
>
  <button type="button" class="gp-close" aria-label="Zamknij podgląd">
    <span aria-hidden="true">&#10005;</span>
  </button>

  <div class="gp-counter" aria-live="polite"></div>

  <div class="gp-stage">
    <img class="gp-peek gp-peek-prev" alt="" aria-hidden="true" draggable="false" />
    <button type="button" class="gp-arrow gp-arrow-prev" aria-label="Poprzednie zdjęcie">
      <span aria-hidden="true">&#8249;</span>
    </button>

    <img class="gp-hero" alt="" tabindex="0" draggable="false" />

    <button type="button" class="gp-arrow gp-arrow-next" aria-label="Następne zdjęcie">
      <span aria-hidden="true">&#8250;</span>
    </button>
    <img class="gp-peek gp-peek-next" alt="" aria-hidden="true" draggable="false" />
  </div>

  <div class="gp-strip">
    <button type="button" class="gp-thumb" data-slot="-2" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
    <button type="button" class="gp-thumb" data-slot="-1" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
    <button type="button" class="gp-thumb gp-thumb-center" data-slot="0"><img alt="" draggable="false" /></button>
    <button type="button" class="gp-thumb" data-slot="1" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
    <button type="button" class="gp-thumb" data-slot="2" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
  </div>
</dialog>
```

- [ ] **Step 2: Add the scoped styles**

Append this `<style>` block to `GalleryPreview.astro`:

```astro
<style>
  .gallery-preview {
    padding: 0;
    margin: 0;
    border: none;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    max-width: 100vw;
    max-height: 100vh;
    max-height: 100dvh;
    inset: 0;
    background: transparent;
    color: var(--color-on-surface);
    overflow: hidden;
  }

  .gallery-preview:not([open]) {
    display: none;
  }

  .gallery-preview::backdrop {
    background: var(--gp-backdrop-dim);
    backdrop-filter: blur(var(--gp-backdrop-blur));
    -webkit-backdrop-filter: blur(var(--gp-backdrop-blur));
  }

  .gallery-preview[open] {
    display: flex;
    flex-direction: column;
    padding-top: max(var(--gp-margin-top), env(safe-area-inset-top));
    padding-bottom: var(--gp-margin-bottom);
  }

  .gp-close {
    position: absolute;
    top: max(var(--gp-margin-top), env(safe-area-inset-top));
    right: 1.25rem;
    z-index: 3;
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 999px;
    background: var(--color-surface-container);
    color: var(--color-on-surface);
    font-size: 1.1rem;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.2s ease;
  }
  .gp-close:hover { background: var(--color-surface-container-high); transform: scale(1.05); }
  .gp-close:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

  .gp-counter {
    text-align: center;
    font-family: 'Manrope', sans-serif;
    font-size: var(--gp-counter-font-size);
    opacity: var(--gp-counter-opacity);
    margin-bottom: var(--gp-counter-gap);
    flex: 0 0 auto;
  }

  .gp-stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--gp-margin-bottom);
  }

  .gp-hero {
    display: block;
    max-width: calc(100vw - 2rem);
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    position: relative;
    z-index: 2;
    user-select: none;
  }
  .gp-hero:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }

  .gp-peek {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: calc(var(--gp-peek-height-ratio) * 100%);
    width: calc(var(--gp-peek-width-ratio) * 100vw);
    object-fit: cover;
    object-position: center;
    opacity: var(--gp-peek-opacity);
    z-index: 1;
    cursor: pointer;
    user-select: none;
  }
  .gp-peek-prev { left: 0; border-radius: 0 8px 8px 0; }
  .gp-peek-next { right: 0; border-radius: 8px 0 0 8px; }
  .gp-peek.is-hidden { display: none; }

  .gp-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 3;
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 999px;
    background: var(--color-surface-container);
    color: var(--color-on-surface);
    font-size: 1.5rem;
    cursor: pointer;
    transition: background-color 0.2s ease, opacity 0.2s ease;
  }
  .gp-arrow:hover { background: var(--color-surface-container-high); }
  .gp-arrow:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
  .gp-arrow-prev { left: calc(var(--gp-peek-width-ratio) * 100vw + 0.5rem); }
  .gp-arrow-next { right: calc(var(--gp-peek-width-ratio) * 100vw + 0.5rem); }
  .gp-arrow.is-disabled { opacity: 0.25; pointer-events: none; }

  .gp-strip {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: calc(var(--gp-thumb-size) * var(--gp-thumb-active-scale));
  }

  .gp-thumb {
    flex: 0 0 auto;
    width: var(--gp-thumb-size);
    height: var(--gp-thumb-size);
    padding: 0;
    border: none;
    border-radius: 6px;
    overflow: hidden;
    background: var(--color-surface-container-low);
    cursor: pointer;
    opacity: var(--gp-thumb-side-opacity);
    transition: opacity 0.2s ease, transform 0.2s ease;
  }
  .gp-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gp-thumb-center { opacity: 1; transform: scale(var(--gp-thumb-active-scale)); }
  .gp-thumb.is-empty { visibility: hidden; pointer-events: none; }
  .gp-thumb:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .gp-close, .gp-arrow, .gp-thumb { transition: none; }
  }
</style>
```

- [ ] **Step 3: Render the component in `galeria.astro`**

In `src/pages/galeria.astro`, add the import after the `Layout` import (current line 3):

```astro
import GalleryPreview from '../components/gallery/GalleryPreview.astro';
```

Then render it just before the closing `</main>` tag (after the `.gallery-container` closing `</div>`, current line 83):

```astro
    <GalleryPreview />
```

- [ ] **Step 4: Verify build + static shell**

Run: `npm run build`
Expected: build succeeds.

Then `npm run dev`, open `/galeria`, in the console run:

```js
document.getElementById('gallery-preview').showModal()
```

Expected: a full-screen dialog appears with a blurred/dimmed backdrop over the (still-running) gallery, a ✕ top-right, an empty counter, an empty hero area with prev/next arrows and peek slots, and a 5-cell thumb strip. Images are empty (no `src` yet) — that is expected at this stage. Run `document.getElementById('gallery-preview').close()` to dismiss.

- [ ] **Step 5: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro src/pages/galeria.astro
git commit -m "feat(gallery): add preview dialog markup and styles"
```

---

## Task 4: Preview open sequence + instant content render

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro` (add `<script>`)

**Interfaces:**
- Consumes: `#gallery-manifest` JSON (Task 2, `ManifestEntry[]`); `.scroll-container` (Layout); `document` event `gallery:open-preview` with `{ detail: { index: number } }` (dispatched by Task 5); `gsap`; motion constants `PREVIEW_OPEN_DURATION`, `PREVIEW_OPEN_START_SCALE`, `PREVIEW_OPEN_EASE` from config.
- Produces: opens the dialog and renders content for a given index. Internal functions (used by later tasks in the same script): `render(index: number)`, `openPreview(index: number)`, `state.current`, `state.total`, `state.manifest`. Dispatches nothing yet (close/history/resume come in Task 7).

- [ ] **Step 1: Add the script with state, manifest parse, and `render`**

Append this `<script>` block to `GalleryPreview.astro`. (Later tasks extend the same script; this step establishes state, `render`, and the open path.)

```astro
<script>
  import gsap from 'gsap';
  import {
    PREVIEW_OPEN_DURATION,
    PREVIEW_OPEN_START_SCALE,
    PREVIEW_OPEN_EASE,
  } from '../../config/gallery';

  type ManifestEntry = {
    index: number;
    alt: string;
    gridSrc: string;
    thumbSrc: string;
    peekSrc: string;
    previewSrc: string;
  };

  const state = {
    manifest: [] as ManifestEntry[],
    current: 0,
    total: 0,
    isOpen: false,
    isClosing: false,
  };

  let dialog: HTMLDialogElement | null = null;
  let heroEl: HTMLImageElement | null = null;
  let counterEl: HTMLElement | null = null;
  let peekPrevEl: HTMLImageElement | null = null;
  let peekNextEl: HTMLImageElement | null = null;
  let arrowPrevEl: HTMLButtonElement | null = null;
  let arrowNextEl: HTMLButtonElement | null = null;
  let thumbEls: HTMLButtonElement[] = [];
  let previewController: AbortController | null = null;

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function entryFor(index: number): ManifestEntry | undefined {
    return state.manifest.find((e) => e.index === index);
  }

  /**
   * Instantly render all chrome + hero for the given index.
   * No animation — a plain content swap (spec §5c).
   */
  function render(index: number): void {
    const entry = entryFor(index);
    if (!entry || !heroEl) return;
    state.current = index;

    // Hero: show the best immediately-available source (grid res); HQ swap comes in Task 8.
    heroEl.src = entry.gridSrc;
    heroEl.setAttribute('aria-label', entry.alt);

    // Counter (1-based).
    if (counterEl) counterEl.textContent = `${index + 1} / ${state.total}`;

    // Peeks (prev/next), hidden at the ends.
    const prev = entryFor(index - 1);
    const next = entryFor(index + 1);
    if (peekPrevEl) {
      if (prev) { peekPrevEl.src = prev.peekSrc; peekPrevEl.classList.remove('is-hidden'); }
      else { peekPrevEl.classList.add('is-hidden'); }
    }
    if (peekNextEl) {
      if (next) { peekNextEl.src = next.peekSrc; peekNextEl.classList.remove('is-hidden'); }
      else { peekNextEl.classList.add('is-hidden'); }
    }

    // Arrows: disabled at ends.
    arrowPrevEl?.classList.toggle('is-disabled', !prev);
    arrowNextEl?.classList.toggle('is-disabled', !next);

    // Thumb strip: slots [i-2 .. i+2].
    thumbEls.forEach((thumb) => {
      const slot = parseInt(thumb.dataset.slot || '0', 10);
      const target = entryFor(index + slot);
      const img = thumb.querySelector('img') as HTMLImageElement | null;
      if (target && img) {
        img.src = target.thumbSrc;
        thumb.classList.remove('is-empty');
        thumb.dataset.index = String(target.index);
        thumb.setAttribute('aria-label', `Zdjęcie ${target.index + 1}`);
        thumb.removeAttribute('disabled');
      } else {
        thumb.classList.add('is-empty');
        delete thumb.dataset.index;
        if (img) img.removeAttribute('src');
      }
    });

    // Announce for screen readers.
    if (counterEl) counterEl.setAttribute('data-sr', `Zdjęcie ${index + 1} z ${state.total}`);
  }
</script>
```

- [ ] **Step 2: Add the open sequence + init/cleanup in the same script**

Append inside the same `<script>` (after `render`):

```astro
<script>
  function lockScroll(): void {
    const sc = document.querySelector('.scroll-container') as HTMLElement | null;
    if (sc) sc.style.overflow = 'hidden';
  }

  /**
   * Open sequence (spec §5a). Runs synchronously inside the
   * `gallery:open-preview` listener so "pause first" ordering holds.
   */
  function openPreview(index: number): void {
    if (!dialog || !heroEl || state.isOpen) return;
    state.isOpen = true;
    state.isClosing = false;

    lockScroll();
    // History push comes in Task 7.
    dialog.showModal();
    render(index);

    // Chrome is already at final state via CSS; only the hero animates.
    if (prefersReducedMotion()) {
      gsap.set(heroEl, { scale: 1, opacity: 1 });
    } else {
      gsap.fromTo(
        heroEl,
        { scale: PREVIEW_OPEN_START_SCALE, opacity: 0 },
        { scale: 1, opacity: 1, duration: PREVIEW_OPEN_DURATION, ease: PREVIEW_OPEN_EASE }
      );
    }
    // HQ decode/swap + preload come in Task 8.
  }

  function initPreview(): void {
    dialog = document.getElementById('gallery-preview') as HTMLDialogElement | null;
    if (!dialog) return;

    const manifestEl = document.getElementById('gallery-manifest');
    if (manifestEl?.textContent) {
      try {
        state.manifest = JSON.parse(manifestEl.textContent) as ManifestEntry[];
      } catch {
        state.manifest = [];
      }
    }
    state.total = state.manifest.length;

    heroEl = dialog.querySelector('.gp-hero');
    counterEl = dialog.querySelector('.gp-counter');
    peekPrevEl = dialog.querySelector('.gp-peek-prev');
    peekNextEl = dialog.querySelector('.gp-peek-next');
    arrowPrevEl = dialog.querySelector('.gp-arrow-prev');
    arrowNextEl = dialog.querySelector('.gp-arrow-next');
    thumbEls = Array.from(dialog.querySelectorAll('.gp-thumb'));

    previewController?.abort();
    previewController = new AbortController();
    const { signal } = previewController;

    document.addEventListener(
      'gallery:open-preview',
      (e: Event) => {
        const detail = (e as CustomEvent<{ index: number }>).detail;
        if (detail && Number.isInteger(detail.index)) openPreview(detail.index);
      },
      { signal }
    );
    // Navigation, close/history, and teardown listeners are added in Tasks 6, 7, 9.
  }

  if (!(window as any).__galleryPreviewListenerAdded) {
    document.addEventListener('astro:page-load', initPreview);
    (window as any).__galleryPreviewListenerAdded = true;
  }
</script>
```

> Note: Astro merges multiple `<script>` blocks in one component into a single module, so the two blocks above share scope. You may also keep everything in one `<script>` block if you prefer.

- [ ] **Step 3: Verify open + render manually**

Run: `npm run build` (expected: succeeds).
Then `npm run dev`, open `/galeria`, in the console run:

```js
document.dispatchEvent(new CustomEvent('gallery:open-preview', { detail: { index: 5 } }))
```

Expected: the dialog opens with a brief scale/opacity tween on the hero; the hero shows image #5 (grid res), the counter reads `6 / N`, both peeks show neighbors, arrows are enabled, and the thumb strip shows 5 images centered on #5. Try index `0` — prev peek + prev arrow hidden/disabled. Close via `document.getElementById('gallery-preview').close()` for now.

With OS reduced-motion enabled, re-run: the hero appears instantly (no tween). Note: the gallery keeps scrolling and the page does not scroll-lock cleanly yet — full pause/scroll integration lands in Tasks 5 and 7.

- [ ] **Step 4: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro
git commit -m "feat(gallery): render preview content and open sequence"
```

---

## Task 5: Gallery-side integration (pause, click handler, float cancel)

**Files:**
- Modify: `src/pages/galeria.astro` (`<script>` section — `forceResetActiveFloat`, remove touch toggle, add click handler + resume listener in `initGallery`)

**Interfaces:**
- Consumes: existing `pauseGallery()`, `resumeGallery()`, `activeFloatWrapper`, `activeFloatTimeline`, `pendingTimer`, `pendingWrapper`; the `#gallery-container` element; the manifest (for kicking off HQ decode by index).
- Produces (the cross-script contract, spec §3):
  - Dispatches `document` event `gallery:open-preview` with `{ detail: { index } }` on a valid tile click.
  - Listens for `gallery:preview-closed` → calls `resumeGallery()`.
  - New function `cancelActiveFloat()` — resume-free float reset.

- [ ] **Step 1: Add a resume-free float cancel**

In `src/pages/galeria.astro`'s `<script>`, refactor `forceResetActiveFloat` (current lines 281-314) so the DOM/state reset is resume-free and the public function keeps its resume behavior. Replace the whole function with:

```typescript
  /**
   * Reset float DOM/state WITHOUT resuming the loop.
   * Used by the preview open path (the loop is about to be paused).
   */
  function cancelActiveFloat(): void {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    pendingWrapper = null;

    if (activeFloatTimeline) {
      activeFloatTimeline.kill();
      activeFloatTimeline = null;
    }

    if (activeFloatWrapper) {
      const col = activeFloatWrapper.closest('.gallery-column') as HTMLElement;
      const img = activeFloatWrapper.querySelector('.gallery-image') as HTMLElement;

      gsap.set(activeFloatWrapper, { clearProps: 'scale,zIndex,y' });
      activeFloatWrapper.classList.remove('is-floating');
      if (img) gsap.set(img, { clearProps: 'scale' });

      if (col) {
        col.classList.remove('is-elevated');
        col.style.zIndex = '';
        const colWrappers = col.querySelectorAll('.gallery-image-wrapper');
        gsap.set(colWrappers, { clearProps: 'y' });
      }

      activeFloatWrapper = null;
    }
  }

  /**
   * Immediately kill any running float animation, restore all state,
   * and resume the loop. (Used by hover-out, resize, and cleanup.)
   */
  function forceResetActiveFloat(): void {
    cancelActiveFloat();
    resumeGallery();
  }
```

- [ ] **Step 2: Remove the touch float-toggle listener**

In `attachFloatListeners` (current lines 530-550), delete the entire `// ── Mobile: tap to toggle ──` block (the `container.addEventListener('click', ...)` that checks `pe.pointerType !== 'touch'`). On mobile, taps will now open the preview via the unified handler added next.

- [ ] **Step 3: Add the unified click handler + resume listener**

In `initGallery`, after `attachFloatListeners(container, signal);` (current line 760), add:

```typescript
    // ── Preview: unified click handler (all pointer types) ──
    const previewManifest = (() => {
      const el = document.getElementById('gallery-manifest');
      if (!el?.textContent) return [] as { index: number; previewSrc: string }[];
      try {
        return JSON.parse(el.textContent) as { index: number; previewSrc: string }[];
      } catch {
        return [] as { index: number; previewSrc: string }[];
      }
    })();

    container.addEventListener(
      'click',
      (e: MouseEvent) => {
        const wrapper = (e.target as HTMLElement).closest(
          '.gallery-image-wrapper'
        ) as HTMLElement | null;
        if (!wrapper) return;

        const raw = wrapper.dataset.originalIndex;
        const index = raw != null ? parseInt(raw, 10) : NaN;
        // Guard: duplicates only get the attribute at runtime; ignore if unresolved.
        if (Number.isNaN(index)) return;

        e.preventDefault();

        // Resume-free float cancel, then pause FIRST (synchronously).
        cancelActiveFloat();
        pauseGallery();

        // Kick off HQ decode for the clicked index immediately (spec §4 Loading).
        const entry = previewManifest.find((m) => m.index === index);
        if (entry) {
          const pre = new Image();
          pre.src = entry.previewSrc;
        }

        document.dispatchEvent(
          new CustomEvent('gallery:open-preview', { detail: { index } })
        );
      },
      { signal }
    );

    // ── Preview: resume the loop once the preview is fully closed ──
    document.addEventListener(
      'gallery:preview-closed',
      () => resumeGallery(),
      { signal }
    );
```

- [ ] **Step 4: Verify pause-first + open flow**

Run: `npm run build` (expected: succeeds — note `forceResetActiveFloat` is still referenced by resize/cleanup so no dead code).
Then `npm run dev`, open `/galeria`:
- Click any scrolling tile: the gallery **pauses immediately**, then the preview opens at that image. Confirm the index matches the clicked image.
- Hover a tile until it floats, then click it: the float cancels (no resume tween) and the preview opens.
- On a narrow viewport / device emulation, tap a tile: the preview opens (no float toggle).
- The gallery is still scrolling in the blurred background because resume only fires on `gallery:preview-closed` (dispatched in Task 7) — for now, closing via `document.getElementById('gallery-preview').close()` will NOT resume yet. That is expected until Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/pages/galeria.astro
git commit -m "feat(gallery): pause + open preview on tile click, remove touch float toggle"
```

---

## Task 6: In-preview navigation (arrows, peeks, thumbs, keyboard)

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro` (`<script>` — add nav functions + listeners in `initPreview`)

**Interfaces:**
- Consumes: `render(index)`, `state.current`, `state.total`, `entryFor`, `arrowPrevEl/arrowNextEl`, `peekPrevEl/peekNextEl`, `thumbEls`, the `previewController` signal, `dialog`.
- Produces: internal `goTo(index)`, `goPrev()`, `goNext()` (used by Task 8 for directional preload). All navigation updates content **instantly** (no animation), with no-wrap at ends.

- [ ] **Step 1: Add navigation functions**

Inside `GalleryPreview.astro`'s script (after `render`), add:

```typescript
  function goTo(index: number): void {
    if (!state.isOpen) return;
    if (index < 0 || index >= state.total || index === state.current) return;
    render(index);
    // Directional preload is added in Task 8.
  }

  function goPrev(): void { goTo(state.current - 1); }
  function goNext(): void { goTo(state.current + 1); }
```

- [ ] **Step 2: Wire nav listeners in `initPreview`**

In `initPreview`, after the `gallery:open-preview` listener, add (all use `{ signal }`):

```typescript
    arrowPrevEl?.addEventListener('click', () => goPrev(), { signal });
    arrowNextEl?.addEventListener('click', () => goNext(), { signal });
    peekPrevEl?.addEventListener('click', () => goPrev(), { signal });
    peekNextEl?.addEventListener('click', () => goNext(), { signal });

    thumbEls.forEach((thumb) => {
      thumb.addEventListener(
        'click',
        () => {
          const idx = thumb.dataset.index;
          if (idx != null) goTo(parseInt(idx, 10));
        },
        { signal }
      );
    });

    dialog?.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (!state.isOpen) return;
        switch (e.key) {
          case 'ArrowLeft': e.preventDefault(); goPrev(); break;
          case 'ArrowRight': e.preventDefault(); goNext(); break;
          case 'Home': e.preventDefault(); goTo(0); break;
          case 'End': e.preventDefault(); goTo(state.total - 1); break;
        }
      },
      { signal }
    );
```

- [ ] **Step 3: Verify navigation**

Run: `npm run build` (expected: succeeds).
Then `npm run dev`, open `/galeria`, click a middle tile, then verify (all instant, no transition):
- Right/left arrows move next/prev; disabled + dimmed at the last/first image.
- Clicking the prev/next peek navigates.
- Clicking a side thumb jumps to that index; empty end-slots do nothing.
- Keyboard: `←`/`→` prev/next, `Home` → image 1, `End` → last image.
- Counter and thumb strip update on every navigation.

- [ ] **Step 4: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro
git commit -m "feat(gallery): in-preview navigation via arrows, peeks, thumbs, keyboard"
```

---

## Task 7: Close sequence, history, focus, and resume

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro` (`<script>` — history push in `openPreview`, close/history functions, listeners)

**Interfaces:**
- Consumes: `openPreview`, `state`, `dialog`, `heroEl`, motion constants, `previewController` signal.
- Produces (spec §5b, §6): `requestClose()`, `runCloseTeardown()`, and the full history lifecycle. On full close, dispatches `document` event `gallery:preview-closed` (consumed by Task 5's `resumeGallery`). Focus restores to the original wrapper for the last-viewed index.

- [ ] **Step 1: Push history state on open**

In `openPreview`, add the history push immediately before `dialog.showModal();`:

```typescript
    history.pushState({ galleryPreview: true }, '', location.href);
```

- [ ] **Step 2: Track the trigger index for focus restore**

At the top of the script (with the other `let` declarations), add:

```typescript
  let lastOpenedIndex = 0;
```

In `openPreview`, set it right after `state.isOpen = true;`:

```typescript
    lastOpenedIndex = index;
```

And in `goTo`, after `render(index);` update it so focus restores to the last-viewed image:

```typescript
    lastOpenedIndex = index;
```

- [ ] **Step 3: Add close + history + focus functions**

Add to the script:

```typescript
  function unlockScroll(): void {
    const sc = document.querySelector('.scroll-container') as HTMLElement | null;
    if (sc) sc.style.overflow = '';
  }

  function restoreFocus(): void {
    const target = document.querySelector(
      `.gallery-set-original .gallery-image-wrapper[data-original-index="${lastOpenedIndex}"]`
    ) as HTMLElement | null;
    (target ?? document.body).focus?.();
  }

  /**
   * User-initiated close funnel (✕, Escape, backdrop). Routes through
   * history so DOM + history stay in lockstep (spec §6).
   */
  function requestClose(): void {
    if (!state.isOpen || state.isClosing) return;
    history.back(); // → popstate → runCloseTeardown()
  }

  /**
   * Reverse tween → dialog.close(). Called from the popstate handler.
   */
  function runCloseTeardown(): void {
    if (!state.isOpen || state.isClosing || !dialog || !heroEl) return;
    state.isClosing = true;

    const finish = () => dialog!.close();
    if (prefersReducedMotion()) {
      gsap.set(heroEl, { opacity: 0 });
      finish();
    } else {
      gsap.to(heroEl, {
        scale: PREVIEW_OPEN_START_SCALE,
        opacity: 0,
        duration: PREVIEW_OPEN_DURATION,
        ease: PREVIEW_OPEN_EASE,
        onComplete: finish,
      });
    }
  }
```

- [ ] **Step 4: Wire close/history listeners in `initPreview`**

Add these inside `initPreview` (all `{ signal }`):

```typescript
    // ✕ button.
    dialog?.querySelector('.gp-close')?.addEventListener('click', () => requestClose(), { signal });

    // Backdrop click (target is the dialog itself only for backdrop hits).
    dialog?.addEventListener('click', (e: MouseEvent) => {
      if (e.target === dialog) requestClose();
    }, { signal });

    // Escape: intercept native cancel, route through history instead.
    dialog?.addEventListener('cancel', (e: Event) => {
      e.preventDefault();
      requestClose();
    }, { signal });

    // History back → tear down.
    window.addEventListener('popstate', () => {
      if (state.isOpen && !state.isClosing) runCloseTeardown();
    }, { signal });

    // Native close (fully closed): unlock, restore focus, resume, defensive pop.
    dialog?.addEventListener('close', () => {
      state.isOpen = false;
      state.isClosing = false;
      unlockScroll();
      restoreFocus();
      document.dispatchEvent(new CustomEvent('gallery:preview-closed'));
      if (history.state?.galleryPreview) history.back();
    }, { signal });
```

- [ ] **Step 5: Verify close + history + resume**

Run: `npm run build` (expected: succeeds).
Then `npm run dev`, open `/galeria`, click a tile to open the preview, then verify:
- ✕ closes with the reverse tween; the gallery **resumes scrolling only after** the dialog is gone.
- Escape closes the same way (single press).
- Clicking the backdrop (dark area outside hero/peeks/strip/✕) closes; clicking hero/arrows/thumbs does not.
- Browser Back: first press closes the preview, second press leaves `/galeria`.
- After close, keyboard focus returns to the originating image tile in the grid (Tab shows focus ring near it).
- With reduced motion: open/close are instant.

- [ ] **Step 6: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro
git commit -m "feat(gallery): preview close sequence with history, focus restore, resume"
```

---

## Task 8: High-res decode/swap + directional preloading

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro` (`<script>` — HQ swap + preload)

**Interfaces:**
- Consumes: `entryFor`, `render`, `goTo`, `openPreview`, `state.current`, `heroEl`.
- Produces: `swapHeroHQ(index)` (off-DOM `decode()` then in-place `src` set, race-guarded), `preload(index)`. Wires HQ swap into `render`/open and directional preload into `goTo`/open.

- [ ] **Step 1: Add HQ swap + preload helpers**

Add to the script:

```typescript
  let heroSwapToken = 0;

  function preload(index: number): void {
    const entry = entryFor(index);
    if (!entry) return;
    const img = new Image();
    img.src = entry.previewSrc;
  }

  /**
   * Off-DOM decode of previewSrc, then in-place src swap — no flash,
   * no spinner, no layout shift (spec §4). Race-guarded so a fast
   * navigation cannot let a stale HQ image win.
   */
  async function swapHeroHQ(index: number): Promise<void> {
    const entry = entryFor(index);
    if (!entry || !heroEl) return;
    const token = ++heroSwapToken;
    const img = new Image();
    img.src = entry.previewSrc;
    try {
      await img.decode();
    } catch {
      // decode() failure: fall back to direct src (visible pop is acceptable).
    }
    // Only apply if still the current image and no newer swap started.
    if (token === heroSwapToken && state.current === index && heroEl) {
      heroEl.src = entry.previewSrc;
    }
  }
```

- [ ] **Step 2: Trigger HQ swap after each render**

At the end of `render(index)` (after the SR announcement line), add:

```typescript
    void swapHeroHQ(index);
```

- [ ] **Step 3: Add directional preloading**

In `goTo`, replace the `// Directional preload is added in Task 8.` comment with directional preload based on travel direction:

```typescript
    const dir = index > state.current ? 1 : -1;
    render(index);
    lastOpenedIndex = index;
    preload(index + dir);
```

> Note: this replaces the earlier `render(index);` + `lastOpenedIndex = index;` lines from Tasks 6/7 inside `goTo` — keep a single copy. Final `goTo` body:
> ```typescript
> function goTo(index: number): void {
>   if (!state.isOpen) return;
>   if (index < 0 || index >= state.total || index === state.current) return;
>   const dir = index > state.current ? 1 : -1;
>   render(index);
>   lastOpenedIndex = index;
>   preload(index + dir);
> }
> ```

In `openPreview`, after the hero tween block, add neighbor preload:

```typescript
    preload(index - 1);
    preload(index + 1);
```

- [ ] **Step 4: Verify HQ swap + preload**

Run: `npm run build` (expected: succeeds).
Then `npm run dev`, open `/galeria` (DevTools Network tab open):
- Open a tile: the hero starts soft (grid res) and sharpens once `previewSrc` decodes — no spinner, no flash, no layout shift. On a warm click the HQ is often ready before the tween ends (decode kicked off at click time in Task 5).
- Navigate next/prev: content swaps instantly; HQ sharpens in place; Network shows the next-in-direction `previewSrc` prefetched.
- Rapid arrow spamming never shows a stale image settle in (race guard).

- [ ] **Step 5: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro
git commit -m "feat(gallery): decode HQ hero off-DOM and preload neighbors"
```

---

## Task 9: Teardown on navigation + edge cases

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro` (`<script>` — `astro:before-swap`, resize handler)

**Interfaces:**
- Consumes: `dialog`, `state`, `previewController`, `unlockScroll`.
- Produces: `astro:before-swap` handler (immediate teardown + dangling-history pop + `gallery:preview-closed` dispatch + listener abort); resize handler is a no-op beyond CSS (hero `max-height` is CSS-driven) but ensures the backdrop stays correct.

- [ ] **Step 1: Add scrollbar-gutter compensation (Layout)**

In `src/layouts/Layout.astro`'s global `<style>`, scope a gutter to the gallery page so scroll-lock does not shift the frozen gallery. Add after the `.scroll-container { ... }` rule (current line 97):

```css
  body.gallery-page-active .scroll-container {
    scrollbar-gutter: stable;
  }
```

- [ ] **Step 2: Add `astro:before-swap` teardown**

In `GalleryPreview.astro`'s script, after the `astro:page-load` registration guard, add a before-swap guard:

```typescript
  if (!(window as any).__galleryPreviewBeforeSwapAdded) {
    document.addEventListener('astro:before-swap', () => {
      if (dialog?.open) {
        // Immediate, no animation.
        state.isClosing = true;
        dialog.close();
      } else {
        unlockScroll();
      }
      // Pop any dangling preview history entry so a later Back doesn't misfire.
      if (history.state?.galleryPreview) history.back();
      previewController?.abort();
      previewController = null;
    });
    (window as any).__galleryPreviewBeforeSwapAdded = true;
  }
```

> The `dialog.close()` above fires the native `close` handler (Task 7), which unlocks scroll, dispatches `gallery:preview-closed`, and defensively pops history — so teardown stays consistent even mid-navigation.

- [ ] **Step 3: Keep hero max-height correct on resize**

The hero `max-height` is CSS-driven (`.gp-stage` `flex: 1` + `.gp-hero { max-height: 100% }`), so resize needs no JS recompute. Add a lightweight guard only to re-assert the hero fits after orientation changes (defensive; the CSS already handles it). No code needed beyond confirming the CSS in Task 3 is present. **Verification only** — no edit.

- [ ] **Step 4: Verify edge cases**

Run: `npm run build` (expected: succeeds).
Then `npm run dev`, open `/galeria`:
- Open the preview, then click a nav link (e.g. logo/home): the preview tears down immediately, scroll unlocks, and after returning to `/galeria` a single browser Back does **not** resurrect a stale preview (no dangling history entry).
- Resize the window / rotate device with the preview open: the hero re-fits within the viewport; the blurred backdrop re-covers the screen; no layout break.
- Single-image gallery scenario (if testable): no peeks, both arrows disabled, strip shows one active thumb, counter `1 / 1`.
- Enable OS reduced motion, reload `/galeria`: clicking a **duplicate** tile does nothing (no `data-original-index` because redistribution is skipped); clicking an **original** tile still opens the preview instantly.

- [ ] **Step 5: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro src/layouts/Layout.astro
git commit -m "feat(gallery): teardown preview on navigation and handle edge cases"
```

---

## Self-Review

**1. Spec coverage:**

| Spec area | Task |
|-----------|------|
| Config constants (§8) | Task 1 |
| Build-time manifest, index resolution (§3) | Task 2, Task 5 (click guard) |
| Dialog markup, backdrop, peeks, strip, counter, close btn (§4) | Task 3 |
| Open sequence, reduced motion, instant chrome (§5a) | Task 4 |
| Pause-first, resume-free float cancel, remove touch toggle, click handler (§3, §7) | Task 5 |
| Navigation (arrows/peeks/thumbs/keyboard, ends) (§5c, §6) | Task 6 |
| Close sequence, history, Escape intercept, focus restore, resume (§5b, §6, §9) | Task 7 |
| HQ decode/swap, directional preload, cold-open mitigation (§4) | Task 8 (+ decode kickoff in Task 5) |
| `astro:before-swap`, scroll-lock gutter, resize, single-image, reduced-motion duplicates (§6, §10) | Task 9 |
| Accessibility: roledescription, aria-labels, aria-live, focus order (§9) | Task 3 (markup) + Task 7 (focus) |

All spec sections map to a task. Automated E2E (§11 "future") is intentionally excluded per the spec and repo rules.

**2. Placeholder scan:** No `TODO`/`TBD`/"add error handling" placeholders; every code step contains complete code. Forward-references ("added in Task N") are deliberate sequencing notes, not missing content — each referenced piece is fully specified in its own task.

**3. Type consistency:** `ManifestEntry` shape is identical across Task 2 (producer) and Task 4 (consumer). Function names are stable: `render`, `openPreview`, `goTo`/`goPrev`/`goNext`, `requestClose`, `runCloseTeardown`, `swapHeroHQ`, `preload`, `unlockScroll`, `lockScroll`, `restoreFocus` (preview script); `cancelActiveFloat`/`forceResetActiveFloat` (gallery script). Event names `gallery:open-preview` / `gallery:preview-closed` are consistent between dispatcher (Task 5 / Task 7) and listener (Task 4 / Task 5). `goTo` is defined once (Task 6) and finalized once (Task 8, with the explicit final-body note to avoid duplication).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-12-gallery-preview-mode.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
