# Gallery Image Floating Effect — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a hover-activated "floating" effect to gallery images that scales them up, shifts adjacent images, pauses the scroll loop, and handles viewport boundary clamping — with mobile tap support and full lifecycle cleanup.

**Architecture:** Event-delegated pointer/click listeners on `.gallery-container` manage a state machine (`activeFloatWrapper`, `pendingTimer`, `activeFloatTimeline`). On trigger, a reversible GSAP timeline scales the wrapper, zooms the inner image, shifts adjacent siblings, and elevates the column's stacking context. `forceResetActiveFloat()` is the single cleanup path used by resize, navigation, and interaction flows.

**Tech Stack:** GSAP 3.15 (timelines, `clearProps`), Astro View Transitions (`astro:page-load` / `astro:before-swap`), AbortController for listener lifecycle, Playwright E2E tests.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/config/gallery.ts` | New float config constants (`FLOAT_HOVER_DELAY_MS`, `FLOAT_SCALE_AMOUNT`, `FLOAT_ZOOM_AMOUNT`, `FLOAT_ANIMATION_DURATION`, `FLOAT_EASE`) |
| `src/pages/galeria.astro` — `<style>` block | CSS updates: overflow changes, `.is-elevated`, `.is-floating`, `cursor: pointer`, `will-change`, `backface-visibility` |
| `src/pages/galeria.astro` — `<script>` block | Float state machine, `forceResetActiveFloat()`, `pauseGallery()`, `resumeGallery()`, `triggerFloat()`, `attachFloatListeners()`, integration into `cleanupGallery()` and resize handler |
| `tests/e2e/gallery/float-effect.spec.ts` | E2E tests for the floating effect (hover delay, float activation, reverse, cleanup) |

---

## Task 1: Add Float Configuration Constants

**Files:**
- Modify: `src/config/gallery.ts:30-40`

- [ ] **Step 1: Add float config constants**

  Append these exports to `src/config/gallery.ts` after the existing `GALLERY_FADE_MIDPOINT_RATIO` export (line 37):

  ```typescript
  /** Delay (ms) before floating effect triggers on hover. */
  export const FLOAT_HOVER_DELAY_MS = 1000;

  /** Frame scale factor when floating (1.1 = 10% bigger). */
  export const FLOAT_SCALE_AMOUNT = 1.1;

  /** Inner image zoom factor when floating. */
  export const FLOAT_ZOOM_AMOUNT = 1.15;

  /** Duration (seconds) for floating animation in/out. */
  export const FLOAT_ANIMATION_DURATION = 0.4;

  /** Easing function for floating animation. */
  export const FLOAT_EASE = 'power2.out';
  ```

- [ ] **Step 2: Import new config in galeria.astro script**

  In `src/pages/galeria.astro` line 200-203, update the import statement to include the new constants:

  ```typescript
  import {
    BREAKPOINTS,
    HOVER_TRANSITION_DURATION,
    FLOAT_HOVER_DELAY_MS,
    FLOAT_SCALE_AMOUNT,
    FLOAT_ZOOM_AMOUNT,
    FLOAT_ANIMATION_DURATION,
    FLOAT_EASE,
  } from '../config/gallery';
  ```

- [ ] **Step 3: Verify dev server compiles without errors**

  Run: `npm run dev` (check terminal for compilation errors, then stop)

- [ ] **Step 4: Commit**

  ```bash
  git add src/config/gallery.ts src/pages/galeria.astro
  git commit -m "feat(gallery): add float effect configuration constants"
  ```

---

## Task 2: CSS Layout & Stacking Context Updates

**Files:**
- Modify: `src/pages/galeria.astro` — `<style>` block (lines 87-196)

- [ ] **Step 1: Update `.gallery-container` to clip vertical overflow**

  In the `.gallery-container` rule (line 95), add `overflow: clip;` so that the mask-image still works while preventing vertical content from spilling out. Add it right after `position: relative;` (line 102):

  ```css
  .gallery-container {
    display: flex;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    --gallery-current-padding: var(--gallery-padding-desktop, 4rem);
    padding: 0 var(--gallery-current-padding);
    position: relative;
    overflow: clip;

    /* Hardware-accelerated non-linear transparency fade mask at bottom only */
    mask-image: linear-gradient(
      to bottom,
      black 0px,
      black calc(100% - var(--gallery-fade-height)),
      calc(100% - var(--gallery-fade-height) * var(--gallery-fade-midpoint-ratio)),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0px,
      black calc(100% - var(--gallery-fade-height)),
      calc(100% - var(--gallery-fade-height) * var(--gallery-fade-midpoint-ratio)),
      transparent 100%
    );
  }
  ```

- [ ] **Step 2: Update `.gallery-column` to allow horizontal overlap**

  Change `overflow: hidden` to `overflow: visible` and add `transition` for the z-index class toggle. Replace the `.gallery-column` rule (line 144-149):

  ```css
  .gallery-column {
    flex: 1;
    overflow: visible;
    position: relative;
    min-width: 0;
  }
  ```

- [ ] **Step 3: Add `.is-elevated` column class**

  Add the new rule after `.gallery-column.is-hidden` (after line 154):

  ```css
  .gallery-column.is-elevated {
    z-index: 5;
  }
  ```

- [ ] **Step 4: Add float-related styles to `.gallery-image-wrapper`**

  Update the existing `.gallery-image-wrapper` rule (line 169-173) to include cursor, will-change, and backface-visibility:

  ```css
  .gallery-image-wrapper {
    flex-shrink: 0;
    overflow: hidden;
    border-radius: var(--gallery-image-radius, 0px);
    cursor: pointer;
    position: relative;
    will-change: transform;
    backface-visibility: hidden;
  }
  ```

- [ ] **Step 5: Add `.is-floating` wrapper class and image hardware hints**

  Add these rules right after the updated `.gallery-image-wrapper` rule:

  ```css
  .gallery-image-wrapper.is-floating {
    z-index: 10;
  }

  .gallery-image {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
    border-radius: inherit;
    will-change: transform;
    backface-visibility: hidden;
  }
  ```

  Note: this replaces the existing `.gallery-image` rule (lines 175-181) — make sure to merge rather than duplicate.

- [ ] **Step 6: Visual verification**

  Open `http://localhost:3000/galeria` in the browser. Verify:
  - Gallery still renders correctly (no layout breakage)
  - Infinite scroll loop still works
  - Cursor is now `pointer` on image hover
  - No horizontal/vertical clipping issues visible

