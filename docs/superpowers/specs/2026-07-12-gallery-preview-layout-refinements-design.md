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
| Lateral margin | Implicit / viewport-bound | Explicit inline inset budget with safe-area awareness (configurable) |
| Peeks | Anchored to viewport (`left: 0` / `right: 0`, width from `100vw`) | Flush with hero side edges; size as % of hero width/height |
| Arrows | Positioned from viewport-based peek width | Outside peeks, toward viewport, with configurable gap |

---

## 3. Architecture

### Approach: Hero stack + hero frame (CSS-first)

Split the layout into two layers:

- **Hero frame** (`.gp-hero-frame`) — `position: relative; width: fit-content`, sized to the rendered hero image box exactly. Peeks and the thumb strip position absolutely inside this frame.
- **Hero stack** (`.gp-hero-stack`) — a flow container that holds the hero frame plus the counter row below it.

This keeps overlay geometry tied to the actual hero image while still allowing the counter to live below it without changing the measurement box. Arrows remain on `.gp-stage` and are positioned via CSS custom properties updated by a `ResizeObserver` on `.gp-hero-frame`.

**Why not full JS measurement?** A flat DOM with `getBoundingClientRect()` on every render works but duplicates layout logic CSS can own and is prone to drift on async HQ swap. **Why not container queries?** Arrow placement still needs JS; container queries add complexity without a clear win.

### DOM structure

```
<dialog class="gallery-preview">
  <button class="gp-close" />
  <div class="gp-stage">
    <button class="gp-arrow gp-arrow-prev" />
    <div class="gp-hero-stack">
      <div class="gp-hero-frame">
        <img class="gp-peek gp-peek-prev" />
        <img class="gp-hero" />
        <img class="gp-peek gp-peek-next" />
        <div class="gp-strip">…5 thumbs…</div>
      </div>
      <div class="gp-counter">…</div>
    </div>
    <button class="gp-arrow gp-arrow-next" />
  </div>
</dialog>
```

### ResizeObserver

A `ResizeObserver` on `.gp-hero-frame` writes custom properties to `.gp-stage` whenever the hero box size or position changes (open, navigation, HQ swap, window resize):

- `--gp-frame-left` — hero frame left edge relative to stage
- `--gp-frame-right` — hero frame right edge relative to stage
- `--gp-frame-width` — hero frame width
- `--gp-frame-height` — hero frame height

Arrow positions derive from these values plus peek width and `PREVIEW_ARROW_GAP`, then clamp against the effective inline insets so arrows never collide with the viewport or safe-area edges. The observer is disconnected on `astro:before-swap` and preview teardown.

---

## 4. UI Layout

### Dialog & stage

- Dialog remains a full-viewport `<dialog>` with `flex-direction: column`.
- `padding-top: max(PREVIEW_MARGIN_TOP, env(safe-area-inset-top))` — distance from viewport top to hero top.
- `padding-inline: max(PREVIEW_MARGIN_INLINE, env(safe-area-inset-left)) max(PREVIEW_MARGIN_INLINE, env(safe-area-inset-right))` — minimum lateral inset for arrows/peeks/hero stack.
- `padding-bottom: max(PREVIEW_MARGIN_BOTTOM, env(safe-area-inset-bottom))`.
- Close button stays absolute top-right (unchanged).
- **Stage** (`position: relative; flex: 1; min-height: 0`): uses normal-flow centering for the `.gp-hero-stack` and top-aligns it within the padded dialog (`justify-content: center; align-items: flex-start` in a horizontal flex row, or equivalent grid). Arrows are absolutely positioned within the stage.
- No separate thumb rail in document flow — strip is inside the hero frame.

### Vertical margin model

| Constant | Meaning |
|----------|---------|
| `PREVIEW_MARGIN_TOP` | Viewport top → hero top edge |
| `PREVIEW_MARGIN_BOTTOM` | Hero bottom edge → viewport bottom edge (counter + its gap live inside this band) |
| `PREVIEW_MARGIN_INLINE` | Minimum inline inset from viewport / safe-area edges |

**Critical rule:** `PREVIEW_MARGIN_BOTTOM` is the total distance from the hero's bottom edge to the viewport bottom. The counter does not add extra space beyond this value. On devices with a larger bottom safe area, the effective band becomes `max(PREVIEW_MARGIN_BOTTOM, env(safe-area-inset-bottom))`.

The counter lives in its own row below `.gp-hero-frame`, so the frame remains equal to the hero box. The counter row reserves a single-line block size with explicit no-wrap styling; hero sizing subtracts that reserved row rather than depending on incidental content measurement.

### Hero max-height

```css
max-height: calc(
  100dvh
  - var(--gp-top-inset)
  - var(--gp-bottom-inset)
  - var(--gp-counter-gap)
  - var(--gp-counter-block-size)
);
```

`--gp-top-inset` / `--gp-bottom-inset` are the effective padding values after `max(..., env(safe-area-inset-*))`. `--gp-counter-block-size` is a reserved one-line counter row, derived from the configured counter typography. The thumb strip does not reduce hero max-height — it overlays the hero frame.

### Counter

- Position: in flow, directly below `.gp-hero-frame` inside `.gp-hero-stack`.
- Gap: `PREVIEW_COUNTER_GAP` between hero bottom and counter top.
- Size: `PREVIEW_COUNTER_FONT_SIZE` (configurable).
- Opacity: `PREVIEW_COUNTER_OPACITY` (unchanged).
- Format: visible text is `"3 / 16"`. The live region also announces `"3 / 16"` with `aria-live="polite"`.
- Single line only (`white-space: nowrap`); never wraps.
- Non-interactive; not in tab order.

