# Oferta Page: Snap Section Navigation & Unified Edge-Gated Page Scroll

**Date:** 2026-11-14
**Status:** Proposed
**Related:** `DESIGN.md`, `AGENTS.md`, `src/pages/oferta.astro`, `src/pages/index.astro`, `src/home/sectionTimeline.ts`, `src/home/snapNavigator.ts`, `src/config/animation.ts`, `src/layouts/Layout.astro`, `docs/architecture/word-based-scroll-animation-system.md`

## 1. Purpose & Goals

Implement the Home (v1) word-based / blur-in section transition system on the **Oferta** page (`/oferta`, `src/pages/oferta.astro`), including side `SectionDots`, bottom `ScrollHintArrow`, and the sliding `Footer` dock on the final section, while leaving **Oferta v2** (`/oferta/v2`, `src/pages/oferta/v2.astro`) and all shared offer components (`src/components/offer/*`) completely untouched.

Because several Oferta sections (such as the flavor selector with an open mobile accordion or the portion/pricing guide) can exceed `100dvh`, `src/home/snapNavigator.ts` is upgraded from a static `overflow: hidden` viewport lock to a unified **edge-gated whole-page (`window`) scroll** model used across both **Home v1** (`/`) and **Oferta v1** (`/oferta`):

1. **No inner scroll containers:** Sections never use internal `overflow-y: auto`. When the active section exceeds `100dvh`, the browser scrolls the document (`window`) natively.
2. **Edge-gated transitions:** When the active section fits within `100dvh`, the very first scroll gesture or navigation key press triggers a transition (identical to Home v1 previously). When the active section is taller than `100dvh`, native scrolling brings the bottom (or top) edge into view first; once at that edge and after the scrolling gesture settles, the **next** scroll gesture or navigation key press triggers the snap transition.
3. **Top-aligned section entry:** Every transition (forward, backward, or jump via dots / `Home` / `End`) resets `window.scrollTo(0, 0)` at the exact boundary where `is-active` switches to the target section, so incoming headings and cascades always play from the top of the section.
4. **Immediate initial state on Oferta:** Unlike Home v1's once-per-session Phase 1 entrance animation, `/oferta` renders Section 0 (`Smaki`) immediately visible on load (including with JavaScript disabled); animations run on transitions between sections.

## 2. Non-Negotiable Constraints

1. **Zero Changes to Oferta v2 & Offer Subcomponents:**
   - `src/pages/oferta/v2.astro`, `src/components/offer/FlavorSelector.astro`, `src/components/offer/CakeSizeGuide.astro`, `src/components/offer/CakeCrossSection.astro`, and `src/components/offer/FlavorLayerMap.astro` must not be modified.
   - `<FlavorSelector />` and `<CakeSizeGuide />` are animated on `/oferta` by wrapping them in `<div class="blur-in">` containers inside `src/pages/oferta.astro`.
2. **Preserve Existing Visual Choreography & Constants:**
   - Reuse `src/home/sectionTimeline.ts` without duplicating WU timing or GSAP tween construction.
   - Existing constants in `src/config/animation.ts` (`PX_PER_WU`, `DURGAP`, `HOLD`, `MS_PER_WU`, `SNAP_MS_PER_WU`, `SNAP_EASE`, `TRIGGER_PX`, `WHEEL_QUIET_MS`, `SCROLL_HINT_GAP_PX`, visual blur/lift/scale/rotation values, and `WU_*` weights) keep their current values.
3. **Preserve Tooltip & Interactive Widget Isolation:**
   - `snapNavigator.ts` listeners stay in the bubble phase on `window`/`document` so `#design-system-tooltip` (`src/components/DesignSystemTooltip.astro`) continues to isolate its internal wheel, touch, and keyboard events via `stopPropagation()`.
   - Native keyboard interaction inside `FlavorSelector` (`<input type="radio">` arrow keys and `<details><summary>` activation with `Space`) and links/buttons must never trigger section transitions.
4. **Preserve Existing Oferta E2E Compatibility:**
   - Section 0 on `/oferta` carries `.is-active` in server-rendered HTML, retains `.section-heading-accent` (`rgb(255, 170, 248)`), and runs no load-time hiding animation, keeping Section 0 immediately interactive with or without JavaScript.

