# Gallery Preview Mode — Layout Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing `/galeria` preview mode layout — hero-relative peeks/arrows, counter moved below the hero, thumb strip overlaid on the hero, and tighter configurable viewport margins — with no changes to animation, navigation, history, pause/resume, or image loading.

**Architecture:** Two nested layout layers inside the stage: a `.gp-hero-frame` (`position: relative; width: fit-content`) sized exactly to the rendered hero image (peeks + thumb strip position absolutely inside it), wrapped in a `.gp-hero-stack` flow column that adds the counter row below the frame. Arrows stay on `.gp-stage` and are positioned purely in CSS from custom properties (`--gp-frame-left/right/width/height`) written by a `ResizeObserver` on the frame. Everything else is CSS-driven.

**Tech Stack:** Astro v6.1.5 (View Transitions), GSAP v3.15.0, Tailwind CSS v4. Single self-contained component `src/components/gallery/GalleryPreview.astro` + constants in `src/config/gallery.ts`.

## Global Constraints

- **Scope:** Layout/CSS/JS-positioning only. Do **not** change the open/close GSAP tween, in-preview navigation, gallery pause/resume, history handling, scroll lock, focus restore, `decode()`/HQ-swap image loading, or the manifest structure.
- **Node:** `>=22.12.0` (from `package.json` `engines`).
- **No new dependencies.** Use only Astro, GSAP, and native browser APIs (`ResizeObserver`, `getBoundingClientRect`).
- **Preserve all v1 behaviors:** open/close tween, instant nav, pause/resume, history close (`requestClose()` → `history.back()`), Escape via `cancel`, `astro:before-swap` teardown, reduced-motion handling, duplicate-tile index guard.
- **Counter:** single line only (`white-space: nowrap`), never wraps; non-interactive; not in tab order. Visible text **and** `aria-live` announcement both use the `"3 / 16"` format.
- **Thumbs:** visible image size `38px`; each thumb button keeps at least a `44px` hit target.
- **Safe-area aware:** effective insets are `max(PREVIEW_MARGIN_*, env(safe-area-inset-*))`.
- **New config defaults (exact):** `PREVIEW_MARGIN_TOP = '1.5rem'`, `PREVIEW_MARGIN_BOTTOM = '1.5rem'`, `PREVIEW_MARGIN_INLINE = '1rem'`, `PREVIEW_THUMB_SIZE = '38px'`, `PREVIEW_THUMB_INSET = '0.5rem'`, `PREVIEW_ARROW_GAP = '0.5rem'`. Unchanged: `PREVIEW_COUNTER_GAP = '0.75rem'`, `PREVIEW_COUNTER_FONT_SIZE = '0.95rem'`, `PREVIEW_COUNTER_OPACITY = 0.7`, `PREVIEW_THUMB_ACTIVE_SCALE = 1.15`, `PREVIEW_THUMB_SIDE_OPACITY = 0.5`, `PREVIEW_PEEK_WIDTH_RATIO = 0.08`, `PREVIEW_PEEK_HEIGHT_RATIO = 0.6`, `PREVIEW_PEEK_OPACITY = 0.35`.
- **Verification:** there are no automated tests for this feature (E2E is deferred per spec §8). Each task verifies with `npm run build` (type-check + build must pass) plus the task's manual checklist against `npm run dev` at `http://localhost:4321/galeria`. Do **not** author E2E tests. Commit after each task.

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/config/gallery.ts` | `PREVIEW_*` constants | Add 3 constants; change 2 defaults |
| `src/components/gallery/GalleryPreview.astro` | Dialog markup, styles, client script | Restructure DOM, rewrite layout CSS, add `ResizeObserver` arrow positioning, change counter SR text |

No other files change. `src/pages/galeria.astro` only imports `PREVIEW_MAX_WIDTH`, `PREVIEW_THUMB_RES`, `PREVIEW_PEEK_RES` (unaffected).

---

## Task 1: Config constants

**Files:**
- Modify: `src/config/gallery.ts:60-91`

**Interfaces:**
- Consumes: nothing.
- Produces: `PREVIEW_MARGIN_TOP` (`'1.5rem'`), `PREVIEW_MARGIN_BOTTOM` (`'1.5rem'`), `PREVIEW_MARGIN_INLINE` (`'1rem'`, new), `PREVIEW_THUMB_SIZE` (`'38px'`), `PREVIEW_THUMB_INSET` (`'0.5rem'`, new), `PREVIEW_ARROW_GAP` (`'0.5rem'`, new). All exported `string` constants consumed by `GalleryPreview.astro`'s frontmatter.

- [ ] **Step 1: Update the two changed defaults and add three new constants**

In `src/config/gallery.ts`, change `PREVIEW_MARGIN_TOP` from `'4rem'` to `'1.5rem'` and update its comment; add `PREVIEW_MARGIN_INLINE` after `PREVIEW_MARGIN_BOTTOM`; change `PREVIEW_THUMB_SIZE` from `'64px'` to `'38px'`; add `PREVIEW_THUMB_INSET`; add `PREVIEW_ARROW_GAP`. The relevant region should read:

```typescript
/** Viewport top edge → hero top edge (also min top for the close button). */
export const PREVIEW_MARGIN_TOP = '1.5rem';

