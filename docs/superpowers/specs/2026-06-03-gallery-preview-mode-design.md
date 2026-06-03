# Gallery Preview Mode — Design Spec

**Date:** 2026-06-03  
**Status:** Approved  
**Related:** `src/pages/galeria.astro`, `src/config/gallery.ts`, `design/gallery/gallery-preview1.png`, `design/gallery/gallery-preview2.png`

---

## 1. Overview

Full-screen **preview mode** on `/galeria` when the user **clicks or taps** any gallery image (original or duplicate tile). The existing **hover float** effect remains desktop-only; click always opens preview and **immediately cleans up** float state (timers, GSAP timelines, column shifts).

Visual references:

- **preview1** — blurred frozen gallery backdrop, large hero, bottom thumbnail strip (arrows on strip sides, not on hero).
- **preview2** — prev/next images peeking behind hero; outgoing hero animates into peek geometry.

---

## 2. Requirements Summary

| Area | Behavior |
|------|----------|
| Open | Click/tap any `.gallery-image-wrapper` (before/during/after float) → preview at logical index |
| Float | Hover-only on desktop; unchanged except click path calls `forceResetActiveFloat()` |
| Duplicates | Map to same `originalIndex` as corresponding original slot in column |
| Hero | Near full viewport **height** (portrait images); configurable top/bottom margins |
| Backdrop | **Frozen DOM clone** of gallery at open time + blur + dim; does not change per slide |
| Peeks | Prev/next behind hero when they exist; clickable; **none** on disabled side at ends |
| Thumb strip | 5 slots `[i-2…i+2]`; empty slots at ends; center thumb larger (config); **animates** on nav |
| Nav | Strip thumbs, strip arrows, peeks, ←/→ keys, horizontal swipe on hero |
| Ends | **No wrap**; prev/next disabled and dimmed |
| Transition | Layered GSAP choreography (hero + peeks + thumbs); **mirrored** for prev |
| Rapid input | **Ignore** nav clicks until current transition completes |
| Reduced motion | **Not applied** to preview transitions (always full animation) |
| Scroll | **Locked** while preview open |
| Close | ✕, Escape, backdrop click, `history.back()` / `popstate`, `astro:before-swap` |
| Images | High-res loaded on open (spinner); preload `index±1` immediately, `index±2` for strip |

---

## 3. Architecture (Approach #2)

### Modules

```
src/config/gallery.ts              — PREVIEW_* constants
src/scripts/gallery/preview.ts     — overlay lifecycle, open/close, nav, preload
src/scripts/gallery/transition.ts  — buildNextTimeline / buildPrevTimeline (hero + thumbs)
src/pages/galeria.astro            — manifest JSON, overlay shell, click → preview, float unchanged
```

### Z-order (bottom → top)

1. **Layer 3 — Frozen backdrop:** cloned `#gallery-page` + blur + dim overlay.  
2. **Layer 2 — Side peeks:** prev/next narrow center-crop strips when indices exist.  
3. **Layer 1 — Hero:** current full preview image.  

During transition, outgoing hero moves from layer 1 → layer 2 geometry; incoming moves from layer 2 → layer 1.

### Build-time manifest

Sorted by `data-original-index` (same order as `allImageWrappers.sort` today).

Each entry:

```typescript
{
  index: number;
  alt: string;
  gridSrc: string;      // existing Astro-generated src (300/500)
  previewSrc: string;   // getImage at native width or PREVIEW_MAX_WIDTH cap
}
```

Injected as `<script type="application/json" id="gallery-manifest">` for the client module.

### Duplicate index resolution

For a click on a wrapper in `.gallery-set-duplicate`:

1. Find parent `.gallery-column` and index of wrapper among **all** wrappers in column (original + duplicate sets).  
2. `slotIndex = index % originalCount` where `originalCount` = originals in that column.  
3. Read `data-original-index` from the original wrapper at `slotIndex` in `.gallery-set-original`.

---

## 4. UI Layout

### Overlay

- `position: fixed; inset: 0; z-index` above site chrome (full viewport).  
- `role="dialog"` `aria-modal="true"`; focus trap; restore focus to clicked wrapper on close.  
- Close: ✕ top-right, `aria-label="Zamknij podgląd"`.

