# Gallery Preview Mode — Layout Refinements

**Date:** 2026-07-12
**Status:** Approved
**Related:** `docs/superpowers/specs/2026-07-12-gallery-preview-mode-design.md`, `src/components/gallery/GalleryPreview.astro`, `src/config/gallery.ts`

---

## 1. Overview

Layout refinements to the existing gallery preview mode on `/galeria`. No changes to open/close animation, navigation behavior, gallery pause/resume, history, or image loading. This iteration fixes hero-relative positioning for peeks and arrows, moves the counter below the hero, overlays the thumb strip on the hero, and tightens configurable viewport margins.

---

## 2. Requirements Summary

| Area | Current | Target |
|------|---------|--------|
| Counter | Above hero stage | Directly below hero image, inside bottom margin budget |
| Counter size | Configurable (`PREVIEW_COUNTER_FONT_SIZE`) | Unchanged — stays configurable |
| Thumb strip | Below hero in document flow | Overlaid on hero bottom with inset gap |
| Thumb size | `64px` | `38px` (60% of current) |
| Top margin | `4rem` | `1.5rem` (configurable) |
| Bottom margin | `1.5rem` above thumb rail | `1.5rem` from hero bottom to viewport bottom; counter included in this band |
| Peeks | Anchored to viewport (`left: 0` / `right: 0`, width from `100vw`) | Flush with hero side edges; size as % of hero width/height |
| Arrows | Positioned from viewport-based peek width | Outside peeks, toward viewport, with configurable gap |

---

## 3. Architecture

### Approach: Hero cluster wrapper (CSS-first)

Wrap the hero, peeks, counter, and thumb strip in a `position: relative; width: fit-content` **hero cluster** that shrinks to the rendered hero box. Peeks and thumb strip position absolutely within the cluster; counter sits in normal flow below the hero. Arrows remain on `.gp-stage` as siblings of the cluster and are positioned via CSS custom properties updated by a `ResizeObserver`.

**Why not full JS measurement?** A flat DOM with `getBoundingClientRect()` on every render works but duplicates layout logic CSS can own and is prone to drift on async HQ swap. **Why not container queries?** Arrow placement still needs JS; container queries add complexity without a clear win.

### DOM structure

```
<dialog class="gallery-preview">
  <button class="gp-close" />
  <div class="gp-stage">
    <button class="gp-arrow gp-arrow-prev" />
    <div class="gp-hero-cluster">
      <img class="gp-peek gp-peek-prev" />
      <img class="gp-hero" />
      <img class="gp-peek gp-peek-next" />
      <div class="gp-strip">…5 thumbs…</div>
      <div class="gp-counter">…</div>
    </div>
    <button class="gp-arrow gp-arrow-next" />
  </div>
</dialog>
```

### ResizeObserver

A `ResizeObserver` on `.gp-hero-cluster` writes custom properties to `.gp-stage` whenever the cluster size or position changes (open, navigation, HQ swap, window resize):

- `--gp-cluster-left` — cluster left edge relative to stage
- `--gp-cluster-right` — cluster right edge relative to stage
- `--gp-cluster-width` — cluster width (equals hero width)

Arrow positions derive from these values minus peek width and `PREVIEW_ARROW_GAP`. The observer is disconnected on `astro:before-swap` and preview teardown.

---

## 4. UI Layout

### Dialog & stage

- Dialog remains a full-viewport `<dialog>` with `flex-direction: column`.
- `padding-top: max(PREVIEW_MARGIN_TOP, env(safe-area-inset-top))` — distance from viewport top to hero top.
- Close button stays absolute top-right (unchanged).
- **Stage** (`flex: 1; min-height: 0`): horizontally centers the hero cluster + flanking arrows. Uses `justify-content: flex-start` so the hero top aligns to the top padding (not vertically centered).
- No separate thumb rail in document flow — strip is inside the cluster.

### Vertical margin model

| Constant | Meaning |
|----------|---------|
| `PREVIEW_MARGIN_TOP` | Viewport top → hero top edge |
| `PREVIEW_MARGIN_BOTTOM` | Hero bottom edge → viewport bottom edge (counter + its gap live inside this band) |