- [ ] **Step 7: Commit**

  ```bash
  git add src/pages/galeria.astro
  git commit -m "feat(gallery): CSS layout updates for float stacking context"
  ```

---

## Task 3: State Machine, Pause/Resume, and Force Reset

**Files:**
- Modify: `src/pages/galeria.astro` — `<script>` block (lines 198-509)

- [ ] **Step 1: Add float state variables**

  After the existing state variables (line 208), add the float state:

  ```typescript
  let activeFloatWrapper: HTMLElement | null = null;
  let activeFloatTimeline: gsap.core.Timeline | null = null;
  let pendingWrapper: HTMLElement | null = null;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  ```

- [ ] **Step 2: Implement `pauseGallery()` and `resumeGallery()`**

  Add these functions after `getColumnCount()` (after line 218):

  ```typescript
  /**
   * Smoothly decelerate all loop tweens to pause.
   */
  function pauseGallery(): void {
    activeTweens.forEach((tween) => {
      gsap.to(tween, {
        timeScale: 0,
        duration: HOVER_TRANSITION_DURATION,
        ease: 'power2.out',
      });
    });
  }

  /**
   * Smoothly accelerate all loop tweens back to normal speed.
   */
  function resumeGallery(): void {
    activeTweens.forEach((tween) => {
      gsap.to(tween, {
        timeScale: 1,
        duration: HOVER_TRANSITION_DURATION,
        ease: 'power2.in',
      });
    });
  }
  ```

- [ ] **Step 3: Implement `forceResetActiveFloat()`**

  Add this function right after `resumeGallery()`:

  ```typescript
  /**
   * Immediately kill any running float animation and restore all
   * GSAP-applied transforms, z-indices, and classes to their default state.
   */
  function forceResetActiveFloat(): void {
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

      // Clear wrapper & image inline styles
      gsap.set(activeFloatWrapper, { clearProps: 'scale,zIndex,y' });
      activeFloatWrapper.classList.remove('is-floating');
      if (img) gsap.set(img, { clearProps: 'scale' });

      // Reset column elevation and all sibling shifts
      if (col) {
        col.classList.remove('is-elevated');
        col.style.zIndex = '';
        const colWrappers = col.querySelectorAll('.gallery-image-wrapper');
        gsap.set(colWrappers, { clearProps: 'y' });
      }

      activeFloatWrapper = null;
    }

    resumeGallery();
  }
  ```