## 3. Architecture & File Boundaries

| File | Change |
|---|---|
| `src/config/animation.ts` | Add `EDGE_EPSILON_PX = 2` (subpixel scroll-edge tolerance) and `EDGE_GUARD_MS = 180` (cooldown after native `window` scroll before a gesture can trigger a transition). |
| `src/home/sectionTimeline.ts` | Shared as-is by `src/pages/index.astro` and `src/pages/oferta.astro` (comment header updated to note shared v1 usage). |
| `src/home/snapNavigator.ts` | Replace static `overflow: hidden` assumption with unified edge-gated `window` scroll handling, transition-time scroll lock, boundary `window.scrollTo(0, 0)`, scroll-aware `fitsAboveHint`, and `<summary>`/`<a>` `Space`-key exclusion. |
| `src/layouts/Layout.astro` | Gate `body.scroll-layout-active` on `document.querySelector('.scroll-container') !== null` instead of `pathname !== '/'`, so `.scroll-container` subpages (`galeria`, `o-mnie`, `kontakt`, `oferta/v2`) keep their subpage scroll container while `window`-driven pages (`index.astro`, `v2.astro`, `oferta.astro`) use document flow and fixed `<Navigation />`. |
| `src/pages/index.astro` | Adapt `.hero-sticky-wrapper`, `.hero-section`, `.hero-video-col` (`position: sticky` on desktop/tablet, `position: fixed` background on mobile), `.home-dots`, `.home-hint`, and `html.home-snap-active` (`scrollbar-gutter: stable`, `overscroll-behavior-y: none`) to unified edge-gated document flow. Keep Phase 1 intro (`window.hasSeenIntro`) unchanged. |
| `src/pages/oferta.astro` | Switch to full-viewport snap layout (`isSubpage` omitted): render `<Navigation />`, `<SectionDots />`, 5 `.oferta-section` blocks with `<span class="word">` headings and `.blur-in` content wrappers, `<ScrollHintArrow />`, `.home-footer-dock` with `<Footer />`, responsive styles, reduced-motion static flow, and `astro:page-load` / `astro:before-swap` lifecycle script. |
| `docs/architecture/word-based-scroll-animation-system.md` | Document unified edge-gated page scrolling and shared usage on Home v1 and Oferta v1. |
| `AGENTS.md` | Update animation and cleanup notes to reflect unified edge-gated snap navigation across `index.astro` and `oferta.astro`. |

Files explicitly **not** modified: `src/pages/oferta/v2.astro`, `src/components/offer/*`, `src/pages/v2.astro`, `src/home-v2/*`, `src/components/DesignSystemTooltip.astro`, `src/components/section-nav/SectionDots.astro`, `src/components/stack-fade/ScrollHintArrow.astro`.

## 4. Unified Edge-Gated Page Scroll (`src/home/snapNavigator.ts`)

### 4.1 Document Flow & Active Section Visibility

- While snap navigation is mounted (`html.home-snap-active`), `html` uses `scrollbar-gutter: stable` and `overscroll-behavior-y: none` (no `overflow: hidden` in resting state).
- Under `@media (prefers-reduced-motion: no-preference)`, inactive sections (`:not(.is-active)`) have `display: none`, while the single `.is-active` section has `display: flex; position: relative; min-height: 100dvh; height: auto; overflow: clip`.
  - On `/oferta`, Section 0 has `.is-active` in server-rendered HTML, so it paints immediately with zero flash of subsequent sections.
  - On `/`, `.hero-text-col` retains `min-height: 100dvh` so `.hero-sticky-wrapper` holds full viewport height before `initHomePage()` / `runPhase1()` hides Section 0's words and adds `.is-active` (preventing any pre-intro flash).
  - Consequently, `document.documentElement.scrollHeight` always equals the exact natural height of the active section.
  - `overflow: clip` on the active section creates **no** inner scroll container, while clipping GSAP `y: ±60px` (`LIFT_PX`), `scale`, and `blur` transforms so they never inflate `document.documentElement.scrollHeight`.

### 4.2 Edge Detection & Gesture Separation