/** Hero bottom edge → viewport bottom edge (counter + its gap live inside this band). */
export const PREVIEW_MARGIN_BOTTOM = '1.5rem';

/** Minimum inline inset from viewport / safe-area edges (arrows, peeks, hero stack). */
export const PREVIEW_MARGIN_INLINE = '1rem';

/** Gap between the hero and the counter. */
export const PREVIEW_COUNTER_GAP = '0.75rem';

/** Counter text size. */
export const PREVIEW_COUNTER_FONT_SIZE = '0.95rem';

/** Opacity for the counter text (0..1). */
export const PREVIEW_COUNTER_OPACITY = 0.7;

/** Thumbnail cell size (square, visible image). */
export const PREVIEW_THUMB_SIZE = '38px';

/** Gap from the hero bottom edge to the overlaid thumb strip. */
export const PREVIEW_THUMB_INSET = '0.5rem';

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

/** Gap between a peek's outer edge and the arrow. */
export const PREVIEW_ARROW_GAP = '0.5rem';
```

Leave `PREVIEW_BACKDROP_*`, motion constants, and image-generation constants untouched.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: build completes with no TypeScript or Astro errors. (The new constants are not yet imported anywhere; that is fine.)

- [ ] **Step 3: Commit**

```bash
git add src/config/gallery.ts
git commit -m "feat(gallery-preview): add inline/thumb-inset/arrow-gap config, tighten margins & thumb size"
```

---

## Task 2: DOM restructure + static layout CSS

Rewrites the template into the hero-stack / hero-frame structure and rewrites all static layout CSS: dialog padding (top/bottom/inline with safe-area), stage flex, hero-frame `fit-content`, hero `max-height` calc, counter below the frame, hero-relative peeks, and the overlaid thumb strip (38px visible / 44px hit target). Arrows get temporary fallback positioning here; precise positioning is Task 3.

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro:1-33` (frontmatter imports + `styleVars`)
- Modify: `src/components/gallery/GalleryPreview.astro:35-71` (template `<dialog>` markup)
- Modify: `src/components/gallery/GalleryPreview.astro:73-241` (`<style>` block)

**Interfaces:**
- Consumes: all `PREVIEW_*` layout constants from Task 1.
- Produces: DOM nodes `.gp-stage`, `.gp-hero-stack`, `.gp-hero-frame`, `.gp-hero`, `.gp-counter` (with `.gp-counter-fraction` + `.gp-counter-sr`), `.gp-peek-prev`/`.gp-peek-next` (inside frame), `.gp-strip` (inside frame), `.gp-arrow-prev`/`.gp-arrow-next` (direct children of `.gp-stage`), `.gp-thumb`/`.gp-thumb-center`. CSS custom properties defined on `.gallery-preview[open]`: `--gp-top-inset`, `--gp-bottom-inset`, `--gp-inline-inset`, `--gp-counter-block-size`. CSS custom properties **declared with fallbacks** on `.gp-stage`: `--gp-frame-left/right/width/height` (all `0px`), consumed by Task 3.