### Side peeks

- Anchored to `.gp-hero-frame`, not the viewport.
- **Prev peek:** right edge flush with hero left edge (`right: 100%`).
- **Next peek:** left edge flush with hero right edge (`left: 100%`).
- Vertically centered on hero (`top: 50%; transform: translateY(-50%)`).
- Size: `width = PREVIEW_PEEK_WIDTH_RATIO × hero width`; `height = PREVIEW_PEEK_HEIGHT_RATIO × hero height` (percentages of hero-frame dimensions).
- Behind hero (`z-index: 1`); hero at `z-index: 2`.
- May extend toward viewport edges but must not touch them — only the hero edges.
- Hidden at carousel ends (unchanged).
- `aria-hidden="true"` (unchanged).

### Arrows

- Position: outside peeks, toward the viewport.
- **Prev arrow:** to the left of the prev peek.
- **Next arrow:** to the right of the next peek.
- Gap: `PREVIEW_ARROW_GAP` between arrow edge and peek edge.
- Positioned via `calc()` from `--gp-frame-left` / `--gp-frame-right`, peek width (`--gp-frame-width × --gp-peek-width-ratio`), arrow width, and `PREVIEW_ARROW_GAP`.
- Clamped so the final arrow box always stays inside the effective inline insets derived from `PREVIEW_MARGIN_INLINE` and safe-area values.
- Disabled at ends: `opacity: 0.25; pointer-events: none` (unchanged).

### Thumb strip (overlay)

- Position: `position: absolute` inside `.gp-hero-frame`, bottom-aligned on the hero image itself.
- Inset: `PREVIEW_THUMB_INSET` gap from hero bottom edge.
- Visual size: `PREVIEW_THUMB_SIZE = 38px` (60% of previous `64px`).
- Interaction size: each thumb button keeps at least a `44px` hit target even though the visible image remains `38px`.
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
| `PREVIEW_MARGIN_INLINE` | Minimum inset from viewport / safe-area edges | `1rem` |
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
- `aria-live="polite"` counter announcements on navigation use the same `"3 / 16"` format as the visible counter.
- Arrow `aria-label`s unchanged.
- Peeks remain `aria-hidden="true"`.
- Thumb buttons preserve at least a `44px` hit target.
- Reduced motion: open/close tween skipped (unchanged).

---

## 7. Error Handling & Edge Cases

- **Resize while open:** `ResizeObserver` recomputes hero-frame position; peeks, arrows, and strip stay aligned.
- **Very small viewport:** counter + reserved row must fit within the effective bottom inset; hero shrinks via `max-height` calc.
- **Narrow viewport / notched device:** arrows clamp inward before crossing the effective inline inset; safe-area padding wins if it is larger than `PREVIEW_MARGIN_INLINE`.
- **Single image:** no peeks; both arrows disabled (unchanged).
- **Portrait vs landscape hero:** `.gp-hero-frame` `fit-content` adapts; peek percentages scale with hero dimensions.
- **HQ swap:** image dimensions may change after decode; `ResizeObserver` fires and repositions arrows.

---

## 8. Testing

### Manual

- Counter appears directly below hero, not above.
- Distance from hero bottom to viewport bottom equals `PREVIEW_MARGIN_BOTTOM` — counter does not add beyond it.
- Thumb strip overlays the hero image itself with `PREVIEW_THUMB_INSET` gap; thumbs are visibly smaller (~60%) but remain easy to tap.
- Peeks touch hero side edges, not viewport edges.
- Arrows sit outside peeks with `PREVIEW_ARROW_GAP` separation and never collide with viewport / safe-area edges.
- Top margin is tighter (`1.5rem` default).
- Lateral inset is tighter but configurable via `PREVIEW_MARGIN_INLINE`.
- Resize while open: layout stays correct.
- First/last image: peek hidden on disabled side; arrow disabled.
- All v1 behaviors still work: open/close tween, instant nav, pause/resume, history close, keyboard nav.

### Automated

Deferred — layout-only change; E2E coverage is a follow-up.

---

## 9. Decisions Log

| Decision | Choice |
|----------|--------|
| Positioning strategy | Hero stack + exact hero frame (CSS-first) + `ResizeObserver` on the frame for arrow placement |
| Counter placement | In flow below the hero frame, inside bottom margin budget |
| Bottom margin semantics | `PREVIEW_MARGIN_BOTTOM` = hero bottom → viewport bottom (counter included, not additive) |
| Inline margin semantics | `PREVIEW_MARGIN_INLINE` sets the minimum lateral inset, with safe-area padding taking precedence when larger |
| Thumb strip | Absolute overlay on hero bottom with inset gap |
| Thumb size | 60% of previous (`38px`) |
| Peek anchoring | Hero side edges via hero-frame `%` sizing (not viewport) |
| Arrow placement | Outside peek, toward viewport, with `PREVIEW_ARROW_GAP`, clamped inside inline insets |
| Counter format | Visible and announced as `"3 / 16"` |
| Default margins | `1.5rem` top/bottom and `1rem` inline |
| Scope | Layout/CSS/JS positioning only; no animation or nav changes |

---

## 10. Out of Scope

- Animation changes (open/close tween, in-preview transitions).
- Swipe gestures, pinch-to-zoom, deep-linking.
- Automated E2E tests.
- Changes to gallery loop, float, or manifest structure.