Let `maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)`.

For direction `dir` (`1` = next/down, `-1` = previous/up):

- `isAtEdge(1)`: `maxScroll() - window.scrollY <= EDGE_EPSILON_PX`
- `isAtEdge(-1)`: `window.scrollY <= EDGE_EPSILON_PX`

A `window` `scroll` listener records `lastNativeScroll = performance.now()` whenever `window.scrollY` changes outside of programmatic boundary resets:

1. **Sections fitting within `100dvh` (`maxScroll() <= EDGE_EPSILON_PX`):**
   - `isAtEdge(1)` and `isAtEdge(-1)` are both `true` immediately and `window` never scrolls.
   - The first vertical wheel/touch gesture exceeding `TRIGGER_PX` (`60px`) or navigation key press fires `goTo(current + dir)` immediately.
2. **Sections taller than `100dvh` (`maxScroll() > EDGE_EPSILON_PX`):**
   - **Wheel:** A wheel gesture is a run of `wheel` events with gaps `< WHEEL_QUIET_MS` (`150ms`). If at the start of the gesture (or during the gesture) `!isAtEdge(dir)` holds, or `performance.now() - lastNativeScroll < EDGE_GUARD_MS` (`180ms`), the gesture is marked as a native page-scrolling gesture (`wheel.scrolled = true`) and cannot trigger a section transition — even if momentum carries `window.scrollY` to the edge during the same gesture. Once the user pauses (`>= WHEEL_QUIET_MS`) and `EDGE_GUARD_MS` elapses at the edge, the **next** wheel gesture in `dir` accumulates vertical delta and fires `goTo(current + dir)` upon exceeding `TRIGGER_PX`.
   - **Touch:** On `touchstart`, record initial coordinates and whether the gesture began settled at each edge (`now - lastNativeScroll >= EDGE_GUARD_MS`). If `window` scrolls natively during `touchmove` or the gesture did not start settled at the edge in `dir`, mark `touch.scrolled = true` so that swipe only scrolls the page. A fresh swipe started while settled at the edge triggers `goTo(current + dir)` once vertical travel exceeds `TRIGGER_PX` (`|dy| > |dx|`).
   - **Keyboard:**
     - Ignored when focus is inside `input, textarea, select, [contenteditable]`, when modifiers (`altKey`, `ctrlKey`, `metaKey`) are held, or when the mobile nav drawer is open (`#nav-links.open`).
     - On `Space`, also ignored when focus is inside `button, summary, a, [role="button"]` so `<details><summary>` accordions, buttons, and links keep native `Space` activation.
     - `Home` / `End`: always `preventDefault()` and call `goTo(0)` / `goTo(last)`.
     - `ArrowDown` / `PageDown` / `Space` (`dir = 1`) and `ArrowUp` / `PageUp` / `Shift+Space` (`dir = -1`):
       - If `!isAtEdge(dir)`: return without `preventDefault()` so the browser scrolls `window` natively at OS line/page speed.
       - If `isAtEdge(dir)`: always `preventDefault()`; if settled (`now - lastNativeScroll >= EDGE_GUARD_MS`), call `goTo(current + dir)`.

### 4.3 Transition Lock & Top-Aligned Reset (`window.scrollTo(0, 0)`)

- While `transition !== null` (and when `isMenuOpen()`), `wheel` (`{ passive: false }`, excluding `e.ctrlKey` pinch-zoom) and single-finger vertical `touchmove` (`{ passive: false }`) call `e.preventDefault()` so momentum cannot scroll the document mid-outro or mid-intro. During resting native scroll (`transition === null`), `preventDefault()` is never called.
- Inside `goTo(to)`:
  - **Forward (`to > from`):**
    1. Seek to `outroStart(from)` and play `outroStart(from) → outroEnd(from)` at the user's current `window.scrollY` so the visible part of section `from` animates out in place.
    2. At the boundary before playing `sectionStarts[to] → rest(to)`: seek `master` to `sectionStarts[to]`, run `applyActive()` (switching `.is-active` to `sections[to]`), and reset `window.scrollTo(0, 0)` synchronously in the same frame (without updating `lastNativeScroll`).
    3. Play `sectionStarts[to] → rest(to)` (plus `slideDock(true, ...)` if `to === last`).
  - **Backward (`to < from`):**
    1. Play `rest(from) → sectionStarts[from]` (plus `slideDock(false, ...)` if `from === last`) at current `window.scrollY`.
    2. At the boundary before playing `outroEnd(to) → outroStart(to)`: seek `master` to `outroEnd(to)`, run `applyActive()` (switching `.is-active` to `sections[to]`), and reset `window.scrollTo(0, 0)` synchronously in the same frame.
    3. Play `outroEnd(to) → outroStart(to)`, then seek `rest(to)`.

