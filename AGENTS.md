# nulo.cake website

## Project Overview
Astro v6.1.5 with View Transitions, GSAP v3.15.0 (ScrollTrigger), Tailwind CSS.

## src/pages/index.astro

### Animation System
Two-phase setup:
- **Phase 1** - Time-based intro for section 0 (plays once per session, blocks scroll)
- **Phase 2** - Scroll-driven timeline for all sections (GSAP ScrollTrigger with pinned `.hero-sticky-wrapper`)

### Session State
Uses `window.hasSeenIntro` flag (survives View Transition navigations):
- First visit: Phase 1 → Phase 2
- Subsequent visits: Skip Phase 1, show final state directly, run Phase 2

### Re-execution
Script uses `astro:page-load` event (not `is:inline`) to run on every home page visit during client-side navigation.

### Video
Hero video (`#hero-video`) is temporarily commented out in HTML. When re-enabled, the video readiness check (`readyState >= 1` or `loadedmetadata` event) must be preserved in `initHomePage()`.

### Cleanup
Kill old ScrollTrigger instances before building new timeline: `ScrollTrigger.getAll().forEach(t => t.kill())`
