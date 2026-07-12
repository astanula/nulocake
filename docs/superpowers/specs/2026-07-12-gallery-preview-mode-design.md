# Gallery Preview Mode — Design Spec

**Date:** 2026-07-12
**Status:** Approved
**Related:** `src/pages/galeria.astro`, `src/config/gallery.ts`, `src/components/gallery/GalleryPreview.astro`

---

## 1. Overview

A full-screen **preview mode** on `/galeria` opens when the user clicks or taps any gallery image (original or duplicate tile). The scrolling gallery pauses for the duration of the preview and resumes once it fully closes. The preview shows the clicked image large, with surrounding images reachable via arrows, side peeks, a thumbnail strip, keyboard, and history navigation.

This spec favors simplicity throughout: minimal motion, no cloned elements, no multi-stage choreography, and no animation on in-preview navigation. The one deliberate exception is a single, simple resize animation on open/close.

---

## 2. Requirements Summary

| Area | Behavior |
|------|----------|
| Open | Click/tap any `.gallery-image-wrapper` → preview opens at that image's logical index |
| Gallery pause | Happens **first**, synchronously, before anything else (before dialog opens, before any animation) |
| Gallery resume | Happens **last**, only after the preview has fully closed |
| Float (desktop) | Hover-only; a click cancels any active float before opening preview |
| Float (mobile) | Tap always opens preview directly; there is no touch-based float toggle |
| Duplicates | Read `data-original-index` directly from the clicked wrapper (originals and duplicates both carry it) |
| Hero | Near full viewport height (portrait images); configurable top/bottom margins; opens directly at its final position and size (via one simple scale/opacity tween) |
| Background | Real CSS blur + dim of the actual (paused) gallery behind the dialog; appears instantly, no fade |
| Peeks | Prev/next images shown behind the hero when they exist; clickable; hidden on the disabled side at the ends; visible instantly, no animation |
| Thumb strip | 5 slots `[i-2…i+2]`; empty slots at ends; center thumb larger; visible instantly, no animation |
| Counter | Position indicator (e.g. "3 / 16"); visible instantly, no animation |
| Nav | Strip thumbs, strip arrows, peeks, ←/→/Home/End keys — all update content **instantly** (no transition) |
| Ends | No wrap; prev/next disabled and dimmed |
| Scroll | Locked on `.scroll-container` while preview is open |
| Close | ✕, Escape, backdrop click, `history.back()` / `popstate`, `astro:before-swap` |
| Images | High-res image loads via off-DOM `decode()` then in-place `src` swap (no spinner, no visible pop); directional preload of neighbors |

---

## 3. Architecture

### Module

A single self-contained component holds the template, styles, and client script:

```
src/config/gallery.ts                      — PREVIEW_* constants
src/components/gallery/GalleryPreview.astro — dialog markup, styles, open/close/nav logic
src/pages/galeria.astro                     — manifest JSON, renders <GalleryPreview />, click → open event
```

No cloned/flying elements are needed and no separate transition module — the reduced animation surface (one open tween, one mirrored close tween, everything else instant) fits comfortably in one component.

### Build-time manifest

Sorted by `data-original-index`. The manifest `index` field equals the `data-original-index` attribute value for that image.

Each entry:

```typescript
{
  index: number;        // === data-original-index
  alt: string;
  gridSrc: string;      // existing Astro-generated src (grid resolution)
  thumbSrc: string;      // thumbnail-strip resolution
  peekSrc: string;      // side-peek resolution
  previewSrc: string;   // getImage at native width or PREVIEW_MAX_WIDTH cap
}
```

Injected as `<script type="application/json" id="gallery-manifest">` for the client script to parse.

### Index resolution on click

Every `.gallery-image-wrapper` — both in `.gallery-set-original` and `.gallery-set-duplicate` — carries a `data-original-index` attribute (duplicates inherit it via `cloneNode(true)` during column redistribution).

On click, read `wrapper.dataset.originalIndex` directly. No modulo arithmetic needed. Look up the manifest entry where `manifest[i].index === parseInt(originalIndex)`.

---

## 4. UI Layout

### Overlay

- Native `<dialog>` element with `.showModal()` for built-in focus trapping, Escape handling, `::backdrop`, and `inert` on background content.
- `position: fixed; inset: 0;` full viewport, above site chrome.
- `aria-roledescription="Podgląd galerii"`.
- Close button: ✕ top-right, `aria-label="Zamknij podgląd"`, positioned with `top: max(PREVIEW_MARGIN_TOP, env(safe-area-inset-top))` to avoid mobile status bar overlap.
- Focus restores to the clicked wrapper on close.

