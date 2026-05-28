# Gallery Image Floating Effect - Design Spec (Updated)

**Date:** 2026-05-28
**Status:** Approved with Technical Revisions
**Related:** `src/pages/galeria.astro`, `src/config/gallery.ts`

---

## 1. Overview & Requirements

Add a "floating" hover effect to gallery images that makes images visually "pop out" when the user hovers over them for a specified delay. This specification updates the initial design with critical technical fixes for CSS stacking contexts, mobile scrolling compatibility, loop boundaries, and viewport clipping edge cases.

### Requirements

1. **Hover Delay:** Effect triggers only after mouse hovers over image for configurable delay (default: 1000ms)
2. **Frame Scale:** Image wrapper scales up by 10% (configurable via `FLOAT_SCALE_AMOUNT`)
3. **Inner Zoom:** Inner image scales up slightly (configurable via `FLOAT_ZOOM_AMOUNT`)
4. **Smooth Animation:** All transforms animated with GSAP (hardware-accelerated)
5. **Vertical Shift:** Adjacent images in the same column shift up/down to maintain spacing
6. **Z-Index Overlap:** Floated image appears over neighboring columns and adjacent images
7. **Viewport Boundary Shift:** If the floated image is partially cut off at the top or bottom of the gallery viewport, the entire column shifts vertically to slide the image fully into view.
8. **Gallery Pause:** Gallery animation pauses when floating effect triggers (not on general hover)
9. **Mobile Support:** Tap to toggle floating state immediately on touch devices (no delay, no hover interference)
10. **Cursor Change:** Cursor changes to pointer immediately on hover
11. **Single Float:** Only one image can be in floating state at a time
12. **Memory Safe:** No event listener accumulation, timer leaks, or GSAP tween pollution

---

## 2. Architecture & Stacking Context Fixes

### 2.1 Stacking Context Elevation (Neighbor Overlap)
* **The Challenge:** In CSS, `.gallery-column-inner` has a GSAP transform applied to scroll the column. Any transform creates a new Stacking Context, which confines the z-index of its children. Because of this, elements inside Column 0 would always render underneath Column 1 (since Column 1 is later in DOM order), regardless of how high Column 0's child z-index is set.
* **The Solution:** 
  1. We elevate the stacking context of the *entire column* containing the active image. When an image floats, we add a class `.is-elevated` (or apply `z-index: 5`) to its parent `.gallery-column`.
  2. We apply `z-index: 10` to the floated `.gallery-image-wrapper` so it overlays neighbors in the same column.

### 2.2 Clipping and Overflow Management
* **The Challenge:** Currently, `.gallery-column` has `overflow: hidden` which clips any horizontal expansion (the 10% scaling) at the column boundary.
* **The Solution:**
  1. Remove `overflow: hidden` from `.gallery-column` (set to `overflow: visible` or default).
  2. Add `overflow: hidden` (or `clip`) to `.gallery-container` to clip vertical overflow (preventing infinite loop elements from spilling out of the gallery section) while allowing horizontal overflow between columns.

### 2.3 Data Flow

```
Mouse enters image (Desktop)            Touch tap on image (Mobile)
  ↓                                               ↓
Change cursor to pointer (CSS)           [Ignore hover delay timer]
  ↓                                               ↓
Start delay timer (1000ms)               Force reset any active float
  ↓                                               ↓
Timer completes / Trigger Float         Trigger Float immediately
  ↓                                               ↓
Pause gallery scrolling (smoothly decelerate timeScale to 0)
  ↓
Calculate top/bottom viewport offset adjustments
  ↓
Elevate parent column z-index to 5
  ↓
Animate wrapper (scale + offset + z-index: 10)
Animate inner image (zoom scale)
Animate adjacent wrappers in column (y shift + offset)
  ↓
Mouse leaves / Tap again
  ↓
Reverse animation (smoothly play backward)
  ↓
On reverse complete: Restore z-indices, clear inline styles, resume scrolling
```

---

## 3. Detailed Logic & Calculations

### 3.1 Viewport Boundary Shift Calculation

