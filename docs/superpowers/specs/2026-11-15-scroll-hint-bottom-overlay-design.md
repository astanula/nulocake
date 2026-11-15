# Snap Pages: Bottom-Centered Fixed Scroll Hint Overlay & Last-Item Visibility

**Date:** 2026-11-15
**Status:** Proposed
**Supersedes:** Left-rail scroll hint coupling (`d51482f`, `src/components/section-nav/SectionNavRail.astro`) and container-bottom clearance (`docs/superpowers/specs/2026-11-14-scroll-hint-tall-sections-design.md`)
**Related:** `DESIGN.md`, `AGENTS.md`, `src/pages/index.astro`, `src/pages/oferta.astro`, `src/home/snapNavigator.ts`, `src/components/stack-fade/ScrollHintArrow.astro`, `src/components/section-nav/SectionDots.astro`, `src/styles/global.css`, `src/config/responsive.ts`, `docs/architecture/word-based-scroll-animation-system.md`

## 1. Purpose & Goals

Decouple `<ScrollHintArrow />` from the left-edge `<SectionDots />` rail and render it as a **viewport-fixed overlay** horizontally centered at the bottom of the main content area on **Home** (`/`, `src/pages/index.astro`) and **Oferta** (`/oferta`, `src/pages/oferta.astro`).

### Core Behavioral Rules

1. **Bottom-Centered Over the Whole Main Content Area:**
   - The scroll hint sits at `position: fixed; left: 50%; bottom: calc(var(--scroll-hint-bottom) + env(safe-area-inset-bottom)); transform: translateX(-50%);` across all six viewport tiers.
   - On split-screen tiers (`tablet` through `large-desktop` on `/`) as well as single-column layouts (`/oferta` on all tiers and `/` on `small-mobile` / `mobile`), horizontal centering is relative to the **whole main content area** (`<main>`), not the left text column alone.
2. **Pure Overlay (Not Part of Section Flow):**
   - `<ScrollHintArrow />` is out of normal document flow (`position: fixed`) and adds **no** extra bottom clearance padding to sections (`--scroll-hint-clearance` remains absent).
   - When visible, the arrows float over the main content area and are permitted to overlap section text or call-to-action buttons near the bottom of the viewport.
3. **Gated on Full Visibility of the Active Text Column's Last Item:**
   - While snap navigation is idle (`transition === null`) on a non-last section (`0 <= current < last`), `<ScrollHintArrow />` is visible **if and only if** the **last rendered item** in the active section's text-column content container (`.hero-section-inner` on `/`, `.content-section-inner` on `/oferta` — including `.section-cta-group` CTA buttons when they are the last element, or e.g. `.testimonials-carousel` when a section has no CTA) is **not hidden behind the bottom viewport edge** (`rect.bottom <= window.innerHeight` within subpixel rounding tolerance).
   - On short sections where that last item already ends above the bottom viewport edge at `scrollY = 0`, the arrows appear immediately.
   - On tall sections where that last item starts partially or wholly below the bottom viewport edge, the arrows start hidden (`is-hidden` + `inert`), fade in dynamically once native `window` scrolling brings the bottom edge of the last item into the viewport, and fade back out if the user scrolls up (or expands dynamic content such as a mobile `<FlavorSelector />` accordion) so the last item extends past the bottom viewport edge again.
4. **Never Shown on the Last Section or During Transitions:**
   - On the last section (`current === last`), `<ScrollHintArrow />` remains hidden (`is-hidden` + `inert`) regardless of scroll position while `.home-footer-dock` slides in.
   - During any section transition (`goTo`), during Home's Phase 1 intro (`!window.hasSeenIntro`), and under `prefers-reduced-motion: reduce`, `<ScrollHintArrow />` remains hidden.

---

## 2. Scope & Non-Negotiable Constraints

1. **Home V2 Out of Scope:**
   - Home V2 (`src/pages/v2.astro`, `src/home-v2/*`) is no longer supported and must be ignored. Do not implement new behavior or tests for `/v2`.
   - Keep `ScrollHintArrow.astro` self-contained (no dependency on parent CSS custom properties) so any untouched legacy imports continue compiling cleanly under `npx astro check` and `npm run build`.
2. **Untouched Offer & Subpage Files:**
   - Do not modify `src/pages/oferta/v2.astro`, `src/components/offer/*`, `src/pages/v2.astro`, or `src/home-v2/*`.