- [ ] **Step 4: Integrate `forceResetActiveFloat()` into `cleanupGallery()`**

  In `cleanupGallery()` (line 393), add `forceResetActiveFloat();` as the first line of the function body, before killing `activeTweens`:

  ```typescript
  function cleanupGallery(): void {
    // Reset any active float effect first
    forceResetActiveFloat();

    // Kill all loop tweens
    activeTweens.forEach((t) => t.kill());
    activeTweens = [];

    // Clear debounce timers
    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }
    if (imageLoadTimer) {
      clearTimeout(imageLoadTimer);
      imageLoadTimer = null;
    }

    // Abort all event listeners (resize + hover + float)
    if (cleanupController) {
      cleanupController.abort();
      cleanupController = null;
    }
  }
  ```

- [ ] **Step 5: Integrate `forceResetActiveFloat()` into the resize handler**

  In the resize handler (line 474-491), add `forceResetActiveFloat();` as the first line inside the `setTimeout` callback, before killing `activeTweens`:

  ```typescript
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      // Reset any active float before rebuilding layout
      forceResetActiveFloat();

      const newCount = getColumnCount();
      // Kill old tweens
      activeTweens.forEach((t) => t.kill());
      activeTweens = [];
      // Reset column transforms & height styles
      allColumns.forEach((col) => {
        col.style.height = '';
        const inner = col.querySelector('.gallery-column-inner') as HTMLElement;
        if (inner) gsap.set(inner, { clearProps: 'all' });
      });
      redistributeColumns(allColumns, newCount, allImageWrappers);
      updateColumnHeights(allColumns);
      createLoopTweens(allColumns);
    }, 200);
  }, { signal });
  ```

- [ ] **Step 6: Verify dev server still compiles and gallery works**

  Open `http://localhost:3000/galeria`. Verify no console errors and the loop animation still runs.

- [ ] **Step 7: Commit**

  ```bash
  git add src/pages/galeria.astro
  git commit -m "feat(gallery): float state machine, pause/resume, force reset"
  ```

---

## Task 4: `triggerFloat()` — Core Animation Logic

**Files:**
- Modify: `src/pages/galeria.astro` — `<script>` block