- [ ] **Step 1: Replace the frontmatter imports and `styleVars`**

Replace lines `1-33` of `src/components/gallery/GalleryPreview.astro` with:

```astro
---
import {
  PREVIEW_MARGIN_TOP,
  PREVIEW_MARGIN_BOTTOM,
  PREVIEW_MARGIN_INLINE,
  PREVIEW_COUNTER_GAP,
  PREVIEW_COUNTER_FONT_SIZE,
  PREVIEW_COUNTER_OPACITY,
  PREVIEW_THUMB_SIZE,
  PREVIEW_THUMB_INSET,
  PREVIEW_THUMB_ACTIVE_SCALE,
  PREVIEW_THUMB_SIDE_OPACITY,
  PREVIEW_PEEK_OPACITY,
  PREVIEW_PEEK_WIDTH_RATIO,
  PREVIEW_PEEK_HEIGHT_RATIO,
  PREVIEW_ARROW_GAP,
  PREVIEW_BACKDROP_BLUR,
  PREVIEW_BACKDROP_DIM,
} from '../../config/gallery';

const styleVars = [
  `--gp-margin-top: ${PREVIEW_MARGIN_TOP}`,
  `--gp-margin-bottom: ${PREVIEW_MARGIN_BOTTOM}`,
  `--gp-margin-inline: ${PREVIEW_MARGIN_INLINE}`,
  `--gp-counter-gap: ${PREVIEW_COUNTER_GAP}`,
  `--gp-counter-font-size: ${PREVIEW_COUNTER_FONT_SIZE}`,
  `--gp-counter-opacity: ${PREVIEW_COUNTER_OPACITY}`,
  `--gp-thumb-size: ${PREVIEW_THUMB_SIZE}`,
  `--gp-thumb-inset: ${PREVIEW_THUMB_INSET}`,
  `--gp-thumb-active-scale: ${PREVIEW_THUMB_ACTIVE_SCALE}`,
  `--gp-thumb-side-opacity: ${PREVIEW_THUMB_SIDE_OPACITY}`,
  `--gp-peek-opacity: ${PREVIEW_PEEK_OPACITY}`,
  `--gp-peek-width-ratio: ${PREVIEW_PEEK_WIDTH_RATIO}`,
  `--gp-peek-height-ratio: ${PREVIEW_PEEK_HEIGHT_RATIO}`,
  `--gp-arrow-gap: ${PREVIEW_ARROW_GAP}`,
  `--gp-backdrop-blur: ${PREVIEW_BACKDROP_BLUR}`,
  `--gp-backdrop-dim: ${PREVIEW_BACKDROP_DIM}`,
].join('; ');
---
```

- [ ] **Step 2: Replace the `<dialog>` template markup**

Replace the entire `<dialog>…</dialog>` block (lines `35-71`) with the new hero-stack structure. Arrows become direct children of `.gp-stage`; peeks + strip move inside `.gp-hero-frame`; the counter moves into `.gp-hero-stack` below the frame:

```astro
<dialog
  id="gallery-preview"
  class="gallery-preview"
  aria-roledescription="Podgląd galerii"
  style={styleVars}
>
  <button type="button" class="gp-close" aria-label="Zamknij podgląd">
    <span aria-hidden="true">&#10005;</span>
  </button>

  <div class="gp-stage">
    <button type="button" class="gp-arrow gp-arrow-prev" aria-label="Poprzednie zdjęcie">
      <span aria-hidden="true">&#8249;</span>
    </button>

    <div class="gp-hero-stack">
      <div class="gp-hero-frame">
        <img class="gp-peek gp-peek-prev" alt="" aria-hidden="true" draggable="false" />
        <img class="gp-hero" alt="" tabindex="0" draggable="false" />
        <img class="gp-peek gp-peek-next" alt="" aria-hidden="true" draggable="false" />
        <div class="gp-strip">
          <button type="button" class="gp-thumb" data-slot="-2" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
          <button type="button" class="gp-thumb" data-slot="-1" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
          <button type="button" class="gp-thumb gp-thumb-center" data-slot="0"><img alt="" draggable="false" /></button>
          <button type="button" class="gp-thumb" data-slot="1" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
          <button type="button" class="gp-thumb" data-slot="2" aria-hidden="true" tabindex="-1"><img alt="" draggable="false" /></button>
        </div>
      </div>
      <div class="gp-counter">
        <span class="gp-counter-fraction" aria-hidden="true"></span>
        <span class="gp-counter-sr" aria-live="polite"></span>
      </div>
    </div>

    <button type="button" class="gp-arrow gp-arrow-next" aria-label="Następne zdjęcie">
      <span aria-hidden="true">&#8250;</span>
    </button>
  </div>
</dialog>
```

> Note: the client script in Task 3/4 still queries `.gp-hero`, `.gp-counter-fraction`, `.gp-counter-sr`, `.gp-peek-prev`, `.gp-peek-next`, `.gp-arrow-prev`, `.gp-arrow-next`, and `.gp-thumb` by class — all preserved above, so existing render/nav logic keeps working unchanged.

- [ ] **Step 3: Replace the entire `<style>` block**

Replace the whole `<style>…</style>` block (lines `73-241`) with the following. This is the complete new stylesheet for the component:

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
    --gp-top-inset: max(var(--gp-margin-top), env(safe-area-inset-top));
    --gp-bottom-inset: max(var(--gp-margin-bottom), env(safe-area-inset-bottom));
    --gp-inline-inset: max(var(--gp-margin-inline), env(safe-area-inset-left), env(safe-area-inset-right));
    --gp-counter-block-size: calc(var(--gp-counter-font-size) * 1.4);
    padding-top: var(--gp-top-inset);
    padding-bottom: var(--gp-bottom-inset);
    padding-inline:
      max(var(--gp-margin-inline), env(safe-area-inset-left))
      max(var(--gp-margin-inline), env(safe-area-inset-right));
  }

  .gp-close {
    position: absolute;
    top: var(--gp-top-inset);
    right: 1.25rem;
    z-index: 4;
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

  .gp-stage {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    /* Fallbacks until the ResizeObserver (Task 3) writes real frame geometry. */
    --gp-frame-left: 0px;
    --gp-frame-right: 0px;
    --gp-frame-width: 0px;
    --gp-frame-height: 0px;
  }

  .gp-hero-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 100%;
    min-width: 0;
    max-height: 100%;
  }

  .gp-hero-frame {
    position: relative;
    width: fit-content;
    max-width: 100%;
  }

  .gp-hero {
    display: block;
    max-width: 100%;
    max-height: calc(
      100dvh
      - var(--gp-top-inset)
      - var(--gp-bottom-inset)
      - var(--gp-counter-gap)
      - var(--gp-counter-block-size)
    );
    width: auto;
    height: auto;
    object-fit: contain;
    position: relative;
    z-index: 2;
    user-select: none;
  }
  .gp-hero:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }

  .gp-counter {
    margin-top: var(--gp-counter-gap);
    height: var(--gp-counter-block-size);
    line-height: var(--gp-counter-block-size);
    text-align: center;
    font-family: 'Manrope', sans-serif;
    font-size: var(--gp-counter-font-size);
    opacity: var(--gp-counter-opacity);
    white-space: nowrap;
    flex: 0 0 auto;
  }

  .gp-counter-sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .gp-peek {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: calc(var(--gp-peek-width-ratio) * 100%);
    height: calc(var(--gp-peek-height-ratio) * 100%);
    object-fit: cover;
    object-position: center;
    opacity: var(--gp-peek-opacity);
    z-index: 1;
    cursor: pointer;
    user-select: none;
  }
  .gp-peek-prev { right: 100%; border-radius: 8px 0 0 8px; }
  .gp-peek-next { left: 100%; border-radius: 0 8px 8px 0; }
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
  /* Temporary fallback positioning; Task 3 replaces these with frame-relative calc(). */
  .gp-arrow-prev { left: var(--gp-inline-inset); }
  .gp-arrow-next { right: var(--gp-inline-inset); }
  .gp-arrow.is-disabled { opacity: 0.25; pointer-events: none; }

  .gp-strip {
    position: absolute;
    left: 50%;
    bottom: var(--gp-thumb-inset);
    transform: translateX(-50%);
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .gp-thumb {
    flex: 0 0 auto;
    min-width: 44px;
    min-height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    opacity: var(--gp-thumb-side-opacity);
    transition: opacity 0.2s ease;
  }
  .gp-thumb img {
    width: var(--gp-thumb-size);
    height: var(--gp-thumb-size);
    object-fit: cover;
    border-radius: 6px;
    display: block;
    background: var(--color-surface-container-low);
    transition: transform 0.2s ease;
  }
  .gp-thumb-center { opacity: 1; }
  .gp-thumb-center img { transform: scale(var(--gp-thumb-active-scale)); }
  .gp-thumb.is-empty { visibility: hidden; pointer-events: none; }
  .gp-thumb:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .gp-close, .gp-arrow, .gp-thumb, .gp-thumb img { transition: none; }
  }