**Critical rule:** `PREVIEW_MARGIN_BOTTOM` is the total distance from the hero's bottom edge to the viewport bottom. The counter does not add extra space beyond this value.

Example: if `PREVIEW_MARGIN_BOTTOM = 3rem`, counter line-height ≈ `2rem`, and `PREVIEW_COUNTER_GAP = 0.75rem`, then `0.75rem + 2rem + 0.25rem = 3rem` — not `5rem`.

### Hero max-height

```css
max-height: calc(
  100dvh
  - var(--gp-margin-top)
  - var(--gp-margin-bottom)
  - var(--gp-counter-gap)
  - var(--gp-counter-line-height)
);
```

`--gp-counter-line-height` is derived from `PREVIEW_COUNTER_FONT_SIZE` (e.g. `1.2 × font-size`). The thumb strip does not reduce hero max-height — it overlays the hero.

### Counter

- Position: in flow, directly below the hero image inside `.gp-hero-cluster`.
- Gap: `PREVIEW_COUNTER_GAP` between hero bottom and counter top.
- Size: `PREVIEW_COUNTER_FONT_SIZE` (configurable).
- Opacity: `PREVIEW_COUNTER_OPACITY` (unchanged).
- Format: `"3 / 16"` visible fraction + `aria-live="polite"` SR announcement (unchanged).
- Non-interactive; not in tab order.

### Side peeks

- Anchored to the hero cluster, not the viewport.
- **Prev peek:** right edge flush with hero left edge (`right: 100%`).
- **Next peek:** left edge flush with hero right edge (`left: 100%`).
- Vertically centered on hero (`top: 50%; transform: translateY(-50%)`).
- Size: `width = PREVIEW_PEEK_WIDTH_RATIO × hero width`; `height = PREVIEW_PEEK_HEIGHT_RATIO × hero height` (percentages of cluster dimensions).
- Behind hero (`z-index: 1`); hero at `z-index: 2`.
- May extend toward viewport edges but must not touch them — only the hero edges.
- Hidden at carousel ends (unchanged).
- `aria-hidden="true"` (unchanged).

### Arrows

- Position: outside peeks, toward the viewport.
- **Prev arrow:** to the left of the prev peek.
- **Next arrow:** to the right of the next peek.
- Gap: `PREVIEW_ARROW_GAP` between arrow edge and peek edge.
- Positioned via `calc()` from `--gp-cluster-left` / `--gp-cluster-right`, peek width (`--gp-cluster-width × --gp-peek-width-ratio`), arrow width, and `PREVIEW_ARROW_GAP`.
- Disabled at ends: `opacity: 0.25; pointer-events: none` (unchanged).

### Thumb strip (overlay)

- Position: `position: absolute` inside `.gp-hero-cluster`, bottom-aligned on the hero image.
- Inset: `PREVIEW_THUMB_INSET` gap from hero bottom edge.
- Size: `PREVIEW_THUMB_SIZE = 38px` (60% of previous `64px`).
- Center thumb scale and side opacity unchanged (`PREVIEW_THUMB_ACTIVE_SCALE`, `PREVIEW_THUMB_SIDE_OPACITY`).
- Layering: `z-index: 3` above hero.
- Five slots `[i-2…i+2]` with empty cells at ends (unchanged behavior).

### Background, loading, animations

Unchanged from `2026-07-12-gallery-preview-mode-design.md`:

- Native `::backdrop` blur/dim of paused gallery.
- Single GSAP hero scale/opacity tween on open/close.
- Instant in-preview navigation.
- Off-DOM `decode()` + in-place HQ swap.

---

## 5. Configuration (`src/config/gallery.ts`)