- [ ] **Step 1: Implement `triggerFloat()`**

  Add this function after `forceResetActiveFloat()`:

  ```typescript
  /**
   * Activate the floating effect on the given image wrapper.
   *
   * Builds a reversible GSAP timeline that:
   * 1. Pauses the gallery loop
   * 2. Elevates the parent column's stacking context
   * 3. Scales the wrapper + shifts it vertically to stay in view
   * 4. Zooms the inner image
   * 5. Shifts adjacent wrappers in the same column to maintain spacing
   *
   * The timeline's onReverseComplete cleans up all state.
   */
  function triggerFloat(wrapper: HTMLElement): void {
    // If there's already an active float on a different element, force-reset it
    if (activeFloatWrapper && activeFloatWrapper !== wrapper) {
      forceResetActiveFloat();
    }

    const col = wrapper.closest('.gallery-column') as HTMLElement;
    const img = wrapper.querySelector('.gallery-image') as HTMLElement;
    if (!col || !img) return;

    // ── Pause the gallery loop ──
    pauseGallery();

    // ── Viewport boundary shift calculation ──
    const colRect = col.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const scaledHeight = wrapperRect.height * FLOAT_SCALE_AMOUNT;
    const yCenter = (wrapperRect.top + wrapperRect.bottom) / 2;
    const projectedTop = yCenter - scaledHeight / 2;
    const projectedBottom = yCenter + scaledHeight / 2;

    let offset = 0;
    if (projectedTop < colRect.top) {
      // Cut off at the top — shift down
      offset = colRect.top - projectedTop;
    } else if (projectedBottom > colRect.bottom) {
      // Cut off at the bottom — shift up
      offset = colRect.bottom - projectedBottom;
    }

    // ── Spacing preservation ──
    const shiftAmount = (wrapperRect.height * (FLOAT_SCALE_AMOUNT - 1)) / 2;

    // Identify siblings in the same gallery-set (original or duplicate)
    const parentSet = wrapper.closest('.gallery-set-original, .gallery-set-duplicate') as HTMLElement;
    if (!parentSet) return;
    const allWrappersInSet = Array.from(parentSet.querySelectorAll('.gallery-image-wrapper')) as HTMLElement[];
    const wrapperIndex = allWrappersInSet.indexOf(wrapper);

    const above = allWrappersInSet.filter((_, i) => i < wrapperIndex);
    const below = allWrappersInSet.filter((_, i) => i > wrapperIndex);

    // ── Build the reversible timeline ──
    activeFloatWrapper = wrapper;

    // Elevate column stacking context
    col.classList.add('is-elevated');
    wrapper.classList.add('is-floating');

    const tl = gsap.timeline({
      defaults: {
        duration: FLOAT_ANIMATION_DURATION,
        ease: FLOAT_EASE,
      },
      onReverseComplete: () => {
        // Cleanup after full reverse
        col.classList.remove('is-elevated');
        wrapper.classList.remove('is-floating');

        gsap.set(wrapper, { clearProps: 'scale,zIndex,y' });
        gsap.set(img, { clearProps: 'scale' });
        gsap.set(allWrappersInSet, { clearProps: 'y' });

        activeFloatWrapper = null;
        activeFloatTimeline = null;

        resumeGallery();
      },
    });

    // Wrapper: scale up + apply viewport offset
    tl.to(wrapper, { scale: FLOAT_SCALE_AMOUNT, y: offset }, 0);

    // Inner image: zoom
    tl.to(img, { scale: FLOAT_ZOOM_AMOUNT }, 0);

    // Adjacent wrappers: shift to maintain spacing
    if (above.length > 0) {
      tl.to(above, { y: -shiftAmount + offset }, 0);
    }
    if (below.length > 0) {
      tl.to(below, { y: shiftAmount + offset }, 0);
    }

    activeFloatTimeline = tl;
  }
  ```