### Background

- The dialog's native `::backdrop` is styled with `backdrop-filter: blur(PREVIEW_BACKDROP_BLUR) brightness(...)` and a dim overlay color (`PREVIEW_BACKDROP_DIM`).
- This blurs the **real, paused gallery** directly — no image element, no per-navigation updates, no crossfade. Since the gallery is frozen while preview is open, the blurred view behind the dialog is always correct with zero extra work.
- Appears instantly with the dialog; no fade-in.
- Clicking the backdrop area (outside hero, peeks, strip, and ✕) closes the preview. Interactive children stop propagation.

### Hero stage

- Flex column: main stage (`flex: 1`) + thumb rail (fixed height).
- Hero: `object-fit: contain`; `max-height: calc(100vh - PREVIEW_MARGIN_TOP - PREVIEW_MARGIN_BOTTOM - thumbRailHeight)`.
- Width follows aspect ratio (horizontal letterboxing allowed).
- The hero image is positioned at its final, centered location from the very first frame — there is no travel/repositioning step.

### Image counter

- Top-center of hero stage (above hero, below close button).
- Format: `"3 / 16"` — current 1-based index + total count.
- Also an `aria-live="polite"` region, announced on each navigation (e.g. "Zdjęcie 3 z 16").
- Styled with `PREVIEW_COUNTER_OPACITY`.
- Visible instantly when the dialog opens.

### Side peeks

- Behind the hero; vertically aligned with hero center.
- Flush against the hero edges — zero gap between peek and hero.
- Visible width ≈ `PREVIEW_PEEK_WIDTH_RATIO` of hero width; center crop via clip + `object-position: center`.
- Opacity: `PREVIEW_PEEK_OPACITY`.
- Click navigates prev/next (same as arrows).
- Hidden entirely when no prev or next image exists.
- Visible instantly when the dialog opens; no reveal animation.

### Bottom strip

- Five slots: `[i-2, i-1, i, i+1, i+2]`; missing indices = empty cell (no thumb).
- Center: `PREVIEW_THUMB_ACTIVE_SCALE` (slightly larger than side thumbs).
- Sides: `PREVIEW_THUMB_SIDE_OPACITY`.
- Chevron buttons positioned beside the peek images (not on the hero itself); disabled at ends.
- Thumb click → jump to that index; content updates instantly.
- Visible instantly when the dialog opens; no scale-up animation.

### Loading

- No loading spinner. The user always sees a real image: the grid-resolution tile first, then the high-resolution version swapped in silently once decoded.
- **In-place HQ swap:** decode `previewSrc` on an off-DOM `Image()`, then assign `heroElement.src` in one step after `decode()` resolves. The hero stays visible throughout — no flash, no fade, no layout change.
  ```typescript
  const img = new Image();
  img.src = previewSrc;
  await img.decode();
  heroElement.src = previewSrc; // hero stays visible throughout; no spinner
  ```
- On navigation, the best already-available source is shown immediately (`gridSrc`, or a preloaded HQ image), then the same silent in-place HQ swap applies once `previewSrc` finishes decoding.
- **Directional preloading:** on open, preload `index ± 1`. On each navigation, preload the next image in the direction of travel. Idle preload `index ± 2` for the thumbnail strip.

---

## 5. Animations (GSAP)

Motion is deliberately minimal: one simple tween on open, its exact mirror on close, and no animation anywhere else. Everything else in this feature (background, chrome, navigation) is either instant CSS or a plain content swap.

### 5a. Open sequence

1. **Gallery pause** — call `pauseGallery()` synchronously as the very first action, before any other open logic runs.
2. **Scroll lock** — lock `.scroll-container` overflow.
3. **History** — `history.pushState({ galleryPreview: true }, '', location.href)`.
4. **Dialog opens** — `dialog.showModal()`. The `::backdrop` blur/dim is plain CSS, so it's present the instant the dialog paints — no fade.
5. **Chrome set to final state** — close button, arrows, counter, peeks, and thumbnail strip are set to their final `opacity: 1` (and correct scale) immediately; no animation.
6. **Hero tween** — the hero image, already at its final centered position, animates from `scale: PREVIEW_OPEN_START_SCALE, opacity: 0` to `scale: 1, opacity: 1` over `PREVIEW_OPEN_DURATION` with `PREVIEW_OPEN_EASE`. This is the only animated step.
7. **HQ hero fetch** — begins in parallel with step 6 (does not block it); swaps in place silently when ready.
8. **Preload** — preload `index ± 1` once the open tween completes.

