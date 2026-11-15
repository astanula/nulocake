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

## Responsive Viewport Tiers
- Use the six canonical, non-overlapping tiers: `small-mobile` `<420px`, `mobile` `420–767px`, `tablet` `768–1023px`, `laptop` `1024–1279px`, `desktop` `1280–1535px`, and `large-desktop` `≥1536px`.
- Define viewport pixel thresholds only in `TIER_MIN_WIDTH_PX` within `src/config/responsive.ts`; it is the sole breakpoint source of truth.
- Write CSS with `@media (--...)` tokens from `CUSTOM_MEDIA`. `src/build/responsiveMediaPlugin.ts` expands them, synchronizes Tailwind `@theme` `--breakpoint-*` tokens, and fails builds for raw `min-width`/`max-width`/`width` media rules and unknown `--*` tokens.
- In JS and Astro templates, use `CUSTOM_MEDIA` with `window.matchMedia` or `<Image sizes>`, or use `getViewportTier()` for tier-based logic.

## Snap Section Pages (`src/pages/index.astro`, `src/pages/oferta.astro`)

Read `docs/architecture/word-based-scroll-animation-system.md` before changing section animations, timelines, or snap navigation.

### Shared Snap Navigation (`src/home/sectionTimeline.ts`, `src/home/snapNavigator.ts`)
- **Time-driven master timeline**: `snapNavigator.ts` plays segments of the paused WU master timeline (`sectionTimeline.ts`) at `SNAP_MS_PER_WU` (`src/config/animation.ts`).
- **Unified edge-gated `window` scroll**: While mounted (`html.home-snap-active`: `scrollbar-gutter: stable`, `overscroll-behavior-y: none`), inactive sections are `display: none` and `.is-active` flows naturally (`min-height: 100dvh; overflow: clip`, never inner `overflow-y: auto`). `<SectionDots />` stays fixed at the left edge; the fixed bottom-centered `<ScrollHintArrow />` is shown only when the active text column's last rendered item ends within the viewport, outside transitions and the last section. Sections `≤ 100dvh` snap on the first gesture/key; taller sections scroll `window` natively to the edge first, then snap on the next settled gesture (`EDGE_GUARD_MS`, `EDGE_EPSILON_PX`) and reset `window.scrollTo(0, 0)` synchronously when `.is-active` switches.
- **Layout integration**: `src/layouts/Layout.astro` gates `body.scroll-layout-active` on `.scroll-container` presence (`isSubpage={true}`). Snap pages (`index.astro`, `oferta.astro`) omit `isSubpage` and use fixed `<Navigation />` plus `.home-footer-dock`.

### Home (`src/pages/index.astro`)
- **Phase 1 & session state**: First visit (`!window.hasSeenIntro`) plays time-based Phase 1 intro on section 0 (blocking input), then mounts snap navigation; subsequent visits skip Phase 1 and mount snap navigation directly.
- **Video**: Hero video (`#hero-video`) is temporarily commented out in HTML. When re-enabled, preserve the readiness check (`readyState >= 1` or `loadedmetadata`) in `initHomePage()`.
- **Cleanup**: `stopHomeAnimation()` runs before init, on `astro:before-swap`, and when switching to reduced motion. Gate home-only logic on `.hero-section`, not `#hero-scroll-container` (`oferta.astro` and `o-mnie.astro` use `#hero-scroll-container` too for the skip-link).

### Oferta (`src/pages/oferta.astro`)
- **Immediate initial state**: Section 0 renders with `.is-active` in HTML and no load-time hiding animation; `<FlavorSelector />` and `<CakeSizeGuide />` are wrapped in `.blur-in` containers.
- **Cleanup**: `stopOfertaAnimation()` runs before init, on `astro:before-swap`, and on `prefers-reduced-motion` changes, gated on `.oferta-section`. Both pages initialize via `astro:page-load` with window guard flags to prevent duplicate global listeners.

## Testing

NEVER run the tests by yourself unless I ask you to. When running or writing tests please check `docs/testing.md` for details.