- [ ] **Step 2: Verify dev server compiles**

  Check terminal for TypeScript errors. The function is defined but not yet called — that's expected.

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/galeria.astro
  git commit -m "feat(gallery): implement triggerFloat() with viewport boundary logic"
  ```

---

## Task 5: Event Delegation — `attachFloatListeners()`

**Files:**
- Modify: `src/pages/galeria.astro` — `<script>` block

- [ ] **Step 1: Replace `attachHoverListeners()` with `attachFloatListeners()`**

  Replace the existing `attachHoverListeners()` function (lines 365-388) with the new unified handler. This replaces both the old hover pause/resume behavior (now handled by `pauseGallery`/`resumeGallery` inside `triggerFloat`) and adds the float interaction:

  ```typescript
  /**
   * Attach delegated pointer/click listeners for the floating effect.
   *
   * Desktop: pointerover starts a delay timer → triggerFloat().
   *          pointerout cancels the timer or reverses the animation.
   * Mobile:  click toggles float immediately (no delay).
   *
   * Uses AbortController signal for automatic cleanup on navigation.
   */
  function attachFloatListeners(
    container: HTMLElement,
    signal: AbortSignal
  ): void {
    // ── Desktop: hover delay ──
    container.addEventListener('pointerover', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;

      const wrapper = (e.target as HTMLElement).closest('.gallery-image-wrapper') as HTMLElement | null;
      if (!wrapper || wrapper === pendingWrapper || wrapper === activeFloatWrapper) return;

      // Cancel any pending timer from a previous hover
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }

      // If hovering a different image while one is active, reverse it
      if (activeFloatWrapper && activeFloatWrapper !== wrapper) {
        activeFloatTimeline?.reverse();
      }

      pendingWrapper = wrapper;
      pendingTimer = setTimeout(() => {
        pendingTimer = null;
        pendingWrapper = null;
        triggerFloat(wrapper);
      }, FLOAT_HOVER_DELAY_MS);
    }, { signal });

    // ── Desktop: pointer leaves the container ──
    container.addEventListener('pointerleave', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;

      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      pendingWrapper = null;

      if (activeFloatWrapper) {
        activeFloatTimeline?.reverse();
      }
    }, { signal });

    // ── Desktop: pointer moves between wrappers within the container ──
    container.addEventListener('pointerout', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;

      const relatedWrapper = (e.relatedTarget as HTMLElement | null)?.closest('.gallery-image-wrapper') as HTMLElement | null;

      // Only cancel if pointer left the current pending/active wrapper
      // and didn't move to another wrapper (pointerover handles that case)
      if (!relatedWrapper) {
        if (pendingTimer && pendingWrapper) {
          const leavingWrapper = (e.target as HTMLElement).closest('.gallery-image-wrapper') as HTMLElement | null;
          if (leavingWrapper === pendingWrapper) {
            clearTimeout(pendingTimer);
            pendingTimer = null;
            pendingWrapper = null;
          }
        }
      }
    }, { signal });

    // ── Mobile: tap to toggle ──
    container.addEventListener('click', (e: MouseEvent) => {
      // Only handle touch-originated clicks
      // PointerEvent extends MouseEvent; check pointerType if available
      const pe = e as PointerEvent;
      if (pe.pointerType !== 'touch') return;

      const wrapper = (e.target as HTMLElement).closest('.gallery-image-wrapper') as HTMLElement | null;
      if (!wrapper) return;

      e.preventDefault();

      if (activeFloatWrapper === wrapper) {
        // Tap the active image → reverse (close)
        activeFloatTimeline?.reverse();
      } else {
        // Tap a new image → force-reset old, open new immediately
        forceResetActiveFloat();
        triggerFloat(wrapper);
      }
    }, { signal });
  }
  ```

- [ ] **Step 2: Update `initGallery()` to call `attachFloatListeners` instead of `attachHoverListeners`**

  In `initGallery()`, find the line calling `attachHoverListeners(container, signal)` (line 453) and replace it:

  ```typescript
  attachFloatListeners(container, signal);
  ```

- [ ] **Step 3: Verify the full interaction in the browser**

  Open `http://localhost:3000/galeria`:
  - Hover over an image for 1+ seconds → it should float (scale up, z-index elevate, adjacent images shift)
  - Move mouse away → animation reverses smoothly
  - Gallery scroll pauses during float, resumes after reverse complete
  - No console errors

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/galeria.astro
  git commit -m "feat(gallery): event-delegated float listeners with hover delay and mobile tap"
  ```

---

## Task 6: E2E Tests — Float Effect

**Files:**
- Create: `tests/e2e/gallery/float-effect.spec.ts`

- [ ] **Step 1: Write E2E test file**

  Create `tests/e2e/gallery/float-effect.spec.ts`:

  ```typescript
  import { test, expect } from '../fixtures/base-fixture';
  import { testConfig } from '../test-config';
  import { waitForHydration } from '../helpers/hydration';

  test.describe('Gallery Float Effect', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(testConfig.routes.galeria);
      await waitForHydration(page);
    });

    test('image wrapper has pointer cursor', async ({ page }) => {
      const wrapper = page.locator('.gallery-image-wrapper').first();
      await expect(wrapper).toHaveCSS('cursor', 'pointer');
    });

    test('hovering for less than delay does NOT trigger float', async ({ page }) => {
      const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
      await wrapper.hover();
      // Wait less than the delay (accounting for GSAP timeScale speed-up)
      await page.waitForTimeout(50);
      await expect(wrapper).not.toHaveClass(/is-floating/);
    });

    test('hovering for full delay triggers float', async ({ page }) => {
      const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
      await wrapper.hover();

      // With testConfig.animationTimeScale = 100, the 1000ms delay still uses
      // real setTimeout (not GSAP-controlled), so we need to wait for the full delay.
      // But GSAP animations complete nearly instantly.
      await page.waitForTimeout(1100);

      await expect(wrapper).toHaveClass(/is-floating/);

      // The parent column should be elevated
      const col = wrapper.locator('xpath=ancestor::div[contains(@class,"gallery-column")]');
      await expect(col).toHaveClass(/is-elevated/);
    });

    test('moving mouse away reverses the float animation', async ({ page }) => {
      const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
      await wrapper.hover();
      await page.waitForTimeout(1100);

      // Float should be active
      await expect(wrapper).toHaveClass(/is-floating/);

      // Move mouse to a neutral area (outside gallery container)
      await page.mouse.move(0, 0);

      // Wait for the reverse animation to complete (near-instant due to timeScale)
      await page.waitForTimeout(200);

      // Float classes should be removed after reverse
      await expect(wrapper).not.toHaveClass(/is-floating/);
      const col = wrapper.locator('xpath=ancestor::div[contains(@class,"gallery-column")]');
      await expect(col).not.toHaveClass(/is-elevated/);
    });

    test('only one image can float at a time', async ({ page }) => {
      const wrappers = page.locator('.gallery-set-original .gallery-image-wrapper');
      const first = wrappers.nth(0);
      const second = wrappers.nth(1);

      // Float the first image
      await first.hover();
      await page.waitForTimeout(1100);
      await expect(first).toHaveClass(/is-floating/);

      // Move to second image - the first should start reversing
      await second.hover();
      await page.waitForTimeout(1100);

      // Only the second should be floating
      await expect(second).toHaveClass(/is-floating/);
      await expect(first).not.toHaveClass(/is-floating/);
    });

    test('cleanup on navigation removes float state', async ({ page }) => {
      const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
      await wrapper.hover();
      await page.waitForTimeout(1100);
      await expect(wrapper).toHaveClass(/is-floating/);

      // Navigate away
      await page.goto(testConfig.routes.landing);
      await waitForHydration(page);

      // Navigate back
      await page.goto(testConfig.routes.galeria);
      await waitForHydration(page);

      // No images should be floating
      const floatingCount = await page.locator('.is-floating').count();
      expect(floatingCount).toBe(0);

      const elevatedCount = await page.locator('.is-elevated').count();
      expect(elevatedCount).toBe(0);
    });
  });
  ```

- [ ] **Step 2: Verify tests exist and pass the TypeScript check**

  Run: `npx tsc --noEmit --project tests/e2e/tsconfig.json` (or verify manually that there are no red squiggles).

  If there's no separate `tsconfig.json` for tests, just verify the file has no import errors visually.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/e2e/gallery/float-effect.spec.ts
  git commit -m "test(gallery): E2E tests for float effect"
  ```

