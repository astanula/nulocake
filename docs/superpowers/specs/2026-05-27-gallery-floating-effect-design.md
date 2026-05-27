# Gallery Image Floating Effect - Design Spec

**Date:** 2026-05-27
**Status:** Approved
**Related:** `src/pages/galeria.astro`, `src/config/gallery.ts`

---

## 1. Overview & Requirements

Add a "floating" hover effect to gallery images that makes images visually "pop out" when the user hovers over them for 1 second.

### Requirements

1. **Hover Delay:** Effect triggers only after mouse hovers over image for configurable delay (default: 1000ms)
2. **Frame Scale:** Image wrapper scales up by 10% (configurable via `FLOAT_SCALE_AMOUNT`)
3. **Inner Zoom:** Inner image scales up slightly (configurable via `FLOAT_ZOOM_AMOUNT`)
4. **Smooth Animation:** All transforms animated with GSAP (hardware-accelerated)
5. **Vertical Shift:** Adjacent images in same column shift up/down to maintain spacing
6. **Z-Index Overlap:** Floated image appears over neighboring columns (not beside)
7. **Gallery Pause:** Gallery animation pauses when floating effect triggers (not on general hover)
8. **Mobile Support:** Tap to toggle floating state on touch devices
9. **Cursor Change:** Cursor changes to pointer immediately on hover
10. **Single Float:** Only one image can be in floating state at a time
11. **Memory Safe:** No event listener accumulation or memory leaks

---

## 2. Architecture

### Integration Points

- **File:** `src/pages/galeria.astro` (existing gallery page)
- **Config:** `src/config/gallery.ts` (add new config exports)
- **Animation:** Extend existing GSAP-based infinite scroll system

### Component Structure

```
galeria.astro
├── <script> block (client-side logic)
│   ├── Event delegation (hover, touch)
│   ├── Delay timer management
│   ├── Floating animation timelines
│   ├── Adjacent image shift logic
│   └── Cleanup on navigation
├── <style> block (z-index, cursor)
└── Config imports from gallery.ts
```

### Data Flow

```
Mouse enters image
  ↓
Change cursor to pointer (CSS)
  ↓
Start delay timer (FLOAT_HOVER_DELAY_MS)
  ↓
Timer completes
  ↓
Pause gallery animation
  ↓
Animate floating (scale + zoom + shift)
  ↓
Update z-index to 10
  ↓
Mouse leaves / tap toggle
  ↓
Reverse animation
  ↓
Restore z-index
  ↓
Resume gallery after animation completes
```

---

## 3. Animation System

### 3.1 Hover Detection

**Event Delegation:** Attach `pointerover` and `pointerout` events to `.gallery-container` (not per-image).

**Logic:**
- `pointerover` on `.gallery-image-wrapper` → start delay timer
- `pointerout` from `.gallery-image-wrapper` → clear timer, reverse animation if active
- Use `event.relatedTarget` to detect if pointer left the image

**Delay Timer:**
- Store in `Map<HTMLElement, ReturnType<typeof setTimeout>>`
- Clear previous timer for same image on re-hover
- Clear timer on `pointerout`

### 3.2 Floating Animation (GSAP Timeline)

**Target:** `.gallery-image-wrapper` (the frame)

**Animation Steps:**

1. **Scale frame** by `FLOAT_SCALE_AMOUNT` (default 1.1)
   - Property: `scale`
   - Transform origin: `center center`
   - Duration: `FLOAT_ANIMATION_DURATION`
   - Ease: `power2.out`

2. **Scale inner image** by `FLOAT_ZOOM_AMOUNT` (default 1.15)
   - Target: `.gallery-image` within wrapper
   - Property: `scale`
   - Transform origin: `center center`
   - Same duration/easing

3. **Shift adjacent images** in same column
   - Calculate scaled frame's additional height: `originalHeight * (FLOAT_SCALE_AMOUNT - 1)`
   - Shift amount per adjacent image: `additionalHeight / 2`
   - Images above: animate `y` to `-shiftAmount`
   - Images below: animate `y` to `shiftAmount`
   - Same duration/easing

4. **Update z-index** to 10
   - Set immediately (no animation on z-index)

**Timeline Structure:**
```javascript
const tl = gsap.timeline({
  onComplete: () => {
    // Mark as floating complete
  }
});

tl.to(wrapper, { scale: FLOAT_SCALE_AMOUNT, duration, ease })
  .to(innerImage, { scale: FLOAT_ZOOM_AMOUNT, duration, ease }, 0)
  .to(adjacentAbove, { y: -shiftAmount, duration, ease }, 0)
  .to(adjacentBelow, { y: shiftAmount, duration, ease }, 0);
```