### Hero stage

- Flex column: main stage (`flex: 1`) + thumb rail (fixed height).  
- Hero: `object-fit: contain`;  
  `max-height: calc(100vh - PREVIEW_MARGIN_TOP - PREVIEW_MARGIN_BOTTOM - thumbRailHeight)`.  
- Width follows aspect ratio (horizontal letterboxing allowed).

### Side peeks

- Behind hero; vertically aligned with hero center.  
- Visible width ≈ `PREVIEW_PEEK_WIDTH_RATIO` of hero width; center crop via clip + `object-position: center`.  
- Opacity: `PREVIEW_PEEK_OPACITY`.  
- Click navigates prev/next (same as arrows).  
- Hidden entirely when no prev or next image.

### Bottom strip

- Five slots: `[i-2, i-1, i, i+1, i+2]`; missing indices = empty cell (no thumb).  
- Center: `PREVIEW_THUMB_ACTIVE_SCALE` (default slightly larger than side thumbs).  
- Sides: `PREVIEW_THUMB_SIDE_OPACITY`.  
- Chevron buttons **left of strip / right of strip** (not on hero); disabled at ends.  
- Visible thumb click → jump to index (full transition; direction from delta).

### Loading

- Spinner centered on hero until `previewSrc` decodes.  
- On open: preload `index ± 1`; idle preload `index ± 2` for strip and upcoming transitions.

### Backdrop click

- Clicks on blurred backdrop close preview.  
- Interactive children (`hero`, peeks, strip, ✕) stop propagation.

---

## 5. Hero Transition (GSAP)

**Duration / ease:** `PREVIEW_TRANSITION_DURATION`, `PREVIEW_TRANSITION_EASE`.

**Concurrency:** `isTransitioning` flag; ignore arrow, thumb, peek, keyboard, and swipe input until timeline completes.

**Direction:** `buildNextTimeline` / `buildPrevTimeline` (horizontal mirror).

### Mechanics (outgoing → peek, incoming → hero)

- **Clip container** width animates toward peek strip width (center band visible).  
- **Image scale:** width may also tween down by `PREVIEW_OUTGOING_IMAGE_SCALE` (default `0.7`, i.e. 30% reduction — **configurable**); `object-position: center` preserved.  
- **Height** eases toward peek height.  
- **Opacity** → `PREVIEW_PEEK_OPACITY`.  
- **z-index:** outgoing ends below incoming; incoming ends on top (layer 1).

**Incoming (from peek):**

- Starts at opposite peek geometry (narrow crop, low opacity).  
- Expands to full hero width/height; opacity → 1.  
- Mid-transition crosses fully opaque.

### Thumbnail strip animation (same master timeline)

- Strip **translates horizontally** (left for next, right for prev) so slots visually shift.  
- **Outgoing center thumb:** scale down to side-thumb size smoothly.  
- **Incoming center thumb:** scale up from side size to `PREVIEW_THUMB_ACTIVE_SCALE`.  
- Side thumbs in the row maintain relative opacity; slot contents swap on complete (or driven by timeline refs if cross-fading cells).

**Strip state update:** logical `currentIndex` and thumb `src` alignment on timeline **complete** (not mid-flight) to avoid desync.

---

## 6. Navigation & History

| Input | Action |
|-------|--------|
| Strip ←/→ | prev/next if enabled |
| Peek click | prev/next if enabled |
| Thumb click | go to index if slot filled |
| ← / → keys | prev/next |
| Swipe on hero | horizontal swipe past threshold → prev/next |
| Rapid repeat | ignored while `isTransitioning` |

**Ends:** no wrap; disabled controls `pointer-events: none` + reduced opacity.

**Open:** `history.pushState({ galleryPreview: true, index }, '', location.href)`.

**Close:** ✕ / Escape / backdrop → `history.back()` if state pushed; `popstate` closes preview.

**`astro:before-swap`:** close preview, kill timelines, remove overlay/DOM clone, unlock scroll, abort listeners.

**Scroll lock:** `overflow: hidden` on `body` (and scroll container if required); restored on close.

---

## 7. Integration with Existing Gallery Script

### Click handler (new)

