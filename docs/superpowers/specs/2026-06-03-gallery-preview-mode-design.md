# Gallery Preview Mode — Design Spec

**Date:** 2026-06-03  
**Revised:** 2026-06-04  
**Status:** Approved  
**Related:** `src/pages/galeria.astro`, `src/config/gallery.ts`, `design/gallery/gallery-preview1.png`, `design/gallery/gallery-preview2.png`

---

## 1. Overview

Full-screen **preview mode** on `/galeria` when the user **clicks or taps** any gallery image (original or duplicate tile). The existing **hover float** effect remains desktop-only; click always opens preview and **immediately cleans up** float state (timers, GSAP timelines, column shifts). Mobile tap **always** opens preview — touch-based float toggle is removed.

Visual references:

- **preview1** — blurred backdrop, large hero, bottom thumbnail strip (arrows on strip sides, not on hero).
- **preview2** — prev/next images peeking behind hero; outgoing hero animates into peek geometry.

---

## 2. Requirements Summary

| Area | Behavior |
|------|----------|
| Open | Click/tap any `.gallery-image-wrapper` (before/during/after float) → preview at logical index |
| Float | Hover-only on desktop; click path calls `forceResetActiveFloat()`. **Mobile tap opens preview (no float toggle).** |
| Duplicates | Read `data-original-index` directly from clicked wrapper (originals and duplicates both carry the attribute) |
| Hero | Near full viewport **height** (portrait images); configurable top/bottom margins |
| Backdrop | **Current hero image** scaled to cover the full viewport, blurred + dimmed; **updates on each slide change** |
| Peeks | Prev/next behind hero when they exist; clickable; **none** on disabled side at ends |
| Thumb strip | 5 slots `[i-2…i+2]`; empty slots at ends; center thumb larger (config); **animates** on nav |
| Counter | Image position indicator (e.g. "3 / 16") near top or bottom of hero stage |
| Nav | Strip thumbs, strip arrows, peeks, ←/→/Home/End keys, horizontal swipe on hero |
| Ends | **No wrap**; prev/next disabled and dimmed |
| Transition | Layered GSAP choreography (hero + peeks + thumbs + backdrop cross-fade); **mirrored** for prev |
| Rapid input | **Ignore** nav clicks until current transition completes |
| Reduced motion | **Not applied** to preview transitions (see §12 for rationale) |
| Scroll | **Locked** on `.scroll-container` while preview open |
| Close | ✕, Escape, backdrop click, `history.back()` / `popstate`, `astro:before-swap` |
| Images | High-res loaded via `img.decode()` (spinner until ready); directional preload (see §4) |

---

## 3. Architecture (Approach #2)

### Modules

```
src/config/gallery.ts              — PREVIEW_* constants
src/scripts/gallery/preview.ts     — overlay lifecycle, open/close, nav, preload, backdrop
src/scripts/gallery/transition.ts  — buildNextTimeline / buildPrevTimeline (hero + thumbs + backdrop)
src/pages/galeria.astro            — manifest JSON, overlay shell, click → preview
```

### Z-order (bottom → top)

1. **Layer 1 — Backdrop:** current image scaled to cover viewport + `filter: blur(PREVIEW_BACKDROP_BLUR)` + dim overlay. Lowest z-index.
2. **Layer 2 — Side peeks:** prev/next narrow center-crop strips when indices exist.
3. **Layer 3 — Hero:** current full preview image. Highest z-index.

During transition, outgoing hero moves from layer 3 → layer 2 geometry; incoming moves from layer 2 → layer 3.

### Build-time manifest

Sorted by `data-original-index`. The manifest `index` field **equals** the `data-original-index` attribute value for that image — they are the same canonical key.

Each entry:

```typescript
{
  index: number;        // === data-original-index
  alt: string;
  gridSrc: string;      // existing Astro-generated src (300/500)
  previewSrc: string;   // getImage at native width or PREVIEW_MAX_WIDTH cap
}
```

Injected as `<script type="application/json" id="gallery-manifest">` for the client module.

### Index resolution on click

Every `.gallery-image-wrapper` — both in `.gallery-set-original` and `.gallery-set-duplicate` — carries a `data-original-index` attribute (duplicates inherit it via `cloneNode(true)` during `redistributeColumns`).

On click, read `wrapper.dataset.originalIndex` directly. No modulo arithmetic needed.