When an image floats, we calculate the adjustment `offset` needed to bring the expanded (scaled) image entirely within the visible column boundaries.

Let:
* `colRect` be the bounding box of the `.gallery-column`.
* `wrapperRect` be the bounding box of the unscaled `.gallery-image-wrapper`.
* `scaledHeight = wrapperRect.height * FLOAT_SCALE_AMOUNT`
* `yCenter = (wrapperRect.top + wrapperRect.bottom) / 2`
* `projectedTop = yCenter - scaledHeight / 2`
* `projectedBottom = yCenter + scaledHeight / 2`

The vertical adjustment offset is calculated as:
```javascript
let offset = 0;
if (projectedTop < colRect.top) {
  // Cut off at the top - shift down
  offset = colRect.top - projectedTop;
} else if (projectedBottom > colRect.bottom) {
  // Cut off at the bottom - shift up
  offset = colRect.bottom - projectedBottom;
}
```

### 3.2 Spacing Preservation Formula

To maintain uniform spacing while sliding the column and expanding the hovered image:
* `shiftAmount = (wrapperRect.height * (FLOAT_SCALE_AMOUNT - 1)) / 2`
* For the hovered image wrapper, animate to `y: offset`
* For all wrappers in the column *above* the hovered image, animate to `y: -shiftAmount + offset`
* For all wrappers in the column *below* the hovered image, animate to `y: shiftAmount + offset`

Because `offset` is applied uniformly to all elements, the entire column shifts vertically by `offset`, while the gap around the hovered image opens by exactly `shiftAmount` on both sides.

### 3.3 Infinite Scroll Loop Boundaries