| Constant | Purpose | New default |
|----------|---------|-------------|
| `PREVIEW_MARGIN_TOP` | Viewport top → hero top | `1.5rem` |
| `PREVIEW_MARGIN_BOTTOM` | Hero bottom → viewport bottom (counter included) | `1.5rem` |
| `PREVIEW_COUNTER_GAP` | Gap between hero bottom and counter top | `0.75rem` (unchanged) |
| `PREVIEW_COUNTER_FONT_SIZE` | Counter text size | `0.95rem` (unchanged) |
| `PREVIEW_COUNTER_OPACITY` | Counter text opacity | `0.7` (unchanged) |
| `PREVIEW_THUMB_SIZE` | Thumb cell size | `38px` |
| `PREVIEW_THUMB_INSET` | Gap from hero bottom to strip | `0.5rem` (**new**) |
| `PREVIEW_THUMB_ACTIVE_SCALE` | Center thumb scale | `1.15` (unchanged) |
| `PREVIEW_THUMB_SIDE_OPACITY` | Side thumb opacity | `0.5` (unchanged) |
| `PREVIEW_PEEK_WIDTH_RATIO` | Peek width as ratio of hero width | `0.08` (unchanged value, now hero-relative) |
| `PREVIEW_PEEK_HEIGHT_RATIO` | Peek height as ratio of hero height | `0.6` (unchanged value, now hero-relative) |
| `PREVIEW_PEEK_OPACITY` | Peek opacity | `0.35` (unchanged) |
| `PREVIEW_ARROW_GAP` | Gap between peek edge and arrow | `0.5rem` (**new**) |

Motion, backdrop, and image-generation constants are unchanged.

---

## 6. Accessibility

No behavioral changes to accessibility:

- Focus order: ✕ → prev arrow → hero → next arrow → thumbs (counter is non-interactive).
- `aria-live="polite"` counter announcements on navigation.
- Arrow `aria-label`s unchanged.
- Peeks remain `aria-hidden="true"`.
- Reduced motion: open/close tween skipped (unchanged).

---

## 7. Error Handling & Edge Cases

- **Resize while open:** `ResizeObserver` recomputes cluster position; peeks, arrows, and strip stay aligned.
- **Very small viewport:** counter + gap must fit within `PREVIEW_MARGIN_BOTTOM`; hero shrinks via `max-height` calc.
- **Single image:** no peeks; both arrows disabled (unchanged).
- **Portrait vs landscape hero:** cluster `fit-content` adapts; peek percentages scale with hero dimensions.
- **HQ swap:** image dimensions may change after decode; `ResizeObserver` fires and repositions arrows.

---

## 8. Testing

### Manual

- Counter appears directly below hero, not above.
- Distance from hero bottom to viewport bottom equals `PREVIEW_MARGIN_BOTTOM` — counter does not add beyond it.
- Thumb strip overlays hero bottom with `PREVIEW_THUMB_INSET` gap; thumbs are visibly smaller (~60%).
- Peeks touch hero side edges, not viewport edges.
- Arrows sit outside peeks with `PREVIEW_ARROW_GAP` separation.
- Top margin is tighter (`1.5rem` default).
- Resize while open: layout stays correct.
- First/last image: peek hidden on disabled side; arrow disabled.
- All v1 behaviors still work: open/close tween, instant nav, pause/resume, history close, keyboard nav.

### Automated

Deferred — layout-only change; E2E coverage is a follow-up.

---

## 9. Decisions Log

| Decision | Choice |
|----------|--------|
| Positioning strategy | Hero cluster wrapper (CSS-first) + `ResizeObserver` for arrows only |
| Counter placement | In flow below hero, inside bottom margin budget |
| Bottom margin semantics | `PREVIEW_MARGIN_BOTTOM` = hero bottom → viewport bottom (counter included, not additive) |
| Thumb strip | Absolute overlay on hero bottom with inset gap |
| Thumb size | 60% of previous (`38px`) |
| Peek anchoring | Hero side edges via cluster `%` sizing (not viewport) |
| Arrow placement | Outside peek, toward viewport, with `PREVIEW_ARROW_GAP` |
| Default margins | `1.5rem` top and bottom |
| Scope | Layout/CSS/JS positioning only; no animation or nav changes |

---

## 10. Out of Scope

- Animation changes (open/close tween, in-preview transitions).
- Swipe gestures, pinch-to-zoom, deep-linking.
- Automated E2E tests.
- Changes to gallery loop, float, or manifest structure.