### 5b. Close sequence

Exact mirror of open:

1. **Chrome hidden instantly** — close button, arrows, counter, peeks, and thumbnail strip set to `opacity: 0` immediately.
2. **Hero tween (reverse)** — hero animates from `scale: 1, opacity: 1` back to `scale: PREVIEW_OPEN_START_SCALE, opacity: 0` over `PREVIEW_OPEN_DURATION` / `PREVIEW_OPEN_EASE`.
3. **Dialog closes** — `dialog.close()` once the reverse tween completes.
4. **On the dialog's native `close` event** (fully closed): unlock scroll, call `resumeGallery()`, restore focus to the originating gallery tile (or fall back to the wrapper matching the last-viewed index).

### 5c. Navigation between images (no animation)

Changing the current image (via arrow, peek, thumbnail, or keyboard) updates hero `src`, backdrop (implicitly, since it's the real blurred background and doesn't need updating), peeks, thumbnail strip, and counter **instantly** — a plain content swap, no transition. Rapid navigation is safe since there is nothing to interrupt mid-flight.

---

## 6. Navigation & History

| Input | Action |
|-------|--------|
| Strip ←/→ | prev/next if enabled |
| Peek click | prev/next if enabled |
| Thumb click | go to index if slot filled |
| ← / → keys | prev/next |
| Home / End keys | first / last image |

**Ends:** no wrap; disabled controls get `pointer-events: none` + reduced opacity.

### History

- **Open:** single `history.pushState({ galleryPreview: true }, '', location.href)`. Only one entry pushed per open.
- **Navigation within preview** does not push additional history entries.
- **Close:** ✕ / Escape / backdrop → `history.back()` if state was pushed; `popstate` with `galleryPreview` state closes preview.
- Two presses of browser Back: first closes preview, second navigates away from `/galeria`.

**`astro:before-swap`:** close preview immediately (no animation), unlock scroll, resume gallery, remove listeners.

### Scroll lock

`overflow: hidden` on `.scroll-container`. Restored when the preview closes.

---

## 7. Integration with Gallery Script

### Gallery loop pause / resume

- `pauseGallery()` is called synchronously at the very start of the open handler — before the dialog opens, before any other setup.
- `resumeGallery()` is called from the dialog's native `close` event handler, after the preview is fully closed.
- If the gallery DOM does not exist (e.g. navigated away), skip gracefully.

### Click handler

- Delegated `click` on `#gallery-container` for all pointer types.
- Read `wrapper.dataset.originalIndex` directly (works for both originals and duplicates).
- Cancel any active float effect, then open the preview at that index.

### Float behavior

- **Desktop:** hover delay triggers float (unchanged, independent feature). Click opens preview instead of toggling float.
- **Mobile:** tap always opens preview. There is no touch-based float toggle; float is desktop-hover-only.

---

## 8. Configuration (`src/config/gallery.ts`)

| Constant | Purpose |
|----------|---------|
| `PREVIEW_MARGIN_TOP` | Hero top inset |
| `PREVIEW_MARGIN_BOTTOM` | Hero bottom inset (above thumb rail) |
| `PREVIEW_COUNTER_GAP` | Gap between hero and counter |
| `PREVIEW_COUNTER_FONT_SIZE` | Counter text size |
| `PREVIEW_COUNTER_OPACITY` | Opacity for the counter text |
| `PREVIEW_THUMB_SIZE` | Thumb cell size |
| `PREVIEW_THUMB_ACTIVE_SCALE` | Center thumb vs side size |
| `PREVIEW_THUMB_SIDE_OPACITY` | Non-center thumbs in strip |
| `PREVIEW_PEEK_OPACITY` | Side peek opacity |
| `PREVIEW_PEEK_WIDTH_RATIO` | Peek visible width vs hero width |
| `PREVIEW_PEEK_HEIGHT_RATIO` | Peek visible height vs hero height |
| `PREVIEW_BACKDROP_BLUR` | `::backdrop` blur radius |
| `PREVIEW_BACKDROP_DIM` | `::backdrop` dim overlay color |
| `PREVIEW_OPEN_DURATION` | Duration of the single hero open/close tween in seconds (e.g. `0.3`) |
| `PREVIEW_OPEN_START_SCALE` | Hero's starting scale on open / ending scale on close (e.g. `0.9`) |
| `PREVIEW_OPEN_EASE` | GSAP ease for the hero tween |
| `PREVIEW_MAX_WIDTH` | Cap for `getImage` preview generation |

