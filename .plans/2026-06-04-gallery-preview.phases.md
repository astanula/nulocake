# Gallery Preview Mode - Phased Implementation Plan

This plan details the implementation of a full-screen gallery preview mode based on the `2026-06-03-gallery-preview-mode-design.md` spec. The plan is broken down into vertical slices to ensure that each phase delivers working, testable functionality. Testing is deferred to the final phase.

## Execution Progress Checklist

- [x] Phase 1: Basic Preview & Dialog
- [x] Phase 2: Core Navigation & Backdrop
- [x] Phase 3: Thumbnail Strip & Peeks
- [ ] Phase 4: Open/Close & Core Animations (GSAP)
- [ ] Phase 5: Seamless Navigation Transitions & Gestures
- [ ] Phase 6: Testing & Final Verification

---

## Phase 1: Basic Preview & Dialog
* **DependsOn:** None
* **Objective:** User can click a gallery image and see it in a basic full-screen modal, and close it.
* **Requirements Addressed:** Manifest injection, `<dialog>` shell, click handler to read `data-original-index`, basic open/close via ✕ and Escape, image decoding, scroll lock.
* **Relevant Configuration Constants:**
  * `PREVIEW_MARGIN_TOP` — Hero top inset / close button safety margin
  * `PREVIEW_MAX_WIDTH` — Cap for `getImage` preview generation
* **Implementation Steps:**
  * [x] Step 1: Inject build-time manifest via `<script type="application/json" id="gallery-manifest">` in `src/pages/galeria.astro`.
  * [x] Step 2: Create native `<dialog>` overlay shell with basic hero image slot, close button (✕), and `aria` attributes.
  * [x] Step 3: Implement delegated click handler on `#gallery-container` to read `data-original-index` and call `.showModal()`. Update mobile touch behavior so tap opens preview directly.
  * [x] Step 4: Implement high-res decode via off-DOM `HTMLImageElement.decode()` and in-place `src` swap (no spinner).
  * [x] Step 5: Add basic close handling (✕, Escape, backdrop click, `history.back()` / `popstate`) and lock `.scroll-container` scroll while open.

## Phase 2: Core Navigation & Backdrop
* **DependsOn:** Phase 1
* **Objective:** User can navigate between images using keyboard or arrows, with the blurred backdrop behind.
* **Requirements Addressed:** Next/prev arrow UI, keyboard nav, boundary logic (ends disabled), directional preloading, backdrop image rendering, image counter update.
* **Relevant Configuration Constants:**
  * `PREVIEW_BACKDROP_BLUR` — Backdrop image blur radius (e.g. `'40px'`)
  * `PREVIEW_BACKDROP_DIM` — RGBA overlay color on backdrop (e.g. `'rgba(0,0,0,0.7)'`)
  * `PREVIEW_COUNTER_OPACITY` — Opacity for the image counter text
* **Implementation Steps:**
  * [x] Step 1: Add prev/next arrow buttons and keyboard listeners (←/→, Home/End).
  * [x] Step 2: Implement navigation logic with boundary checks (no wrap, disable arrows at ends).
  * [x] Step 3: Add image counter UI (e.g., "3 / 16") with `aria-live="polite"` and update logic.
  * [x] Step 4: Implement directional preloading for `index ± 1` and adjacent images.
  * [x] Step 5: Add blurred backdrop layer (current hero image scaled and blurred) that updates on slide change.

## Phase 3: Thumbnail Strip & Peeks
* **DependsOn:** Phase 2
* **Objective:** User sees surrounding images as side peeks and in a thumbnail strip, and can click them to navigate.
* **Requirements Addressed:** Side peeks rendering and click nav, thumb strip slots (5 slots), center thumb scaling, thumb click nav.
* **Relevant Configuration Constants:**
  * `PREVIEW_MARGIN_BOTTOM` — Hero bottom inset (above thumb rail)
  * `PREVIEW_THUMB_SIZE` — Thumb cell size
  * `PREVIEW_THUMB_ACTIVE_SCALE` — Center thumb vs side size
  * `PREVIEW_THUMB_SIDE_OPACITY` — Non-center thumbs in strip opacity
  * `PREVIEW_PEEK_OPACITY` — Side peeks + outgoing end opacity
  * `PREVIEW_PEEK_WIDTH_RATIO` — Peek visible width vs hero width
* **Implementation Steps:**
  * [x] Step 1: Render side peeks (layer 2) with proper cropping and opacity.
  * [x] Step 2: Render 5-slot bottom thumbnail strip with appropriate scaling for the active center thumb.
  * [x] Step 3: Add click navigation to peeks and thumbnails.
  * [x] Step 4: Update strip and peeks contents dynamically upon each navigation event.