3. **Canonical Six-Tier Responsive Rules:**
   - All responsive CSS in `src/**/*.css` and `src/**/*.astro` must use `@media (--...)` tokens from `CUSTOM_MEDIA` (`src/config/responsive.ts`), such as `@media (--below-tablet)`. Raw `min-width` / `max-width` / `width` media queries are forbidden.
4. **Preserve Left-Edge `SectionDots` Active Alignment:**
   - `<SectionDots />` stays fixed on the left edge, vertically centered (`top: 50%; transform: translateY(-50%);`), preserving the centered-scale offset `left: calc(var(--section-dots-offset) + var(--section-dot-mark-size) * (var(--section-dot-active-scale) - 1) / 2)` so the scaled active dot (`transform-origin: center; transform: scale(var(--section-dot-active-scale))`) keeps all dot centers collinear while maintaining `--section-dots-offset` clearance from the left viewport edge.
5. **No Section Bottom-Padding Inflation:**
   - Sections retain their existing natural editorial bottom padding (`4rem` / `3rem` on `/`, `4.5rem` / `3.5rem` on `/oferta`, plus `--home-footer-h` on `--last` sections). Do not reserve clearance for the arrow overlay.

---

## 3. Architecture & File Boundaries

| File | Change |
|---|---|
| `src/styles/global.css` | Keep `--sm-scroll-hint-width`, `--md-scroll-hint-width`, `--lg-scroll-hint-width`, and `--scroll-hint-width` (plus their responsive cascade) and `--section-dot*` tokens; add `--scroll-hint-bottom: 1.5rem` on `:root`; remove `--sm-scroll-hint-gap`, `--md-scroll-hint-gap`, `--lg-scroll-hint-gap`, and `--scroll-hint-gap`. |
| `src/components/stack-fade/ScrollHintArrow.astro` | Make `<ScrollHintArrow />` self-contained while continuing to size its chevrons, stroke, slide travel, track height, and `>= 44px` hit box from `var(--scroll-hint-width)` (`left: var(--hint-axis, 50%)`). |
| `src/pages/index.astro` | Replace `<SectionNavRail>` with fixed `<SectionDots labels={sectionLabels} class="home-dots" />` and render `<ScrollHintArrow class="home-hint" />` inside `<main id="hero-scroll-container" class="hero-container">` as a bottom-centered fixed overlay; hide both under `prefers-reduced-motion: reduce`. |
| `src/pages/oferta.astro` | Replace `<SectionNavRail>` with fixed `<SectionDots labels={sectionLabels} class="oferta-dots" />` and render `<ScrollHintArrow class="oferta-hint" />` inside `<main id="hero-scroll-container" class="oferta-container">` as a bottom-centered fixed overlay; hide both under `prefers-reduced-motion: reduce`. |
| `src/home/snapNavigator.ts` | Gate `[data-scroll-hint]` visibility on `current !== last` and full viewport-bottom visibility of the active section's last content item; re-evaluate on transition completion, `window` `scroll`, `window` / `visualViewport` `resize`, and `ResizeObserver` on each section and its content wrapper; simplify post-transition focus restoration to check `!hint.inert`. |
| `tests/e2e/section-navigation-rail.spec.ts` | Replace left-rail arrow and `/v2` assertions with E2E coverage of `/` and `/oferta` bottom-centered fixed arrow placement, last-item visibility gating on short/tall/dynamic sections, overlap allowance, last-section hiding, and reduced-motion hiding. |
| `docs/architecture/word-based-scroll-animation-system.md` | Update the `Scroll hint` bullet under Edge-Gated Input to document bottom-centered fixed overlay placement and last-item full-visibility gating. |
| `AGENTS.md` | Update Shared Snap Navigation summary to reflect fixed bottom-centered `<ScrollHintArrow />` gated on last-item visibility alongside fixed left `<SectionDots />`. |

---

## 4. Layout, Positioning & Styling Specification

### 4.1 Global Design Tokens (`src/styles/global.css`)

- **Keep** `--sm-scroll-hint-width`, `--md-scroll-hint-width`, `--lg-scroll-hint-width`, and `--scroll-hint-width` in `:root` along with their responsive rebindings in `@media (--below-desktop)` (`--scroll-hint-width: var(--md-scroll-hint-width)`) and `@media (--below-tablet)` (`--scroll-hint-width: var(--sm-scroll-hint-width)`). Retain all `--section-dot*` tokens (`--sm-section-dots-offset`, `--md-section-dots-offset`, `--lg-section-dots-offset`, `--section-dots-offset`, `--section-dot-size`, `--section-dot-mark-size`, `--section-dot-active-scale`).
- **Add** `--scroll-hint-bottom: 1.5rem;` in `:root`.
- **Remove** `--sm-scroll-hint-gap`, `--md-scroll-hint-gap`, `--lg-scroll-hint-gap`, and `--scroll-hint-gap` from `:root`, `@media (--below-desktop)`, and `@media (--below-tablet)`.