Existing `FLOAT_*` constants are unrelated and unchanged.

---

## 9. Accessibility

### Dialog

- Native `<dialog>` with `.showModal()` provides built-in focus trapping, Escape handling, and `inert` on background content.

### Focus order (Tab / Shift+Tab)

1. Close button (✕)
2. Prev arrow (if enabled)
3. Hero image (for `alt` text context)
4. Next arrow (if enabled)
5. Thumbnail strip items (left to right)

Focus cycles within the dialog (built-in with `<dialog>`).

### Screen reader

- `aria-roledescription="Podgląd galerii"` on `<dialog>`.
- `aria-label` on each interactive image (using `alt` from manifest).
- Image counter region with `aria-live="polite"` — announces `"Zdjęcie 3 z 16"` on each navigation.
- Prev/next arrows: `aria-label="Poprzednie zdjęcie"` / `"Następne zdjęcie"`.

### Keyboard

- **Escape:** close preview (native `<dialog>` behavior).
- **← / →:** prev / next image.
- **Home / End:** first / last image.
- **Enter / Space:** activate focused element (thumb, arrow, close).
- **Tab / Shift+Tab:** cycle focus within dialog.

---

## 10. Error Handling & Edge Cases

- **Image load failure:** show alt text / fallback in hero; allow close and nav away.
- **Resize while open:** recompute hero `max-height`; the real-gallery background blur re-covers the viewport automatically (it's just CSS on the actual page).
- **Single image in gallery:** no peeks; both arrows disabled; strip shows one active thumb only. Counter reads "1 / 1".
- **Open during column redistribution:** index stable via manifest, not DOM position.
- **`decode()` failure:** fall back to setting `src` directly (visible pop-in is acceptable as graceful degradation).

---

## 11. Testing

### Manual

- Gallery visibly pauses the instant an image is clicked, before the dialog appears.
- Background behind the dialog is blurred/dimmed and matches the real (frozen) gallery.
- Hero opens with a single smooth resize; no clone artifact, no travel across the screen.
- Chrome (peeks, thumb strip, controls, counter) is present immediately on open, with no fade/scale-in.
- Navigating between images swaps content immediately, with no transition.
- Close mirrors open; gallery resumes scrolling only after the dialog is fully closed.
- HQ swap is imperceptible (no spinner, no pop).

### Automated (future)

E2E coverage (open/close, navigation boundaries, history, scroll lock, pause/resume timing) is deferred to a follow-up testing pass and not part of this implementation plan.

---

## 12. Decisions Log

| Decision | Choice |
|----------|--------|
| Implementation shape | Single self-contained component (`GalleryPreview.astro`); no separate transition module |
| Background | Native `::backdrop` with `backdrop-filter` blurring the real paused gallery — no backdrop image, no per-slide updates |
| Pause timing | First step of open, before dialog opens or anything animates |
| Resume timing | Last step, fired from the dialog's native `close` event |
| Hero open/close | One simple scale + opacity tween, no clone, no travel, no multi-stage choreography |
| Chrome (peeks/thumbs/controls/counter) | Instant final state on open; instant hidden on close; no animation |
| In-preview navigation | Instant content swap; no transition, no swipe (deferred) |
| Carousel ends | Stop (no wrap) |
| Close triggers | ✕, Escape, backdrop, history, Astro swap |
| Scroll | Locked on `.scroll-container` while open |
| Preview resolution | Off-DOM `decode()` + in-place HQ swap; no spinner; directional preload of neighbors |
| Duplicate tiles | Read `data-original-index` directly from the clicked wrapper |
| Dialog | Native `<dialog>` with `.showModal()` for built-in accessibility |
| History | Single `pushState` on open; nav within preview does not alter history |
| Mobile float | No touch-based float toggle; tap always opens preview |

---

## 13. Out of Scope

- Animated transitions between images (hero-to-peek morph, backdrop cross-fade, thumb strip shift) — navigation is instant for now; a future iteration may layer this back in.
- Swipe gestures on mobile.
- URL hash / deep-linking to a specific image.
- Category tabs.
- Pinch-to-zoom on hero image.
- Automated E2E tests (follow-up pass).