* **No Synchronization Required:** The column height is constrained to `minHeight` (the shortest column's original set height). The duplicate set is offset by the full height of the original set. Because the visible viewport height `H` is `<= originalSetHeight`, it is mathematically impossible to see the original image and its duplicate clone on screen at the same time.
* **Result:** We only need to animate the specific DOM element the user interacted with.

---

## 4. Configuration & CSS

### 4.1 Configuration Exports in `src/config/gallery.ts`

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

### 4.2 CSS Layout Updates in `galeria.astro`

```css
/* Container handles vertical clipping */
.gallery-container {
  overflow: clip; /* Or hidden */
}

/* Columns allow horizontal overlap */
.gallery-column {
  overflow: visible;
  position: relative;
  transition: z-index 0.2s ease;
}

/* Column elevated state */
.gallery-column.is-elevated {
  z-index: 5;
}

/* Image wrapper cursor and base styling */
.gallery-image-wrapper {
  cursor: pointer;
  position: relative;
  will-change: transform;
  backface-visibility: hidden;
}

/* Floated image wrapper state */
.gallery-image-wrapper.is-floating {
  z-index: 10;
}

/* Ensure smooth image scaling */
.gallery-image {
  will-change: transform;
  backface-visibility: hidden;
}
```

---

## 5. State Machine & Memory Management

To ensure reliability across rapid interactions, resizes, and page navigations, the system uses a central state machine.

### 5.1 State Variables
```typescript
let activeFloatWrapper: HTMLElement | null = null;
let activeFloatTimeline: gsap.core.Timeline | null = null;
let pendingWrapper: HTMLElement | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
```

### 5.2 Force Reset Active Float
This utility kills any running timelines and immediately clears all GSAP-applied transforms, restoring the column to its normal loop state:

```typescript
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
    
    // Clear wrapper & image styles
    gsap.set(activeFloatWrapper, { clearProps: 'scale, zIndex, y' });
    activeFloatWrapper.classList.remove('is-floating');
    if (img) gsap.set(img, { clearProps: 'scale' });
    
    // Reset column z-index and adjacent shifts
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

### 5.3 Unified Hover / Click Handlers
Using event delegation on `.gallery-container` to capture pointer events:

```typescript
function attachFloatListeners(container: HTMLElement, signal: AbortSignal): void {
  // 1. Mouse hover events (Desktop)
  container.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return; // Mobile uses clicks

    const wrapper = (e.target as HTMLElement).closest('.gallery-image-wrapper') as HTMLElement;
    if (!wrapper || wrapper === pendingWrapper || wrapper === activeFloatWrapper) return;

    // Reset previous pending timer
    if (pendingTimer) clearTimeout(pendingTimer);
    
    // Reverse active float if we hover to a different column/image
    if (activeFloatWrapper && activeFloatWrapper !== wrapper) {
      activeFloatTimeline?.reverse();
    }

    pendingWrapper = wrapper;
    pendingTimer = setTimeout(() => {
      triggerFloat(wrapper);
    }, FLOAT_HOVER_DELAY_MS);
  }, { signal });

  // 2. Mouse leave events (Desktop)
  container.addEventListener('pointerleave', () => {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
    pendingWrapper = null;

    if (activeFloatWrapper) {
      activeFloatTimeline?.reverse();
    }
  }, { signal });

  // 3. Click / Tap events (Mobile & Desktop fallback)
  container.addEventListener('click', (e) => {
    const wrapper = (e.target as HTMLElement).closest('.gallery-image-wrapper') as HTMLElement;
    if (!wrapper) return;

    if (e.pointerType === 'touch') {
      e.preventDefault();
      
      if (activeFloatWrapper === wrapper) {
        // Tap active image to close
        activeFloatTimeline?.reverse();
      } else {
        // Tap new image to open immediately
        forceResetActiveFloat();
        triggerFloat(wrapper);
      }
    }
  }, { signal });
}
```

---

## 6. Verification & Robustness

### 6.1 Lifecycle Cleanup
The existing `cleanupGallery()` function will call `forceResetActiveFloat()`. Since `cleanupController.abort()` is called during Astro navigations, all pointer, click, and resize event listeners will be automatically cleaned up.

### 6.2 Resize Interruptions
If a window resize occurs while an image is floating, the resize handler immediately calls `forceResetActiveFloat()` to reset layouts before column redistribution and loop timeline rebuilds are performed.

### 6.3 Reduced Motion
If a user has `prefers-reduced-motion: reduce` active, the initialization block returns early, ensuring that no listeners, timers, or animations are initialized.

---

## 7. Implementation Plan

### Phase 1: Configuration
- [ ] Add config variables in `src/config/gallery.ts`.
- [ ] Import new config in `src/pages/galeria.astro`.

### Phase 2: CSS Layout Updates
- [ ] Add `.gallery-column.is-elevated` styles.
- [ ] Update `.gallery-container` to `overflow: clip` / `overflow: hidden`.
- [ ] Update `.gallery-column` to `overflow: visible`.
- [ ] Add `.gallery-image-wrapper.is-floating` and hardware-acceleration properties.

### Phase 3: State Machine & Reset Logic
- [ ] Implement state variables and `forceResetActiveFloat()`.
- [ ] Implement `pauseGallery()` and `resumeGallery()` helper functions.

### Phase 4: Trigger Float & Viewport Offset Logic
- [ ] Implement `triggerFloat(wrapper)` with:
  * Viewport calculation (`colRect`, `wrapperRect`, `scaledHeight`, `yCenter`, `projectedTop`, `projectedBottom`).
  * Boundary logic to determine `offset`.
  * Multi-target GSAP timeline targeting wrapper, inner image, and adjacent images.
  * Timeline `onReverseComplete` hook linking back to state machine cleanup.

### Phase 5: Event Integration & Cleanup
- [ ] Replace existing hover listeners with delegated `pointerover`, `pointerleave`, and `click` listeners.
- [ ] Integrate `forceResetActiveFloat()` into the window resize handler.
- [ ] Integrate `forceResetActiveFloat()` into `cleanupGallery()`.

### Phase 6: Manual & E2E Verification
- [ ] Verify hover activation delay of 1 second on desktop.
- [ ] Verify immediate toggle activation via touch on mobile (using browser device emulation).
- [ ] Verify no overlap bugs on neighboring columns.
- [ ] Verify top/bottom boundary images slide perfectly into view.
- [ ] Verify page resize during float handles state cleanup correctly.
- [ ] Verify navigation away and back doesn't leak event listeners or timers.