### 4.2 Self-Contained `<ScrollHintArrow />` (`src/components/stack-fade/ScrollHintArrow.astro`)

Move the derived track and hit-target custom properties onto `.scroll-hint` itself so `<ScrollHintArrow />` works standalone while remaining driven by `var(--scroll-hint-width)`:

- **Button box (`.scroll-hint`):**
  ```css
  .scroll-hint {
    --hint-travel: calc(var(--scroll-hint-width) * 1.325825);
    --hint-track-height: calc(var(--scroll-hint-width) + 2 * var(--hint-travel));
    --hint-target-height: max(44px, var(--hint-track-height));
    position: relative;
    display: block;
    width: max(44px, var(--scroll-hint-width));
    height: var(--hint-target-height);
    ...
  }
  ```
  - Ensures at least `44px × 44px` (`LAYOUT_METRICS.minTouchTargetPx`) across all tiers while scaling automatically if `--*-scroll-hint-width` is adjusted in `global.css`.
  - Color, hover/focus-visible `--color-primary` highlight, `0.3s` opacity transition, and `.scroll-hint.is-hidden` (`opacity: 0; pointer-events: none;`) remain unchanged.
- **Chevrons (`.scroll-hint-chevron`):**
  - Centered horizontally at `left: var(--hint-axis, 50%)` and `top: 50%` inside `.scroll-hint-track` (`height: var(--hint-track-height)`), with `width: calc(var(--scroll-hint-width) * 0.707107); height: calc(var(--scroll-hint-width) * 0.707107); border: calc(var(--scroll-hint-width) * 0.176777) solid;` so the rotated `45°` chevron has an exact horizontal width of `var(--scroll-hint-width)`.
  - Continuous `scroll-hint-slide` `2s linear infinite` animation (`translate(-50%, calc(-50% ± var(--hint-travel))) rotate(45deg)`), with `.scroll-hint-chevron--delayed` offset by `-1s`.
  - Under `@media (prefers-reduced-motion: reduce)`: static single chevron (`opacity: 1; animation: none; transform: translate(-50%, -50%) rotate(45deg)`).

### 4.3 Page Placement & Layering (`src/pages/index.astro`, `src/pages/oferta.astro`)

1. **Main-Area Horizontal Centering:**
   - While snap navigation is active (`html.home-snap-active`), `scrollbar-gutter: stable` makes `document.documentElement.clientWidth` the width of both the `position: fixed` containing block and `<main>` (`margin: 0 auto` on `.hero-sticky-wrapper` in `index.astro` and `.oferta-container` in `oferta.astro`).
   - Placing `<ScrollHintArrow />` as a child of `<main>` (outside `<section>` elements so asymmetric section left/right padding never skews centering) with:
     ```css
     .home-hint,
     .oferta-hint {
       position: fixed;
       left: 50%;
       bottom: calc(var(--scroll-hint-bottom) + env(safe-area-inset-bottom));
       transform: translateX(-50%);
       z-index: 5;
     }
     ```
     keeps the arrow's horizontal center aligned with the exact horizontal center of `<main>` at every viewport width and scroll offset.

2. **Left-Edge `SectionDots` Placement:**
   ```css
   .home-dots,
   .oferta-dots {
     position: fixed;
     left: calc(
       var(--section-dots-offset) + var(--section-dot-mark-size) * (var(--section-dot-active-scale) - 1) / 2
     );
     top: 50%;
     transform: translateY(-50%);
     z-index: 5;
   }
   ```

3. **Stacking & Pointer Interaction:**
   - `z-index: 5` places `.home-hint` / `.oferta-hint` above `.hero-video-col` (`z-index: 1`) and `.hero-text-col` / `.oferta-section` (`z-index: 2` / auto), and below `.home-footer-dock` (`z-index: 20`) and fixed `<Navigation />`.
   - When `.is-hidden` is present, `pointer-events: none` and `inert` ensure underlying text and CTA buttons receive all pointer and keyboard interaction unhindered.
   - When visible, only the compact centered `.scroll-hint` button (`max(44px, var(--scroll-hint-width))` wide) captures clicks; surrounding horizontal areas pass pointer events directly through to underlying content.