## Phase 4: Open/Close & Core Animations (GSAP)
* **DependsOn:** Phase 3
* **Objective:** Staged open/close choreography per `2026-06-03-gallery-preview-mode-design.md` §5a–5b (replace current single-timeline fade/scale).
* **Requirements Addressed:** Gallery image → center shift; async HQ hero; hero grow + backdrop; chrome reveal; peek HQ preload; conditional `pauseGallery()`; reverse close with in-place hero fade and early `resumeGallery()`.
* **Relevant Configuration Constants:**
  * `PREVIEW_OPEN_SHIFT_DURATION` — Stage 0: shift clicked gallery image to viewport center
  * `PREVIEW_OPEN_HERO_BACKDROP_DURATION` — Stage 2: hero to final size + backdrop fade in
  * `PREVIEW_OPEN_CHROME_DURATION` — Stage 4: thumb strip scale-up, peeks from below hero, controls fade
  * `PREVIEW_OPEN_EASE` — GSAP ease for all open/close stages
  * (Remove or alias `PREVIEW_OPEN_DURATION` once the three durations above exist in `src/config/gallery.ts`)
* **Implementation Steps:**
  * [ ] Step 1: Add staged duration constants to `src/config/gallery.ts`; wire into preview module.
  * [ ] Step 2: **Open stage 0** — Clone or promote clicked gallery `<img>`; GSAP shift to viewport center; start `previewSrc` fetch/decode; open dialog + scroll lock.
  * [ ] Step 3: **Open stage 2** — Parallel hero grow to computed preview size + backdrop/dim fade `0 → 1`.
  * [ ] Step 4: **Open stage 4** — Parallel thumb strip scale from tiny → final; peeks slide up from below hero using `gridSrc`; fade in close/arrows/counter.
  * [ ] Step 5: **Open finish** — On stage 4 complete: preload HQ for peek/nav neighbors; in-place HQ hero swap when decode completes (no spinner); `pauseGallery()` (or confirm already paused if start-of-open pause was free).
  * [ ] Step 6: **Close** — Reverse stage order: chrome out → backdrop/hero shrink → `resumeGallery()` at start of hero in-place fade-out → dialog close, scroll unlock, focus restore.
  * [ ] Step 7: Remove/replace current Phase 4 GSAP (simultaneous fade/scale/slide) in `GalleryPreview.astro`.

## Phase 5: Seamless Navigation Transitions & Gestures
* **DependsOn:** Phase 4
* **Objective:** Navigating between images uses sophisticated GSAP transition choreography and supports swipe gestures on mobile.
* **Requirements Addressed:** Master transition timeline (hero geometry, peeks fade, backdrop cross-fade, thumb strip shift/scale), swipe gesture logic, transition concurrency lock.
* **Relevant Configuration Constants:**
  * `PREVIEW_TRANSITION_DURATION` — Hero nav master timeline duration (seconds)
  * `PREVIEW_TRANSITION_EASE` — GSAP ease for hero nav
  * `PREVIEW_OUTGOING_IMAGE_SCALE` — Hero image width scale during outgoing tween
  * `PREVIEW_SWIPE_THRESHOLD_PX` — Min horizontal swipe distance
* **Implementation Steps:**
  * [ ] Step 1: Add `isTransitioning` lock to ignore rapid inputs during animation.
  * [ ] Step 2: Build GSAP master transition timeline for hero and peeks (outgoing scale/fade to peek, incoming expand from peek).
  * [ ] Step 3: Add backdrop cross-fade and thumb strip translation/scaling to the master transition timeline.
  * [ ] Step 4: Implement horizontal pointer swipe gesture (using distance threshold `PREVIEW_SWIPE_THRESHOLD_PX`) for next/prev.

## Phase 6: Testing & Final Verification
* **DependsOn:** Phase 5
* **Objective:** Ensure all functionality works correctly and regression tests are in place.
* **Requirements Addressed:** E2E testing, accessibility checks, mobile tap behavior verification.
* **Relevant Configuration Constants:**
  * (All previous constants verified and validated)
* **Implementation Steps:**
  * [ ] Step 1: Write Playwright E2E tests for open/close, navigation, and boundaries.
  * [ ] Step 2: Verify accessibility (focus trapping, focus order, `aria-live`, `aria-labels`).
  * [ ] Step 3: Verify mobile touch behavior (tap opens preview, no float).
  * [ ] Step 4: Run manual testing checklist to ensure high performance and correct visual states.

---

## Verification Plan

### Automated Tests
- Run Playwright E2E tests to verify dialog functionality, navigation boundaries, history management, and scroll locking.

### Manual Verification
- Test all interactive elements (thumbnails, arrows, peeks, keyboard, swipe gestures).
- Ensure animations are smooth and free of jank across devices.
- Verify focus management and screen reader announcements.