</style>
```

- [ ] **Step 4: Type-check and build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 5: Check linter**

Use the ReadLints tool on `src/components/gallery/GalleryPreview.astro`.
Expected: no new errors introduced by this task.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open `http://localhost:4321/galeria`, click any image.
Verify:
- Counter appears **directly below** the hero image (not above), on a single line.
- Thumb strip is **overlaid on the hero image bottom** with a small inset gap; thumbs are visibly smaller (~38px) but comfortably tappable.
- Peeks touch the hero's left/right edges (not the viewport edges); hidden on the disabled side at the first/last image.
- Top gap from viewport top to hero is tighter (~1.5rem).
- Arrows are visible (rough position for now — precise placement lands in Task 3).
- All v1 behaviors still work: open/close tween, arrow/peek/thumb/keyboard nav, backdrop/Escape/✕ close, pause/resume.

- [ ] **Step 7: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro
git commit -m "feat(gallery-preview): restructure into hero-stack/frame layout with overlaid strip and below-hero counter"
```

---

## Task 3: ResizeObserver-driven arrow positioning

Adds the `ResizeObserver` on `.gp-hero-frame` (+ `.gp-stage` for position-only changes) that writes `--gp-frame-left/right/width/height` to the stage, and replaces the fallback arrow CSS with frame-relative `calc()` clamped inside the inline insets.

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro` — `<style>` arrow rules (the `.gp-arrow-prev`/`.gp-arrow-next` fallback lines from Task 2) + `.gp-stage` (add derived vars)
- Modify: `src/components/gallery/GalleryPreview.astro` — `<script>` (module refs, `updateFrameVars()`, observer wiring in `openPreview`, teardown in `close` handler and `astro:before-swap`)

**Interfaces:**
- Consumes: `--gp-frame-left/right/width/height` (declared with fallbacks on `.gp-stage` in Task 2), `--gp-peek-width-ratio`, `--gp-arrow-gap` (from `styleVars`), the `.gp-stage` / `.gp-hero-frame` nodes.
- Produces: module-scoped `stageEl: HTMLElement | null`, `heroFrameEl: HTMLElement | null`, `frameObserver: ResizeObserver | null`, and `updateFrameVars(): void`.

- [ ] **Step 1: Replace the fallback arrow CSS with frame-relative positioning**

In the `<style>` block, add two derived custom properties to `.gp-stage` and replace the two temporary fallback rules. Change the `.gp-stage` selector to include the derived vars (append inside the existing rule), i.e. add these two lines to `.gp-stage`:

```css
    --gp-peek-w: calc(var(--gp-frame-width) * var(--gp-peek-width-ratio));
    --gp-arrow-size: 2.75rem;
```

Then replace:

```css
  /* Temporary fallback positioning; Task 3 replaces these with frame-relative calc(). */
  .gp-arrow-prev { left: var(--gp-inline-inset); }
  .gp-arrow-next { right: var(--gp-inline-inset); }
```

with:

```css
  .gp-arrow-prev {
    left: max(0px, calc(var(--gp-frame-left) - var(--gp-peek-w) - var(--gp-arrow-gap) - var(--gp-arrow-size)));
  }
  .gp-arrow-next {
    right: max(0px, calc(var(--gp-frame-right) - var(--gp-peek-w) - var(--gp-arrow-gap) - var(--gp-arrow-size)));
  }
```

> `--gp-frame-left`/`--gp-frame-right` are measured relative to the stage's content box (which already begins at the inline inset), so `max(0px, …)` clamps each arrow so its box never crosses the effective inline inset. Peek width is `--gp-frame-width × ratio`; arrow width is `2.75rem`.

- [ ] **Step 2: Add module-scoped refs for the frame observer**

In the `<script>`, next to the other `let` refs (after `let thumbEls: HTMLButtonElement[] = [];`), add:

```typescript
  let stageEl: HTMLElement | null = null;
  let heroFrameEl: HTMLElement | null = null;
  let frameObserver: ResizeObserver | null = null;
```

- [ ] **Step 3: Add `updateFrameVars()`**

Add this function to the `<script>` (e.g. directly above `function render(index: number)`):

```typescript
  /**
   * Measure the hero frame relative to the stage and publish its geometry as
   * custom properties so the arrows can position themselves purely in CSS.
   * Fired by the ResizeObserver on open, navigation, HQ swap, and resize.
   */
  function updateFrameVars(): void {
    if (!stageEl || !heroFrameEl) return;
    const stageRect = stageEl.getBoundingClientRect();
    const frameRect = heroFrameEl.getBoundingClientRect();
    stageEl.style.setProperty('--gp-frame-left', `${frameRect.left - stageRect.left}px`);
    stageEl.style.setProperty('--gp-frame-right', `${stageRect.right - frameRect.right}px`);
    stageEl.style.setProperty('--gp-frame-width', `${frameRect.width}px`);
    stageEl.style.setProperty('--gp-frame-height', `${frameRect.height}px`);
  }
```

- [ ] **Step 4: Query the new nodes in `initPreview`**

In `initPreview`, immediately after `heroEl = dialog.querySelector('.gp-hero');`, add:

```typescript
    stageEl = dialog.querySelector('.gp-stage');
    heroFrameEl = dialog.querySelector('.gp-hero-frame');
```

- [ ] **Step 5: Wire the observer in `openPreview`**

In `openPreview`, immediately after the `render(index);` call, add:

```typescript
    // Keep arrow geometry in sync with the hero frame (open, nav, HQ swap, resize).
    frameObserver?.disconnect();
    frameObserver = new ResizeObserver(() => updateFrameVars());
    if (heroFrameEl) frameObserver.observe(heroFrameEl);
    if (stageEl) frameObserver.observe(stageEl);
    updateFrameVars();
```

> Observing both the frame and the stage covers size changes (hero load / HQ swap) **and** position-only shifts (window resize that recenters the frame without changing its size).

- [ ] **Step 6: Disconnect the observer on close and before-swap**

In the dialog's `close` event handler, add the disconnect as the first lines inside the handler:

```typescript
      frameObserver?.disconnect();
      frameObserver = null;
```

In the `astro:before-swap` handler, add the same two lines alongside the existing `previewController?.abort();` cleanup:

```typescript
      frameObserver?.disconnect();
      frameObserver = null;
```

- [ ] **Step 7: Type-check and build**