---

## Task 7: Remove Dead Code & Final Polish

**Files:**
- Modify: `src/pages/galeria.astro` — `<script>` block

- [ ] **Step 1: Remove the old `attachHoverListeners` function definition**

  The function body of the old `attachHoverListeners()` should be fully deleted now that `attachFloatListeners()` has replaced it. Verify that no code references `attachHoverListeners` anywhere — if there are zero references, delete the function entirely.

- [ ] **Step 2: Expose float state for E2E tests (optional, conditional)**

  In `initGallery()`, after `attachFloatListeners(container, signal)`, add a conditional E2E exposure block:

  ```typescript
  // Expose float state for E2E tests
  if ((window as any).__E2E_TEST__) {
    (window as any).__galleryFloatState = {
      getActiveWrapper: () => activeFloatWrapper,
      getActiveTimeline: () => activeFloatTimeline,
      getPendingWrapper: () => pendingWrapper,
    };
  }
  ```

- [ ] **Step 3: Verify no dead code remains**

  Search the file for `attachHoverListeners` — should return zero results. Search for any `TODO` or `FIXME` comments you may have left.

- [ ] **Step 4: Final full-page manual verification**

  Open `http://localhost:3000/galeria` and verify the complete checklist:
  - [ ] Cursor changes to pointer immediately on image hover
  - [ ] Hovering < 1s then leaving does not trigger float
  - [ ] Hovering ≥ 1s triggers float (image scales up, adjacent images shift)
  - [ ] Floated image overlaps neighboring columns (z-index elevation works)
  - [ ] Images near top/bottom edges shift into view (viewport boundary logic)
  - [ ] Moving mouse away reverses the animation smoothly
  - [ ] Gallery scroll pauses during float, resumes after reverse complete
  - [ ] Resizing the window during a float resets everything cleanly
  - [ ] Navigating away (View Transition) and back produces no leaked state
  - [ ] Only one image floats at a time

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/galeria.astro
  git commit -m "refactor(gallery): remove dead hover code, add E2E state exposure"
  ```