- Delegated `click` on `#gallery-container` for **all** pointer types.  
- Resolve `originalIndex` (including duplicate mapping).  
- `forceResetActiveFloat()` then `preview.open(index)`.  
- `preventDefault()` where needed so touch path does not toggle float instead of preview.

### Float (unchanged behavior)

- Desktop hover delay → `triggerFloat`.  
- Mobile touch **click** opens preview (not float toggle). Desktop click opens preview (not float).  
- Consider removing or narrowing touch-only float toggle in favor of preview-only click (implementation detail: float on touch hover is N/A; tap = preview).

### Snapshot on open

1. Deep-clone `#gallery-page` (current transforms visible).  
2. Insert in backdrop layer; `filter: blur(PREVIEW_BACKDROP_BLUR)`; overlay `PREVIEW_BACKDROP_DIM`.  
3. Never update on slide change.  
4. Remove on close.

---

## 8. Configuration (`src/config/gallery.ts`)

| Constant | Purpose |
|----------|---------|
| `PREVIEW_MARGIN_TOP` | Hero top inset |
| `PREVIEW_MARGIN_BOTTOM` | Hero bottom inset (above thumb rail) |
| `PREVIEW_THUMB_SIZE` | Thumb cell size |
| `PREVIEW_THUMB_ACTIVE_SCALE` | Center thumb vs side size |
| `PREVIEW_THUMB_SIDE_OPACITY` | Non-center thumbs in strip |
| `PREVIEW_PEEK_OPACITY` | Side peeks + outgoing end opacity |
| `PREVIEW_PEEK_WIDTH_RATIO` | Peek visible width vs hero |
| `PREVIEW_OUTGOING_IMAGE_SCALE` | Hero image width scale during outgoing tween (e.g. `0.7`) |
| `PREVIEW_BACKDROP_BLUR` | Clone blur radius |
| `PREVIEW_BACKDROP_DIM` | RGBA overlay on backdrop |
| `PREVIEW_TRANSITION_DURATION` | Master timeline (seconds) |
| `PREVIEW_TRANSITION_EASE` | GSAP ease |
| `PREVIEW_MAX_WIDTH` | Cap for `getImage` preview generation |
| `PREVIEW_SWIPE_THRESHOLD_PX` | Min horizontal swipe distance |

Existing `FLOAT_*` constants unchanged.

---

## 9. Error Handling & Edge Cases

- **Image load failure:** show alt text / fallback message in hero; allow close and nav away.  
- **Resize while open:** recompute hero `max-height`; do not re-capture backdrop.  
- **Single image in gallery:** no peeks; both arrows disabled; strip shows one active thumb only.  
- **Open during column redistribution:** index stable via manifest, not DOM position.

---

## 10. Testing

### E2E (Playwright)

- Click original → overlay + dialog visible.  
- Click duplicate → same image as original slot.  
- Escape / backdrop / ✕ closes.  
- At index `0`, prev arrow disabled; at last, next disabled.  
- `history.back()` closes preview.  
- Scroll container does not scroll while open.

### Manual

- Frozen backdrop unchanged while changing slides.  
- Next/prev transition direction and mirror.  
- Thumb strip shifts and scales during transition.  
- Rapid clicks do not break state.  
- High-res appears after spinner; peeks preload when navigating.

---

## 11. Decisions Log

| Decision | Choice |
|----------|--------|
| Implementation shape | Extracted modules (#2), not monolithic astro script |
| Backdrop | DOM clone at open, not per-slide blurred image |
| Carousel ends | Stop (no wrap) |
| Close | ✕, Escape, backdrop, history, Astro swap |
| Motion in preview | Always full animation |
| Scroll | Locked |
| Preview resolution | High-res on open + spinner; preload neighbors |
| Duplicate tiles | Open same logical index |
| Rapid navigation | Ignore until transition completes |
| Thumb strip | Animated shift + scale with hero transition |
| Outgoing scale | Clip + optional image width scale (`PREVIEW_OUTGOING_IMAGE_SCALE`) |

---

## 12. Out of Scope

- URL hash / deep-linking to a specific image.  
- Category tabs (preview1 mockup top tabs).  
- Changing float hover behavior beyond click cleanup.  
- `prefers-reduced-motion` shortcuts in preview.
