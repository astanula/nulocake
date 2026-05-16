# Plan: Homepage `astro:page-load` Listener Accumulation

## Priority: 2 (High — blocks reliable cleanup)

## Issue Summary

In `src/pages/index.astro`, the homepage animation script adds `document.addEventListener('astro:page-load', initHomePage)` without any duplicate guard. Because the `document` object persists across View Transitions, each visit to the homepage adds another listener. After N visits, N listeners fire on every `astro:page-load`, each calling `initHomePage()`.

Each `initHomePage()` kills all ScrollTriggers and builds a new timeline. Multiple concurrent or sequential calls waste resources and can create race conditions where one call kills ScrollTriggers that another call is in the middle of creating.

## Why this priority

This must be fixed before (or together with) adding `astro:before-swap` cleanup. If we add cleanup listeners without guarding them too, we risk accumulating cleanup listeners as well. Establishing the guard pattern here provides the foundation for all other homepage fixes.

## Files Involved

- `src/pages/index.astro`

## Context Needed

- Locate the exact line where `document.addEventListener('astro:page-load', initHomePage)` is added.
- Check if the script is `is:inline` or a regular module script. The guard strategy depends on script execution semantics.
- Understand what `initHomePage()` does: it initializes GSAP ScrollTrigger, hero animations, and possibly calls `initTestimonialsCarousel()`.

## Dependencies

- Priority 1 (Navigation listener accumulation) should ideally be completed first so that navigation to/from the homepage is stable and not corrupted by concurrent `navigate()` calls.

## Success Criteria

- After visiting the homepage multiple times via View Transitions, only one `astro:page-load` listener for `initHomePage` exists.
- `initHomePage()` runs exactly once per homepage load.
- No race conditions between multiple `initHomePage()` executions.