### 3.3 Reverse Animation

**Trigger:** `pointerout` or tap toggle

**Animation:**
- Reverse all transforms (scale back to 1, shift back to 0)
- On complete: restore `z-index` to `auto`
- On complete: resume gallery animation

**Timeline:**
```javascript
const reverseTl = gsap.timeline({
  onComplete: () => {
    wrapper.style.zIndex = '';
    resumeGallery();
  }
});

reverseTl.to(wrapper, { scale: 1, duration, ease })
  .to(innerImage, { scale: 1, duration, ease }, 0)
  .to(adjacentAbove, { y: 0, duration, ease }, 0)
  .to(adjacentBelow, { y: 0, duration, ease }, 0);
```

### 3.4 Mobile Tap-to-Toggle

**Event:** `touchstart` on `.gallery-image-wrapper`

**Logic:**
- If not floating → trigger floating animation
- If floating → trigger reverse animation

**Debounce:** Use same delay timer logic (prevent rapid toggles)

---

## 4. Configuration

### 4.1 New Config Exports in `src/config/gallery.ts`

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

### 4.2 CSS Changes in `galeria.astro`

```css
/* Cursor pointer on hover */
.gallery-image-wrapper {
  cursor: pointer;
  position: relative; /* For z-index to work */
}

/* Floated state */
.gallery-image-wrapper.is-floating {
  z-index: 10;
}

/* Ensure smooth transforms */
.gallery-image-wrapper,
.gallery-image {
  will-change: transform;
  backface-visibility: hidden;
}
```

---

## 5. Memory Leak Prevention

### 5.1 Event Listener Management

**Problem:** Event listeners can accumulate across page navigations.

**Solution:** Extend existing `AbortController` pattern.

**Implementation:**
- All new event listeners use `{ signal }` from existing `cleanupController`
- No global flags needed (unlike `__galleryListenerAdded`)
- When `cleanupGallery()` calls `cleanupController.abort()`, all listeners auto-removed

**Event Delegation:**
- Attach `pointerover`, `pointerout`, `touchstart` to `.gallery-container`
- Use `event.target.closest('.gallery-image-wrapper')` to identify hovered image
- Single listener handles all images (no per-image listeners)

### 5.2 Timer Management

**Storage:** `Map<HTMLElement, ReturnType<typeof setTimeout>>`

**Cleanup:**
- Clear timer on `pointerout`
- Clear timer on cleanup
- Clear all timers in `cleanupGallery()`

**Logic:**
```javascript
const hoverTimers = new Map();

function startHoverTimer(wrapper) {
  clearHoverTimer(wrapper);
  const timer = setTimeout(() => {
    triggerFloating(wrapper);
  }, FLOAT_HOVER_DELAY_MS);
  hoverTimers.set(wrapper, timer);
}

function clearHoverTimer(wrapper) {
  const timer = hoverTimers.get(wrapper);
  if (timer) {
    clearTimeout(timer);
    hoverTimers.delete(wrapper);
  }
}
```

### 5.3 GSAP Animation Cleanup

**Storage:** `Map<HTMLElement, gsap.core.Timeline>`

**Cleanup:**
- Kill timeline on cleanup or when new image floats
- Clear all timelines in `cleanupGallery()`

**Logic:**
```javascript
const floatingTimelines = new Map();

function triggerFloating(wrapper) {
  // Kill previous floating timeline
  floatingTimelines.forEach((tl) => tl.kill());
  floatingTimelines.clear();
  
  // Create new timeline
  const tl = gsap.timeline(/* ... */);
  floatingTimelines.set(wrapper, tl);
}
```

### 5.4 Cleanup Function

**Extend existing `cleanupGallery()`:**

```javascript
function cleanupGallery(): void {
  // Kill all loop tweens (existing)
  activeTweens.forEach((t) => t.kill());
  activeTweens = [];

  // Clear hover timers (NEW)
  hoverTimers.forEach((timer) => clearTimeout(timer));
  hoverTimers.clear();

  // Kill floating timelines (NEW)
  floatingTimelines.forEach((tl) => tl.kill());
  floatingTimelines.clear();

  // Clear debounce timers (existing)
  if (resizeTimer) {
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  if (imageLoadTimer) {
    clearTimeout(imageLoadTimer);
    imageLoadTimer = null;
  }

  // Abort all event listeners (existing)
  if (cleanupController) {
    cleanupController.abort();
    cleanupController = null;
  }
}
```

