# nulo.cake website

## Project Overview
Astro v6.1.5 with View Transitions, GSAP v3.15.0 (ScrollTrigger), Tailwind CSS.

## Design System
Always load and reference `DESIGN.md` for design-related tasks including:
- Color palette and token usage
- Typography (Epilogue, Manrope)
- Layout & composition decisions
- Interactions & animation implementation
- Any UI/UX changes

## src/pages/index.astro

"Strona główna" - landing page

### Animation System

Detailed documentation in `docs/architecture/word-based-scroll-animation-system.md` — read this file for full system specification before making animation changes.

Two-phase setup:
- **Phase 1** - Time-based intro for section 0 (plays once per session, blocks input)
- **Snap navigation** - `src/home/snapNavigator.ts` plays the paused master timeline (`src/home/sectionTimeline.ts`) by time; a gesture or key only triggers a transition. No ScrollTrigger: the document never scrolls while mounted (`html.home-snap-active`). Speed knob: `SNAP_MS_PER_WU` in `src/config/animation.ts`.

### Session State
Uses `window.hasSeenIntro` flag (survives View Transition navigations):
- First visit: Phase 1 → snap navigation
- Subsequent visits: Skip Phase 1, show final state directly, mount snap navigation

### Re-execution
Script uses `astro:page-load` event (not `is:inline`) to run on every home page visit during client-side navigation.

### Video
Hero video (`#hero-video`) is temporarily commented out in HTML. When re-enabled, the video readiness check (`readyState >= 1` or `loadedmetadata` event) must be preserved in `initHomePage()`.

### Cleanup
`stopHomeAnimation()` runs before every init, on `astro:before-swap` and on a switch to reduced motion: it kills the pending Phase 1 and calls the snap navigator's teardown (timelines, listeners via one `AbortController`, `ResizeObserver`, page lock, footer dock styles). Gate home-only logic on `.hero-section`, not `#hero-scroll-container` (`o-mnie.astro` uses that ID too).

## Testing

NEVER run the tests by yourself unless I ask you to. When running or writing tests please check `docs/testing.md` for details.