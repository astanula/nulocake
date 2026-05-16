# Plan: Homepage ScrollTrigger & Testimonials Cleanup on Page Leave

## Priority: 3 (High — prevents memory leaks and zombie state)

## Issue Summary

When navigating away from the homepage, nothing cleans up the GSAP ScrollTrigger instances or the testimonials carousel interval. This leaves "zombie" state in memory:

1. **ScrollTrigger instances**: `initHomePage()` calls `ScrollTrigger.getAll().forEach(t => t.kill())` only when *entering* the homepage, not when leaving. Instances with `pin: '.hero-sticky-wrapper'` remain alive, referencing detached DOM elements and potentially interfering with global scroll behavior on the next page.

2. **Testimonials carousel interval**: `initTestimonialsCarousel()` creates a `setInterval` stored in a local variable. When the script re-executes on a subsequent homepage visit, a new interval is created but the old interval (referenced only in a closure from the previous execution) continues running, trying to manipulate detached DOM elements.

## Why this priority

This depends on Priority 2 because we want to establish the listener-guard pattern before adding a new `astro:before-swap` listener. If we add cleanup without a guard, we could accumulate cleanup listeners just like we accumulated page-load listeners.

## Files Involved

- `src/pages/index.astro`

## Context Needed

- Locate all ScrollTrigger creation sites and understand the pinning setup (`pin: '.hero-sticky-wrapper'`).
- Locate `initTestimonialsCarousel()` and understand how `autoPlayInterval` is declared. The investigation notes say it should be module-level.
- Understand how `astro:before-swap` fires relative to View Transitions — this is the correct event to clean up before the DOM is replaced.
- Check if `gsap.globalTimeline.clear()` or any GSAP context cleanup is needed in addition to killing ScrollTriggers.
- Check if `document.documentElement.style.overflow` or `document.body.style.overflow` is modified by the homepage and needs resetting on leave.

## Dependencies

- Priority 2 (Homepage `astro:page-load` guard) should be completed first so that the `astro:before-swap` cleanup listener can also be guarded using the same pattern.

## Success Criteria

- After navigating away from the homepage, all ScrollTrigger instances from the homepage are killed.
- After navigating away from the homepage, the testimonials auto-play interval is cleared.
- No detached DOM references remain in GSAP/ScrollTrigger memory.
- Re-visiting the homepage creates fresh animations without interference from previous instances.
