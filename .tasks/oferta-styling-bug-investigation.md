# Oferta Page Styling Bug - Investigation Summary

## Issue Observed

When navigating: **Homepage → Oferta → Homepage → Oferta**, the Oferta page styling is broken on the second visit.

### Visual Symptoms
- Sections are "stacked vertically" with no proper spacing
- `min-height: 100dvh` is **not applied** (computed as `0px`)
- `padding` is **not applied** (computed as `0px` top/bottom)
- Sections appear collapsed together without the intended viewport-height spacing between them
- First visit to Oferta works correctly; bug only manifests on subsequent visits after navigating through homepage

### Technical Evidence
- Computed styles on second visit (`content-section` elements):
  - `position: static` (should be `relative`)
  - `min-height: 0px` (should be `100dvh`)
  - `padding-top: 0px` (should be `max(7rem, 18vh)`)
  - `display: block` (should be `flex`)

- Style tag mismatch observed: CSS contained `.oferta-section[data-astro-cid-ombi37j6]` while HTML elements had `class="content-section"` — indicating stale compiled CSS being served

---

## Root Causes

### Primary: Navigation Component Listener Accumulation

**File**: `src/components/Navigation.astro`

The `astro:page-load` event listener accumulates on the persistent `document` object:

```javascript
// This runs every time Navigation.astro script executes (every page load)
document.addEventListener('astro:page-load', initNav);
```

**The chain of failure**:

1. **Listener accumulation**: Every time a page with `<Navigation />` loads via View Transitions, the script re-executes and adds ANOTHER `astro:page-load` listener. After N navigations: N listeners exist.

2. **Multiple `initNav()` calls**: When `astro:page-load` fires, ALL N listeners call `initNav()`. Each `initNav()` adds click handlers to `.nav-link` elements.

3. **Multiple click handlers**: After several navigations, each nav link has N click handlers. Clicking any nav link triggers N handlers.

4. **Multiple `navigate()` calls**: Each click handler calls `animateToLinkAndNavigate()` which does:
   ```javascript
   gsap.to(limelight, { ..., onComplete: () => { navigate(href); } });
   ```
   N `navigate()` calls happen concurrently.

5. **Corrupted View Transition**: Multiple concurrent `navigate()` calls from `astro:transitions/client` corrupt the View Transition state. The new page's DOM is partially swapped, and `<style>` tags are not properly inserted.

6. **Missing scoped styles**: The Oferta page's `.content-section` CSS rules (defined in `oferta.astro`'s `<style>` block) are not applied because the View Transition failed to properly insert/replace the scoped style tag.

### Secondary: Homepage GSAP/ScrollTrigger State Leaks

**File**: `src/pages/index.astro`

1. **No cleanup on page leave**: When navigating away from the homepage, `ScrollTrigger.getAll().forEach(t => t.kill())` is NOT called (it only runs when *entering* the homepage via `initHomePage()`).

2. **Zombie ScrollTrigger instances**: GSAP ScrollTrigger instances with `pin: '.hero-sticky-wrapper'` remain alive in memory after navigating away. They reference detached DOM elements and may interfere with global scroll state.

3. **`initHomePage()` accumulation**: Same as Navigation, the homepage adds `astro:page-load` listener without guarding against duplicates:
   ```javascript
   document.addEventListener('astro:page-load', initHomePage);
   ```

4. **Testimonials carousel interval leak**: `initTestimonialsCarousel()` runs at module level and creates a `setInterval` with a local variable. When the script re-executes, a NEW interval is created but the OLD interval (referenced only in a closure from the previous execution) continues running.

5. **`motionQuery` listener accumulation**: The `prefers-reduced-motion` media query listener is also added without guard:
   ```javascript
   motionQuery.addEventListener('change', ...);
   ```

---

## Other Issues Identified

### 1. Homepage `initHomePage()` Listener Accumulation
- **File**: `src/pages/index.astro`
- **Issue**: `document.addEventListener('astro:page-load', initHomePage)` is added without a guard. After N visits to homepage, N listeners accumulate.
- **Impact**: `initHomePage()` runs N times on each `astro:page-load`, each killing all ScrollTriggers and building a new timeline. Wastes resources, potential race conditions.

### 2. Testimonials Carousel Interval Leak
- **File**: `src/pages/index.astro`
- **Issue**: `initTestimonialsCarousel()` declares `let autoPlayInterval` locally. When called again (on subsequent homepage visits), a new `setInterval` is created but the old interval cannot be cleared (reference lost).
- **Impact**: Multiple intervals accumulate, all trying to manipulate a potentially detached DOM element.

### 3. Motion Query Listener Accumulation
- **File**: `src/pages/index.astro`
- **Issue**: `motionQuery.addEventListener('change', ...)` has no duplicate guard.
- **Impact**: After N visits, N listeners fire when user's motion preference changes. Mostly harmless but wasteful.

### 4. No ScrollTrigger Cleanup on Page Leave
- **File**: `src/pages/index.astro`
- **Issue**: When navigating away from homepage, `ScrollTrigger.getAll().forEach(t => t.kill())` is never called. Only runs on homepage entry.
- **Impact**: Zombie ScrollTrigger instances persist, holding references to detached DOM elements. May cause memory leaks or scroll behavior interference.

### 5. Stale Compiled CSS (Dev Mode)
- **Observed**: Style tag contained `.oferta-section[data-astro-cid-ombi37j6]` while source file has `.content-section`.
- **Likely cause**: Vite HMR or dev server cache serving stale compiled version of `oferta.astro`.
- **Note**: This may be a secondary symptom of the corrupted View Transitions rather than a separate root cause.

---

## Fix Strategy

### For Navigation.astro
```javascript
let navPageLoadAttached = false;
// ...
if (!navPageLoadAttached) {
  document.addEventListener('astro:page-load', initNav);
  navPageLoadAttached = true;
}
```

### For index.astro
1. Guard `astro:page-load` listener:
   ```javascript
   let homePageLoadAttached = false;
   if (!homePageLoadAttached) {
     document.addEventListener('astro:page-load', initHomePage);
     homePageLoadAttached = true;
   }
   ```

2. Guard `motionQuery` listener:
   ```javascript
   let motionListenerAttached = false;
   if (!motionListenerAttached) {
     motionQuery.addEventListener('change', ...);
     motionListenerAttached = true;
   }
   ```

3. Add cleanup on `astro:before-swap`:
   ```javascript
   let cleanupAttached = false;
   function attachCleanup() {
     if (cleanupAttached) return;
     cleanupAttached = true;
     document.addEventListener('astro:before-swap', () => {
       ScrollTrigger.getAll().forEach(t => t.kill());
       gsap.globalTimeline.clear();
       if (autoPlayInterval) clearInterval(autoPlayInterval);
       autoPlayInterval = null;
       document.documentElement.style.overflow = '';
       document.body.style.overflow = '';
     });
   }
   attachCleanup();
   ```

4. Fix `initTestimonialsCarousel` to use module-level `autoPlayInterval` variable (already declared at module level).

---

## Reproduction Steps
1. Open homepage (`/`)
2. Wait for intro animation to complete
3. Click "Oferta" nav link
4. Wait for page transition
5. Click "Strona główna" nav link (back to homepage)
6. Wait for page transition
7. Click "Oferta" nav link again
8. **Bug**: Oferta page has broken styling - sections collapsed, no spacing

## Verification
- Run `npm run dev`
- Follow reproduction steps
- Compare first Oferta visit (correct) vs second visit (broken)
- Apply fixes
- Re-test to confirm both visits render correctly