Look up the manifest entry where `manifest[i].index === parseInt(originalIndex)`.

---

## 4. UI Layout

### Overlay

- Use native `<dialog>` element with `.showModal()` for built-in focus trapping, Escape handling, `::backdrop`, and `inert` on background content.
- `position: fixed; inset: 0; z-index` above site chrome (full viewport).
- `aria-roledescription="Podgląd galerii"`.
- Close button: ✕ top-right, `aria-label="Zamknij podgląd"`, positioned with `top: max(PREVIEW_MARGIN_TOP, env(safe-area-inset-top))` to avoid mobile status bar overlap.
- Restore focus to the clicked wrapper on close.

### Hero stage

- Flex column: main stage (`flex: 1`) + thumb rail (fixed height).
- Hero: `object-fit: contain`;
  `max-height: calc(100vh - PREVIEW_MARGIN_TOP - PREVIEW_MARGIN_BOTTOM - thumbRailHeight)`.
- Width follows aspect ratio (horizontal letterboxing allowed).

### Image counter

- Position: top-center of hero stage (above hero, below close button).
- Format: `"3 / 16"` — current 1-based index + total count.
- Also serves as `aria-live="polite"` region: announced on each navigation for screen readers (e.g. "Zdjęcie 3 z 16").
- Styled with `PREVIEW_COUNTER_OPACITY` (subtle, not distracting).

### Side peeks

- Behind hero (layer 2); vertically aligned with hero center.
- **Flush against hero edges** — zero gap between peek and hero. Peeks are positioned so their inner edge touches the hero's outer edge exactly (no margin/padding/gap between them).
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

- Spinner centered on hero until `previewSrc` is ready.
- Use `HTMLImageElement.decode()` for jank-free rendering:
  ```typescript
  const img = new Image();
  img.src = previewSrc;
  await img.decode();
  heroElement.src = previewSrc;
  ```
- **Directional preloading:** on open, preload `index ± 1`. On each navigation, preload the next image in the direction of travel (e.g. after navigating forward to index 5, preload index 7). Cancel stale in-flight preloads for images the user has already passed.
- Idle preload `index ± 2` for strip thumbnails.

### Backdrop

- The current hero image (`previewSrc`) scaled to cover the full viewport (`object-fit: cover; width: 100%; height: 100%`).
- `filter: blur(PREVIEW_BACKDROP_BLUR)` + semi-transparent dim overlay (`PREVIEW_BACKDROP_DIM`).
- **Updates on each slide change:** cross-fade to the new image's blurred version during the hero transition (part of the master timeline).
- Clicks on the backdrop area (outside hero, peeks, strip, and ✕) close preview.
- Interactive children stop propagation.

---

## 5. Animations (GSAP)

### 5a. Open animation

**Duration / ease:** `PREVIEW_OPEN_DURATION`, `PREVIEW_OPEN_EASE`.

1. **Pause gallery loop** — call `pauseGallery()` to smoothly decelerate all column scroll tweens to `timeScale: 0`. Gallery columns freeze in place behind the overlay.
2. Backdrop blurred image fades in from `opacity: 0` → `1` + dim overlay.
3. Hero image enters: clicked thumbnail animates (FLIP-style) from its grid position to hero center — scale and position tween. If FLIP is too complex for v1, fallback: hero fades in + scales from `0.8` → `1`.
4. Side peeks slide in from edges (if they exist) with slight delay.
5. Thumb strip slides up from below.
6. Counter and close button fade in last.

**Scroll lock** applied immediately on open (before animation starts).

### 5b. Close animation

Mirror of open:

1. Hero scales down / fades out (or FLIP back to grid position).
2. Peeks, strip, counter, close button fade out.
3. Backdrop dims and fades.
4. On animation complete: remove overlay, unlock scroll, restore focus, **resume gallery loop** via `resumeGallery()` (smoothly accelerates column tweens back to `timeScale: 1`).

### 5c. Hero transition (nav between images)

**Duration / ease:** `PREVIEW_TRANSITION_DURATION`, `PREVIEW_TRANSITION_EASE`.

**Concurrency:** `isTransitioning` flag; ignore arrow, thumb, peek, keyboard, and swipe input until timeline completes.

**Direction:** `buildNextTimeline` / `buildPrevTimeline` (horizontal mirror).

#### Mechanics (outgoing → peek, incoming → hero)

