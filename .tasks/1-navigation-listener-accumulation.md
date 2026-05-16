# Plan: Navigation Component Listener Accumulation

## Priority: 1 (Critical — must be fixed first)

## Issue Summary

In `src/components/Navigation.astro`, the `astro:page-load` event listener is added unconditionally every time the component's script executes. Because Astro View Transitions preserve the `document` object across navigations, each page load adds another listener. After N navigations, N listeners exist on `document`.

## Why this causes the Oferta styling bug

1. Listener accumulates → multiple `initNav()` calls fire on every `astro:page-load`.
2. Each `initNav()` attaches click handlers to `.nav-link` elements.
3. After several navigations, clicking any nav link triggers N concurrent click handlers.
4. Each handler calls `animateToLinkAndNavigate()`, which calls `navigate(href)` from `astro:transitions/client`.
5. Multiple concurrent `navigate()` calls corrupt the View Transition state machine.
6. The new page's DOM swap is incomplete: `<style>` tags for the incoming page's scoped CSS are not properly inserted/replaced.
7. The Oferta page's `.content-section` styles (defined in `oferta.astro`'s `<style>` block) are missing, causing collapsed sections with `min-height: 0px` and no padding.

## Files Involved

- `src/components/Navigation.astro`

## Context Needed

- Understand how `initNav()` is structured and where `document.addEventListener('astro:page-load', initNav)` is located.
- Check whether there are other listeners inside `initNav()` that also accumulate (e.g., click handlers on `.nav-link`).
- The fix needs a module-level guard variable so the `astro:page-load` listener is attached exactly once.
- Ensure `initNav()` itself properly cleans up or deduplicates any internal handlers it adds to nav links.

## Dependencies

None. This is the root cause and can be fixed independently.

## Success Criteria

- After multiple navigations (Home → Oferta → Home → Oferta), only one `astro:page-load` listener for navigation exists.
- Clicking a nav link triggers exactly one navigation, not multiple.
- The Oferta page styling is correct on every visit, not just the first.