### 4.4 Scroll-Aware `ScrollHintArrow` Visibility

- `fitsAboveHint(sec)` measures layout-pure child bounds (`max(el.offsetTop + el.offsetHeight)` across `sec.children`, which ignores GSAP child transforms because `sec` has `position: relative`) and checks:
  `sec.getBoundingClientRect().top + contentBottom + SCROLL_HINT_GAP_PX <= hint.getBoundingClientRect().top`.
- `updateHint()` runs on transition completion, `ResizeObserver` (observing each section and its direct children), and `window` `scroll`.
  - When a tall section overflows the bottom of the viewport at `scrollY = 0`, `sec.getBoundingClientRect().top + contentBottom` sits below the hint, so the hint stays hidden and never overlaps content.
  - Once scrolled down so content clears `SCROLL_HINT_GAP_PX` above the hint (and `current !== last`), the hint fades in.

## 5. Oferta Page Structure & Layout (`src/pages/oferta.astro`)

### 5.1 Top-Level Layout & `Layout.astro` Integration

- `src/pages/oferta.astro` renders `<Layout title="Oferta — Nulo Cake" description="...">` (with `isSubpage` omitted / `false`), containing:
  1. `<Navigation />` (fixed top bar; automatically receives `.scrolled` glass blur from `Navigation.astro` when `window.scrollY > 60` on tall sections)
  2. `<main id="hero-scroll-container" class="oferta-container" tabindex="-1">` (keeps `Layout.astro`'s `#hero-scroll-container` skip-link functional; `index.astro` gates Home init on `.hero-section`)
     - `<SectionDots labels={sectionLabels} class="oferta-dots" />`
     - 5 `<section class="oferta-section" ... tabindex="-1">` elements (Section 0 has `is-active` in HTML; Section 4 has `oferta-section--last`)
     - `<ScrollHintArrow class="oferta-hint" />`
     - `<div class="home-footer-dock" inert><Footer /></div>`
- In `src/layouts/Layout.astro`, `updateScrollLayout()` sets `document.body.classList.toggle('scroll-layout-active', Boolean(document.querySelector('.scroll-container')))`. Pages using `isSubpage={true}` (`galeria`, `o-mnie`, `kontakt`, `oferta/v2`) render `.scroll-container` and retain `body.scroll-layout-active` unchanged.

### 5.2 Section Labels, Headings & Animated Element Mapping

`sectionLabels`: `['Smaki', 'Dekoracje', 'Porcje i cennik', 'Jak zamówić', 'Dodatkowa oferta']` (used for both `<SectionDots />` and each `<section>`'s `aria-label`).

Every animated unit uses the standard 1 WU weight from `src/config/animation.ts` (`WU_WORD = 1`, `WU_BODY = 1`, `WU_CTA = 1`):

1. **Section 0 (`Smaki` — rendered with `class="oferta-section is-active"`):**
   - Heading (`h2.display-lg.section-title-lg.section-heading`):
     `<span class="word">Co</span> <span class="word">kryje</span> <span class="word">się</span> <span class="word"><span class="section-heading-accent">w</span></span> <span class="word"><span class="section-heading-accent">środku</span>?</span>`
     *(Keeps `?` bound inside the same `inline-block` `.word` as `środku` so `?` never wraps onto an orphan line or consumes a separate WU, while keeping `.section-heading-accent` pink `rgb(255, 170, 248)` and `?` soft white.)*
   - `.blur-in` blocks (3):
     1. `<p class="body-lg section-body blur-in">W moich tortach nie znajdziesz gotowych mieszanek…</p>`
     2. `<div class="oferta-block blur-in"><FlavorSelector /></div>`
     3. `<div class="section-cta-group blur-in"><a href={withBase('kontakt')} class="btn-primary">Mam pytanie o smaki</a></div>`
2. **Section 1 (`Dekoracje`):**
   - Heading words: `Jak`, `dekoruję?`
   - `.blur-in` blocks (4):
     1. Intro `<p class="body-lg section-body blur-in">`
     2. `<ul class="decor-list blur-in">`
     3. Pricing note `<p class="body-lg section-body blur-in">`
     4. `<div class="section-cta-group blur-in">`
3. **Section 2 (`Porcje i cennik`):**
   - Heading words: `Przewodnik`, `po`, `porcjach`, `i`, `cennik`
   - `.blur-in` blocks (3):
     1. `<div class="portion-pricing blur-in">`
     2. `<div class="oferta-block blur-in"><CakeSizeGuide /></div>`
     3. `<div class="section-cta-group blur-in">`
4. **Section 3 (`Jak zamówić`):**
   - Heading words: `Jak`, `zamówić`, `wymarzony`, `tort?`
   - `.blur-in` blocks (2):
     1. `<ol class="steps-list blur-in">`
     2. `<div class="section-cta-group blur-in">`
5. **Section 4 (`Dodatkowa oferta` — `class="oferta-section oferta-section--last"`):**
   - Heading words: `Coś`, `więcej`, `niż`, `torty?`
   - `.blur-in` blocks (3):
     1. `<p class="body-lg section-body blur-in">`
     2. `<ul class="section-body body-lg blur-in">`
     3. `<div class="section-cta-group blur-in">`

### 5.3 Spacing, Controls Placement & Footer Dock

- **Full-width section geometry:**
  - `.oferta-container`: `max-width: var(--layout-max-width); margin: 0 auto; width: 100%; --home-footer-h: 0px;`
  - `.oferta-section`:
    - Desktop (`≥ 1025px`): `padding: calc(4.5rem + var(--subpage-top-offset)) 2rem 4.5rem 4rem;`
    - Tablet (`769px – 1024px`): `padding: calc(4.5rem + var(--subpage-top-offset)) 1.5rem 3.5rem 3.5rem;`
    - Mobile (`≤ 768px`): `padding: calc(4.5rem + var(--subpage-top-offset)) 1.5rem 3.5rem 2.25rem; align-items: center;`
  - `.oferta-section--last`: adds `var(--home-footer-h)` to its bottom padding (`calc(4.5rem + var(--home-footer-h))` desktop, `calc(3.5rem + var(--home-footer-h))` tablet/mobile) so content never hides behind the docked footer.
- **Fixed viewport controls:**
  - `.oferta-dots` (and updated `.home-dots` on `index.astro`): `position: fixed; top: 50%; transform: translateY(-50%); z-index: 5; left: max(1.5rem, calc((100% - var(--layout-max-width)) / 2 + 1.5rem));` (`1rem` offset on tablet, `0.375rem` on mobile). Using `100%` (rather than `100vw`) keeps alignment immune to scrollbar width.
  - `.oferta-hint`: `position: fixed; left: 50%; bottom: calc(1.5rem + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 4;` (on Home v1, `.home-hint` uses `position: fixed; left: calc(50% - min(25%, calc(var(--layout-max-width) / 4)));` on desktop/tablet and `left: 50%` on mobile `≤ 768px`, keeping it centered in the left text column across all viewport widths).
  - `.home-footer-dock`: under `@media (prefers-reduced-motion: no-preference)`, `position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; transform: translateY(100%);`. Slides to `yPercent: 0` in parallel with Section 4's intro and back to `yPercent: 100` when leaving Section 4; `inert` whenever Section 4 is not active.

### 5.4 Home v1 (`src/pages/index.astro`) Layout Alignment

To run the same unified edge-gated `window` scroll on Home v1 without changing its visual appearance:

- `.hero-sticky-wrapper`: `min-height: 100dvh` (instead of fixed `height: 100dvh; overflow: hidden`), keeping `display: grid; grid-template-columns: 1fr 1fr; max-width: 1400px; margin: 0 auto;`.
- `.hero-section`: when `html.home-snap-active` (or during Phase 1), `.hero-section:not(.is-active)` is `display: none`; `.hero-section.is-active` is `position: relative; min-height: 100dvh; height: auto; overflow: clip;`.
- `.hero-video-col`: `position: sticky; top: 0; height: 100dvh;` on desktop/tablet so the right-hand hero image/video remains pinned if the left column ever exceeds `100dvh`; on mobile (`≤ 768px`), `position: fixed; inset: 0; z-index: 1; opacity: 0.2; pointer-events: none;`.
- Under `@media (prefers-reduced-motion: reduce)`, all `.hero-section` and `.oferta-section` blocks flow statically in document order (`position: relative; display: flex; visibility: visible; pointer-events: auto;`), dots are hidden, and `.home-footer-dock` sits statically in normal flow at the bottom of `<main>`.

## 6. Lifecycle & Reduced Motion (`src/pages/oferta.astro`)

- **Init (`astro:page-load`):**
  - Guarded by `const sections = gsap.utils.toArray<HTMLElement>('.oferta-section'); if (!root || sections.length === 0) return;`.
  - Runs `stopOfertaAnimation()` first to ensure idempotency.
  - If `motionQuery.matches` (`prefers-reduced-motion: reduce`): calls `showStaticOferta()` (removes `inert` from `.home-footer-dock`, ensures all `.oferta-section`, `.word`, and `.blur-in` elements have cleared inline transforms/filters/opacity).
  - Otherwise: ensures `sections[0]` has `.is-active` and cleared inline props on its elements, builds `buildSectionTimeline(computeSectionData(sections))`, and mounts `mountSnapNavigator(root, timeline)`.
- **Teardown (`astro:before-swap` & live `motionQuery` change):**
  - When leaving `/oferta` (checked via `isOfertaPage()` before swap) or when `prefers-reduced-motion: reduce` turns on dynamically, calls `stopOfertaAnimation()`, invoking `teardownSnap()` (kills active transition & master timeline, aborts all listeners, disconnects `ResizeObserver`s, removes `html.home-snap-active`, resets footer dock props and `inert`).
  - Window flags (`window.ofertaPageLoadListenerAdded`, `window.ofertaPageBeforeSwapListenerAdded`, `window.ofertaMotionQueryListenerAdded`) prevent duplicate global listeners across Astro client-side navigations.

## 7. Verification Plan

*(Note per `AGENTS.md`: do not run Playwright E2E tests automatically unless explicitly requested by the user.)*

- Static checks: `npx astro check` and `npm run build` succeed with zero TypeScript or build errors.
- Git diff verification: `git diff src/pages/oferta/v2.astro src/components/offer/` is completely empty.
- Behavioral checklist (desktop, tablet, mobile viewports + reduced motion):
  - `/oferta` opens immediately on Section 1 (`Smaki`) with no entrance delay; `FlavorSelector` radio buttons (desktop) and `<details>` accordion (mobile, including `Space` key on `<summary>`) work natively without triggering section transitions.
  - On sections fitting within `100dvh`, a single wheel gesture, vertical swipe, `ArrowDown`/`PageDown`/`Space`, `SectionDots` click, or `ScrollHintArrow` click plays the exact Home v1 word/blur-in cascade outro → intro at `SNAP_MS_PER_WU`.
  - On sections taller than `100dvh` (e.g., mobile `FlavorSelector` with an open accordion or `CakeSizeGuide`), scrolling moves the whole page (`window`) with no inner scrollbar; reaching the bottom edge does not prematurely fire a transition mid-scroll, and the next downward scroll gesture triggers the transition and opens the target section at `scrollY = 0`.
  - Transitioning to Section 5 (`Dodatkowa oferta`) slides `.home-footer-dock` in parallel and makes `Footer` (including `DesignSystemTooltip`) interactive; leaving Section 5 slides it back out.
  - Navigating between `/` ↔ `/oferta` ↔ `/oferta/v2` via View Transitions mounts and tears down cleanly with no leaked listeners or scroll locks.