Run: `npm run build`
Expected: build completes with no errors (`ResizeObserver` is a DOM global; no import needed).

- [ ] **Step 8: Check linter**

Use the ReadLints tool on `src/components/gallery/GalleryPreview.astro`.
Expected: no new errors.

- [ ] **Step 9: Manual verification**

Run `npm run dev`, open `/galeria`, click an image. Verify:
- Prev arrow sits just **outside** the prev peek (toward the viewport) with a small gap; next arrow mirrors it. Neither collides with the viewport edge.
- Navigate to a portrait then a landscape image (or resize the window): arrows re-align to the new hero width; no drift.
- Resize the window while open: peeks stay flush to the hero edges and arrows re-clamp; nothing crosses the viewport/inset edge.
- First image: prev peek hidden, prev arrow disabled; last image: next peek hidden, next arrow disabled.
- Close and navigate away (click a nav link): no console errors; reopening works.

- [ ] **Step 10: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro
git commit -m "feat(gallery-preview): position arrows from hero-frame geometry via ResizeObserver"
```

---

## Task 4: Counter announcement format

Aligns the `aria-live` counter announcement with the visible fraction (`"3 / 16"`) per spec §4 / §6, replacing the previous `"Zdjęcie N z M"` phrasing.

**Files:**
- Modify: `src/components/gallery/GalleryPreview.astro` — the `counterSrEl.textContent` line inside `render()`

**Interfaces:**
- Consumes: `counterSrEl`, `state.total`, `index` (all already present in `render()`).
- Produces: nothing new.

- [ ] **Step 1: Change the SR announcement text**

In `render()`, replace:

```typescript
    if (counterSrEl) counterSrEl.textContent = `Zdjęcie ${index + 1} z ${state.total}`;
```

with:

```typescript
    if (counterSrEl) counterSrEl.textContent = `${index + 1} / ${state.total}`;
```

Leave the visible fraction line (`counterFractionEl.textContent = \`${index + 1} / ${state.total}\`;`) unchanged.

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open `/galeria`, click an image, and navigate with ←/→. Verify the visible counter reads e.g. `3 / 16`. (Optional, if a screen reader is available: each navigation announces the same `"3 / 16"` string.)

- [ ] **Step 4: Commit**

```bash
git add src/components/gallery/GalleryPreview.astro
git commit -m "feat(gallery-preview): announce counter as \"3 / 16\" to match the visible fraction"
```

---

## Final Verification

- [ ] Run `npm run build` once more; confirm a clean build.
- [ ] Run the full manual checklist from spec §8:
  - Counter directly below the hero, single line.
  - Thumb strip overlays the hero with `PREVIEW_THUMB_INSET` gap; thumbs ~60% smaller yet easy to tap (44px hit target).
  - Peeks touch the hero side edges, not the viewport edges.
  - Arrows sit outside the peeks with `PREVIEW_ARROW_GAP` and never collide with viewport / safe-area edges.
  - Tighter top margin (1.5rem) and configurable lateral inset.
  - Resize while open keeps the layout correct.
  - First/last image: disabled-side peek hidden and arrow disabled.
  - All v1 behaviors intact: open/close tween, instant nav, pause/resume, history close, keyboard nav, reduced motion.

---

## Notes on spec tension (for the implementer)

The spec's §4 "Critical rule" states hero-bottom → viewport-bottom equals `PREVIEW_MARGIN_BOTTOM` with the counter "included", while the concrete `max-height` calc in §4.3 reserves `bottom-inset + counter-gap + counter-block-size` below the hero. This plan implements the **concrete `max-height` calc verbatim** (the counter row lives in its own reserved band below the frame). When a portrait hero reaches its `max-height`, the hero-stack exactly fills the stage: hero top sits at `PREVIEW_MARGIN_TOP` and the counter + its gap occupy the reserved bottom band. This is the faithful, unambiguous interpretation of the given CSS. If the visual result reads as too much bottom space, the single lever is `PREVIEW_MARGIN_BOTTOM` — do not change layout structure without a spec update.