4. **Reduced Motion:**
   - Inside `@media (prefers-reduced-motion: reduce)`: `.home-dots, .home-hint { display: none; }` on `/` and `.oferta-dots, .oferta-hint { display: none; }` on `/oferta`.

---

## 5. Navigator Visibility, Reactivity & Focus (`src/home/snapNavigator.ts`)

### 5.1 Resolving the Active Text Column's Last Item

Each snap section wraps its text-column flow elements inside a direct inner container (`.hero-section-inner` on `/`, `.content-section-inner` on `/oferta`):

- On sections ending with CTA buttons (Home Sections 1–3, Oferta Sections 1–4), the last element is `.section-cta-group`, whose bottom border-box edge equals the bottom edge of the lowest CTA button (including when buttons wrap onto multiple lines on narrow screens).
- On sections without CTA buttons (such as Home Section 4 `#section-testimonials`), the last element is that section's final content block (`.testimonials-carousel`).

Resolution rules:

```ts
const SUBPIXEL_EPSILON_PX = 0.5;

function getContentRoot(section: HTMLElement): HTMLElement {
  return (
    section.querySelector<HTMLElement>(':scope > .hero-section-inner, :scope > .content-section-inner')
    ?? section
  );
}

function getLastContentItem(section: HTMLElement): HTMLElement | null {
  const children = Array.from(getContentRoot(section).children) as HTMLElement[];
  for (let i = children.length - 1; i >= 0; i--) {
    const el = children[i];
    if (el.hidden || el.classList.contains('visually-hidden')) continue;
    if (el.getClientRects().length === 0) continue;
    return el;
  }
  return null;
}
```

### 5.2 Bottom-Viewport Full-Visibility Predicate

```ts
function isLastItemFullyVisible(section: HTMLElement): boolean {
  const lastItem = getLastContentItem(section);
  if (!lastItem) return false;
  const rect = lastItem.getBoundingClientRect();
  return rect.height > 0 && rect.bottom <= window.innerHeight + SUBPIXEL_EPSILON_PX;
}
```

Key properties:

- **Resting-state accuracy:** `isLastItemFullyVisible` is only evaluated when `transition === null` (and after Home's Phase 1 intro completes), when all `.word` and `.blur-in` elements in `sections[current]` are at their resting transform (`y: 0, scale: 1`). Thus `getBoundingClientRect()` always reflects true resting layout geometry.
- **Clipped vs. fully visible:** Whenever `lastItem` lies wholly below the fold (`rect.top >= window.innerHeight`) or straddles the bottom viewport edge (`rect.top < window.innerHeight < rect.bottom`), `rect.bottom > window.innerHeight + SUBPIXEL_EPSILON_PX` evaluates to `true` and the hint stays hidden. As soon as scrolling brings `lastItem`'s bottom edge at or above `window.innerHeight`, `isLastItemFullyVisible` becomes `true` (even if `lastItem` itself overlaps the fixed arrow overlay, or if an unusually tall `lastItem` on a very short landscape viewport extends above `y = 0`).
- **No unnecessary scroll through trailing section padding:** If `lastItem` is already completely visible inside `window.innerHeight` while only the section's bottom padding (`3rem`–`4.5rem`) extends below the viewport, the hint appears immediately without requiring a dummy scroll through empty padding.

### 5.3 Visibility State & Reactive Update Triggers

```ts
let hintVisible: boolean | null = null;

function setHint(visible: boolean) {
  if (!hint || visible === hintVisible) return;
  hintVisible = visible;
  hint.classList.toggle('is-hidden', !visible);
  hint.inert = !visible;
}

const updateHint = () => {
  if (transition) return;
  setHint(current !== last && isLastItemFullyVisible(sections[current]));
};
```

`setHint` / `updateHint` runs on:

1. **Initial mount (`mountSnapNavigator`):** After `master.seek(0)` and `applyActive()`, sets initial visibility for Section 0.
2. **Transition start (`goTo`):** Calls `setHint(false)` immediately before playing the outro segment.
3. **Transition completion (`tl` `onComplete`):** After `transition = null`, `applyActive()`, and the boundary `resetScrollTop()`, calls `updateHint()` for destination section `to`.
4. **Native `window` `scroll`:** Calls `updateHint()` inside the passive `scroll` listener whenever `window.scrollY` changes while `!transition` (`hintVisible` memoization prevents redundant DOM writes during continuous scrolling).
5. **Viewport resize:** Passive `resize` listeners on `window` and `window.visualViewport` (aborted via `controller.signal`) re-run `updateHint()` when viewport dimensions or mobile browser chrome height (`100dvh` / `innerHeight`) change.
6. **Section & content resize (`ResizeObserver`):** A `ResizeObserver` observes each `sec` and `getContentRoot(sec)` (disconnected on teardown). Observing `getContentRoot(sec)` (`height: auto`, unconstrained by `min-height: 100dvh`) guarantees `updateHint()` runs whenever inner content expands or collapses — including `<FlavorSelector />` mobile `<details>` accordions, radio flavor cards, font swaps, or lazy-loaded media.
7. **Teardown:** Disconnects `hintObserver` and calls `setHint(false)`.

### 5.4 Click & Keyboard Focus Restoration

- **Click:** Clicking `[data-scroll-hint]` while `!isMenuOpen()` calls `goTo(current + 1)` directly (including when `lastItem` is fully visible at `scrollY = 0` while empty section bottom padding still exceeds `100dvh`).
- **Focus restoration (`goTo` `onComplete`):**
  - Hiding the hint (`inert = true`) at transition start drops focus when `focusWasOnHint` was `true`.
  - After `updateHint()` runs at `onComplete`:
    - If `!hint.inert` (destination is non-last and its last content item is already fully visible at `scrollY = 0`), restore `hint.focus({ preventScroll: true })`.
    - Otherwise (`to === last`, or destination is a tall section whose last item starts below the bottom viewport edge at `scrollY = 0`), call `sections[to].focus({ preventScroll: true })` so keyboard users start at the top of the incoming section and scroll natively with `ArrowDown` / `PageDown` / `Space`.

---

## 6. Verification Plan

*(Per `AGENTS.md`: never run Playwright tests unless explicitly asked by the user; consult `docs/testing.md` when running or writing tests.)*

1. **Static & Build Checks:**
   - `npx astro check` and `npm run build` succeed with zero TypeScript, Astro, or `responsiveMediaPlugin` errors.
   - `git diff src/pages/oferta/v2.astro src/components/offer/ src/pages/v2.astro src/home-v2/` is empty.
2. **E2E Test Suite Updates (`tests/e2e/section-navigation-rail.spec.ts`):**
   - Across all six canonical viewport tiers (`small-mobile` `375px`, `mobile` `600px`, `tablet` `900px`, `laptop` `1100px`, `desktop` `1280px`, `large-desktop` `1600px`) on both `/` and `/oferta`:
     - `[data-scroll-hint]` is horizontally centered on `<main>` (`hintBox.x + hintBox.width / 2 ≈ mainBox.x + mainBox.width / 2`), positioned near the viewport bottom, with touch target `>= 44px × 44px`, and `.scroll-hint-chevron` width matches `--scroll-hint-width` (`10px` on `small-mobile` / `mobile`, `16px` on `tablet` through `large-desktop`).
     - `.section-dot-mark` elements remain collinear on the left edge and vertically centered in the viewport.
   - **Short section:** On `/` at `1280×900`, Section 0's `.section-cta-group` ends above `900px`; `[data-scroll-hint]` is visible immediately on mount/post-intro and clicking it transitions to Section 1.
   - **Tall section scroll gating & fixed overlay:** On `/` or `/oferta` at a compact viewport height where the active section's `.section-cta-group` extends below `window.innerHeight` at `scrollY = 0`:
     - `[data-scroll-hint]` starts `.is-hidden` and `inert = true`.
     - Scrolling partway down while `.section-cta-group`'s bottom edge still exceeds `window.innerHeight` keeps `[data-scroll-hint]` hidden.
     - Scrolling until `.section-cta-group`'s bottom edge is `<= window.innerHeight` reveals `[data-scroll-hint]` at its fixed bottom-center viewport coordinates (even when overlapping `.section-cta-group`).
     - Scrolling back up so `.section-cta-group`'s bottom edge drops below `window.innerHeight` hides `[data-scroll-hint]` again.
   - **Dynamic content expansion (`/oferta` mobile accordion):** Expanding a `<details class="flavor-accordion-item">` on mobile so `.section-cta-group` is pushed past the bottom viewport edge hides `[data-scroll-hint]` until scrolled down to bring `.section-cta-group` back into full view.
   - **Last section:** Navigating to the final section (`End` key or last dot) keeps `[data-scroll-hint]` `.is-hidden` and `inert = true` even when its `.section-cta-group` is fully visible.
   - **Reduced motion:** Emulating `prefers-reduced-motion: reduce` hides both dots and `[data-scroll-hint]` on `/` and `/oferta`.