---

## 6. Error Handling & Edge Cases

### 6.1 Rapid Hover On/Off

**Problem:** User hovers image A, quickly hovers image B before A's timer completes.

**Solution:**
- Track currently hovered wrapper
- If new `pointerover` on different wrapper → clear previous timer
- Only track one "pending" wrapper at a time
- On `pointerout`, only clear timer if leaving the currently pending wrapper

### 6.2 Image Loads During Animation

**Problem:** Image finishes loading while floating animation is in progress.

**Solution:**
- Don't recalculate heights during animation
- Queue recalculation for after animation completes
- Check if floating animation is active before recalculating

### 6.3 Resize During Animation

**Problem:** Window resize triggers column redistribution while floating.

**Solution:**
- Detect if floating animation is active
- If yes, immediately reverse animation and cleanup before redistribution
- Wrap redistribution in `if (!isFloatingActive)` check

### 6.4 Touch Devices

**Problem:** `mouseenter`/`mouseleave` may fire on touch devices.

**Solution:**
- Use `pointerover`/`pointerout` (handles both mouse and touch)
- Check `event.pointerType` if needed (mouse vs pen vs touch)

### 6.5 Multiple Rapid Taps on Mobile

**Problem:** User taps rapidly, causing animation jitter.

**Solution:**
- Debounce tap handler (use same delay timer logic)
- Ignore taps if animation is in progress

### 6.6 Error Boundaries

**Implementation:**
- Wrap animation triggers in try-catch
- If GSAP tween creation fails, log error and continue (gallery remains functional)
- If timer cleanup fails, still proceed with cleanup

---

## 7. Implementation Plan

### Phase 1: Configuration
- [ ] Add new config exports to `src/config/gallery.ts`
- [ ] Import config in `galeria.astro` script block

### Phase 2: CSS
- [ ] Add `.gallery-image-wrapper` cursor style
- [ ] Add `.is-floating` z-index class
- [ ] Add `will-change` and `backface-visibility` for performance

### Phase 3: Event Delegation
- [ ] Replace `mouseenter`/`mouseleave` gallery pause with `pointerover`/`pointerout` on container
- [ ] Add hover timer logic (start on `pointerover`, clear on `pointerout`)
- [ ] Add mobile `touchstart` listener for tap-to-toggle

### Phase 4: Floating Animation
- [ ] Implement `triggerFloating(wrapper)` function
- [ ] Create GSAP timeline (frame scale + inner zoom + adjacent shift)
- [ ] Implement reverse animation
- [ ] Add z-index management

### Phase 5: Gallery Pause Integration
- [ ] Modify `attachHoverListeners()` to only pause on floating trigger (not general hover)
- [ ] Ensure gallery resumes after reverse animation completes

### Phase 6: Memory Leak Prevention
- [ ] Add `hoverTimers` Map and cleanup
- [ ] Add `floatingTimelines` Map and cleanup
- [ ] Extend `cleanupGallery()` function
- [ ] Verify no listener accumulation (test with multiple navigations)

### Phase 7: Testing
- [ ] Test hover delay (wait 1 second, effect triggers)
- [ ] Test rapid hover on/off (no animation triggered)
- [ ] Test adjacent image shift (vertical movement only)
- [ ] Test z-index overlap (floated image over neighbors)
- [ ] Test mobile tap-to-toggle
- [ ] Test gallery pause/resume
- [ ] Test resize during animation (no crash)
- [ ] Test memory leaks (multiple navigations)

---

## 8. Success Criteria

1. Hovering over image for 1 second triggers floating effect
2. Image frame scales up by 10% (configurable)
3. Inner image zooms in slightly (configurable)
4. Adjacent images shift vertically to maintain spacing
5. Floated image appears over neighboring columns (z-index)
6. Gallery animation pauses only when floating triggers (not on general hover)
7. Mobile: tap to toggle floating state
8. Cursor changes to pointer immediately on hover
9. Only one image floats at a time
10. No memory leaks (listeners, timers, GSAP tweens cleaned up)
11. Smooth 60fps animations (hardware-accelerated transforms)
12. Respects `prefers-reduced-motion` (existing behavior)

---

## 9. Open Questions

None. All requirements clarified and approved.

---

**Design approved by:** User
**Next step:** Create implementation plan using `writing-plans` skill
