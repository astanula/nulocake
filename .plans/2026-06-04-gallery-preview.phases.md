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
* **Implementation Steps:**
  * [ ] Step 1: Inject build-time manifest via `<script type="application/json" id="gallery-manifest">` in `src/pages/galeria.astro`.
  * [ ] Step 2: Create native `<dialog>` overlay shell with basic hero image slot, close button (✕), and `aria` attributes.
  * [ ] Step 3: Implement delegated click handler on `#gallery-container` to read `data-original-index` and call `.showModal()`. Update mobile touch behavior so tap opens preview directly.
  * [ ] Step 4: Implement basic high-res image decoding via `HTMLImageElement.decode()` and display it on the hero stage (with fallback spinner).
  * [ ] Step 5: Add basic close handling (✕, Escape, backdrop click, `history.back()` / `popstate`) and lock `.scroll-container` scroll while open.

## Phase 2: Core Navigation & Backdrop
* **DependsOn:** Phase 1
* **Objective:** User can navigate between images using keyboard or arrows, with the blurred backdrop behind.
* **Requirements Addressed:** Next/prev arrow UI, keyboard nav, boundary logic (ends disabled), directional preloading, backdrop image rendering, image counter update.
* **Implementation Steps:**
  * [ ] Step 1: Add prev/next arrow buttons and keyboard listeners (←/→, Home/End).
  * [ ] Step 2: Implement navigation logic with boundary checks (no wrap, disable arrows at ends).
  * [ ] Step 3: Add image counter UI (e.g., "3 / 16") with `aria-live="polite"` and update logic.
  * [ ] Step 4: Implement directional preloading for `index ± 1` and adjacent images.
  * [ ] Step 5: Add blurred backdrop layer (current hero image scaled and blurred) that updates on slide change.

## Phase 3: Thumbnail Strip & Peeks
* **DependsOn:** Phase 2
* **Objective:** User sees surrounding images as side peeks and in a thumbnail strip, and can click them to navigate.
* **Requirements Addressed:** Side peeks rendering and click nav, thumb strip slots (5 slots), center thumb scaling, thumb click nav.
* **Implementation Steps:**
  * [ ] Step 1: Render side peeks (layer 2) with proper cropping and opacity.
  * [ ] Step 2: Render 5-slot bottom thumbnail strip with appropriate scaling for the active center thumb.
  * [ ] Step 3: Add click navigation to peeks and thumbnails.
  * [ ] Step 4: Update strip and peeks contents dynamically upon each navigation event.

## Phase 5: Open/Close & Core Animations (GSAP)
* **DependsOn:** Phase 3
* **Objective:** The preview opens and closes smoothly, pausing the underlying gallery animation.
* **Requirements Addressed:** Pause/resume gallery loop, open fade/scale animation, close fade/scale animation.
* **Implementation Steps:**
  * [ ] Step 1: Integrate existing `pauseGallery()` on open and `resumeGallery()` on close.
  * [ ] Step 2: Build GSAP open animation (backdrop fade, hero scale/fade in, peeks slide, thumb strip slide up).
  * [ ] Step 3: Build GSAP close animation (mirror of open).
  * [ ] Step 4: Ensure animation respects `PREVIEW_OPEN_DURATION` and `PREVIEW_OPEN_EASE` from `src/config/gallery.ts`.

## Phase 5: Seamless Navigation Transitions & Gestures
* **DependsOn:** Phase 4
* **Objective:** Navigating between images uses sophisticated GSAP transition choreography and supports swipe gestures on mobile.
* **Requirements Addressed:** Master transition timeline (hero geometry, peeks fade, backdrop cross-fade, thumb strip shift/scale), swipe gesture logic, transition concurrency lock.
* **Implementation Steps:**
  * [ ] Step 1: Add `isTransitioning` lock to ignore rapid inputs during animation.
  * [ ] Step 2: Build GSAP master transition timeline for hero and peeks (outgoing scale/fade to peek, incoming expand from peek).
  * [ ] Step 3: Add backdrop cross-fade and thumb strip translation/scaling to the master transition timeline.
  * [ ] Step 4: Implement horizontal pointer swipe gesture (using distance threshold `PREVIEW_SWIPE_THRESHOLD_PX`) for next/prev.

## Phase 6: Testing & Final Verification
* **DependsOn:** Phase 5
* **Objective:** Ensure all functionality works correctly and regression tests are in place.
* **Requirements Addressed:** E2E testing, accessibility checks, mobile tap behavior verification.
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