- **Clip container** width animates toward peek strip width (center band visible).
- **Image scale:** width may also tween down by `PREVIEW_OUTGOING_IMAGE_SCALE` (default `0.7`, i.e. 30% reduction — **configurable**); `object-position: center` preserved.
- **Height** eases toward peek height.
- **Opacity** → `PREVIEW_PEEK_OPACITY`.
- **z-index:** outgoing ends below incoming; incoming ends on top (layer 3).

**Incoming (from peek):**

- Starts at opposite peek geometry (narrow crop, low opacity).
- Expands to full hero width/height; opacity → 1.
- Mid-transition crosses fully opaque.

#### Backdrop cross-fade (same master timeline)

- Outgoing backdrop image fades to `opacity: 0` while incoming backdrop image (new hero's `previewSrc`, blurred) fades to `opacity: 1`.
- Timed to be mostly complete by the time the hero swap lands.

#### Thumbnail strip animation (same master timeline)

- Strip **translates horizontally** (left for next, right for prev) so slots visually shift.
- **Outgoing center thumb:** scale down to side-thumb size smoothly.
- **Incoming center thumb:** scale up from side size to `PREVIEW_THUMB_ACTIVE_SCALE`.
- Side thumbs in the row maintain relative opacity; slot contents swap on complete (or driven by timeline refs if cross-fading cells).

**Strip state update:** logical `currentIndex` and thumb `src` alignment on timeline **complete** (not mid-flight) to avoid desync.

**Counter update:** update text on timeline complete.

---

## 6. Navigation & History

| Input | Action |
|-------|--------|
| Strip ←/→ | prev/next if enabled |
| Peek click | prev/next if enabled |
| Thumb click | go to index if slot filled |
| ← / → keys | prev/next |
| Home / End keys | first / last image |
| Swipe on hero | horizontal swipe past threshold → prev/next |
| Rapid repeat | ignored while `isTransitioning` |

**Ends:** no wrap; disabled controls `pointer-events: none` + reduced opacity.

### History

- **Open:** single `history.pushState({ galleryPreview: true }, '', location.href)`. Only one entry pushed per open.
- **Navigation within preview** (next/prev/thumb) does **not** push additional history entries.
- **Close:** ✕ / Escape / backdrop → `history.back()` if state was pushed; `popstate` with `galleryPreview` state closes preview.
- Two presses of browser Back: first closes preview, second navigates away from `/galeria`.

**`astro:before-swap`:** close preview, kill timelines, remove overlay, unlock scroll, abort listeners.

### Scroll lock

`overflow: hidden` on `.scroll-container` (the actual scroll ancestor on subpages — `body` already has `overflow: hidden` via `scroll-layout-active`). Restored on close.

### Swipe gestures

- **Implementation:** `PointerEvent`-based (`pointerdown` / `pointermove` / `pointerup`).
- **Horizontal only:** vertical movement is ignored (no threshold gate on vertical axis).
- **Distance-based:** trigger when horizontal delta exceeds `PREVIEW_SWIPE_THRESHOLD_PX`. No velocity component.
- **No follow-finger:** the image does not drag with the finger during swipe — it triggers a full transition once the threshold is crossed on `pointerup`.
- **Diagonal:** if vertical delta > horizontal delta, treat as no swipe.

---

## 7. Integration with Existing Gallery Script

### Gallery loop pause / resume

- **On preview open:** `pauseGallery()` — smoothly decelerates all column scroll tweens (`timeScale → 0`). The gallery columns freeze in their current positions behind the overlay. This uses the existing `pauseGallery()` function.
- **On preview close:** `resumeGallery()` — smoothly accelerates column tweens back to `timeScale: 1`. Gallery animation resumes from where it left off.
- If the gallery DOM does not exist (e.g. navigated away), skip gracefully.

### Click handler (new)

- Delegated `click` on `#gallery-container` for **all** pointer types.
- Read `wrapper.dataset.originalIndex` directly (works for both originals and duplicates).
- `forceResetActiveFloat()` then `preview.open(index)`.

### Float (changed behavior on mobile)

- **Desktop:** hover delay → `triggerFloat` (unchanged). Click opens preview (not float).
- **Mobile:** tap **always** opens preview. The existing touch-click float toggle (`pointerType === 'touch'` handler) is **removed**. Float is desktop-hover-only.

### Backdrop on open

1. Get `previewSrc` (or `gridSrc` as fast placeholder) for the target image from the manifest.
2. Create backdrop `<img>` with `object-fit: cover; width: 100%; height: 100%`.
3. Apply `filter: blur(PREVIEW_BACKDROP_BLUR)` + dim overlay (`PREVIEW_BACKDROP_DIM`).
4. Update backdrop image on each slide change (cross-fade via transition timeline).
5. Remove on close.

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
| `PREVIEW_BACKDROP_BLUR` | Backdrop image blur radius (e.g. `'40px'`) |
| `PREVIEW_BACKDROP_DIM` | RGBA overlay color on backdrop (e.g. `'rgba(0,0,0,0.7)'`) |
| `PREVIEW_TRANSITION_DURATION` | Hero nav master timeline (seconds) |
| `PREVIEW_TRANSITION_EASE` | GSAP ease for hero nav |
| `PREVIEW_OPEN_DURATION` | Open/close animation (seconds) |
| `PREVIEW_OPEN_EASE` | GSAP ease for open/close |
| `PREVIEW_MAX_WIDTH` | Cap for `getImage` preview generation |
| `PREVIEW_SWIPE_THRESHOLD_PX` | Min horizontal swipe distance |
| `PREVIEW_COUNTER_OPACITY` | Opacity for the image counter text |

Existing `FLOAT_*` constants unchanged.

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

- **Image load failure:** show alt text / fallback message in hero; backdrop stays on last successful image. Allow close and nav away.
- **Resize while open:** recompute hero `max-height`; backdrop re-covers viewport automatically via `object-fit: cover`.
- **Single image in gallery:** no peeks; both arrows disabled; strip shows one active thumb only. Counter reads "1 / 1".
- **Open during column redistribution:** index stable via manifest, not DOM position.
- **`decode()` failure:** fall back to setting `src` directly (visible pop-in is acceptable as graceful degradation).

---

## 11. Testing

### E2E (Playwright)

- Click original → overlay + dialog visible.
- Click duplicate → same image as original slot.
- Escape / backdrop / ✕ closes.
- At index `0`, prev arrow disabled; at last, next disabled.
- `history.back()` closes preview.
- `.scroll-container` does not scroll while open.
- Image counter shows correct position.
- Backdrop image changes on navigation.

### Manual

- Backdrop shows blurred version of current hero image, updates per slide.
- Open/close animation plays smoothly.
- Next/prev transition direction and mirror.
- Thumb strip shifts and scales during transition.
- Rapid clicks do not break state.
- High-res appears after spinner; peeks preload when navigating.
- Close button does not overlap mobile status bar.

---

## 12. Decisions Log

| Decision | Choice |
|----------|--------|
| Implementation shape | Extracted modules (#2), not monolithic astro script |
| Backdrop | Blurred current hero image covering full viewport (updates per slide) — not DOM clone, not per-slide backdrop-filter |
| Carousel ends | Stop (no wrap) |
| Close | ✕, Escape, backdrop, history, Astro swap |
| Motion in preview | Always full animation (rationale below) |
| Scroll | Locked on `.scroll-container` |
| Preview resolution | High-res on open via `img.decode()` + spinner; directional preload neighbors |
| Duplicate tiles | Read `data-original-index` directly from clicked wrapper |
| Rapid navigation | Ignore until transition completes |
| Thumb strip | Animated shift + scale with hero transition |
| Outgoing scale | Clip + optional image width scale (`PREVIEW_OUTGOING_IMAGE_SCALE`) |
| Dialog | Native `<dialog>` with `.showModal()` for built-in a11y |
| History | Single `pushState` on open; nav within preview does not alter history |
| Mobile float | Touch-based float toggle removed; tap always opens preview |
| Image counter | Visible position indicator + `aria-live` for screen readers |

### Reduced motion rationale

`prefers-reduced-motion` is **not** applied to preview transitions. Rationale: preview transitions are short, essential-to-comprehension interactions (spatial navigation between images) analogous to native OS photo viewers which also animate regardless of the reduced-motion preference. The transitions provide critical directional context (left/right) that would be lost with instant cuts. This is consistent with WCAG 2.3.3 which exempts "essential" animations. If user feedback indicates this is a problem, a future iteration can add a simplified cross-fade fallback.

---

## 13. Out of Scope

- URL hash / deep-linking to a specific image.
- Category tabs (preview1 mockup top tabs).
- Follow-finger swipe dragging (distance threshold only, no visual tracking).
- Pinch-to-zoom on hero image.
