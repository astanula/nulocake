# Snap Pages: Scroll Hint Clearance & Container-Bottom Anchoring on Tall Sections

**Date:** 2026-11-14
**Status:** Proposed
**Depends on:** `docs/superpowers/specs/2026-11-13-section-dots-scroll-hint-design.md`, `docs/superpowers/specs/2026-11-14-oferta-snap-navigation-design.md`
**Related:** `DESIGN.md`, `AGENTS.md`, `src/styles/global.css`, `src/pages/oferta.astro`, `src/pages/index.astro`, `src/home/snapNavigator.ts`, `src/config/animation.ts`, `docs/architecture/word-based-scroll-animation-system.md`

## 1. Problem & Goal

On snap-navigated pages (`/oferta` and `/`), when an active non-last section exceeds `100dvh` (for example, Sections 1, 2, and 3 on `/oferta` on mobile, or any section on compact tablet/desktop viewports or browser zoom), the user scrolls `window` down to read the bottom of the section. Currently, two things prevent `ScrollHintArrow` from appearing at the bottom of tall sections:

1. **Insufficient bottom clearance:** Non-last sections use `padding-bottom` of `3.5rem` (`56px`, mobile/tablet) or `4.5rem` (`72px`, desktop) on `/oferta` and `3rem` (`48px`) / `4rem` (`64px`) on `/`, whereas `ScrollHintArrow` (`height: 3rem` mobile, `3.75rem` desktop/tablet) positioned at `bottom: 1.5rem` plus `SCROLL_HINT_GAP_PX` (`8px`) requires at least `80px` (mobile) or `92px` (desktop/tablet). Even at maximum scroll (`window.scrollY === maxScroll`), `fitsAboveHint()` never turns `true`, leaving the bottom of the section visually indistinguishable from the end of the page.
2. **Viewport-fixed positioning (`position: fixed`):** Even with larger bottom padding, a `position: fixed` hint stays invisible until the final pixels of scroll and then fades in over `0.3s` in place rather than scrolling naturally into view with the bottom of the section.

### Goal

Across **desktop, tablet, and mobile** on both **`/oferta`** (`src/pages/oferta.astro`) and **`/`** (`src/pages/index.astro`):

- Reserve bottom clearance on every non-last section (under `prefers-reduced-motion: no-preference`) so that whenever section content approaches or exceeds `100dvh`, the section automatically grows tall enough to fit `ScrollHintArrow` with editorial breathing room below the last content block.
- Anchor the single `<ScrollHintArrow />` instance with `position: absolute` at the bottom of the active section's flow container (`.oferta-container` on `/oferta`, `.hero-text-col` on `/`):
  - **Sections fitting within `100dvh`:** Container height equals `100dvh`, so the hint sits `1.5rem + env(safe-area-inset-bottom)` above the bottom of the viewport immediately (unchanged visual placement).
  - **Sections exceeding `100dvh`:** Container height equals the active section's full natural height (including bottom clearance), so as the user scrolls down past the section's CTA/content, the scroll hint arrows scroll smoothly into view from the bottom edge of the screen, signaling that another section follows.
  - **Last section (`--last`):** Hint remains hidden (`is-hidden` + `inert`) while `.home-footer-dock` slides in; `--last` keeps its existing footer-dock bottom padding.

## 2. Non-Negotiable Constraints

1. **Untouched Components & Pages:**
   - Do not modify `src/components/stack-fade/ScrollHintArrow.astro`, `src/components/section-nav/SectionDots.astro`, `src/pages/v2.astro`, `src/home-v2/*`, `src/pages/oferta/v2.astro`, or `src/components/offer/*`.
2. **Single `<ScrollHintArrow />` Instance per Page:**
   - Keep one `<ScrollHintArrow />` element per snap page outside individual `<section>` elements so asymmetric left/right section padding (used to clear `SectionDots`) never shifts the hint off horizontal center, and `snapNavigator.ts` continues managing a single `[data-scroll-hint]` button.
3. **Reduced-Motion Preservation:**
   - Under `prefers-reduced-motion: reduce`, snap navigation is not mounted and `.oferta-hint` / `.home-hint` remain `display: none`. Extra hint-clearance `padding-bottom` applies **only** inside `@media (prefers-reduced-motion: no-preference)` so static reduced-motion pages retain their existing inter-section spacing (`4.5rem`/`3.5rem` on Oferta, `4rem`/`3rem` on Home).

## 3. Architecture & File Boundaries

| File | Change |
|---|---|
| `src/styles/global.css` | Add shared scroll-hint layout tokens (`--scroll-hint-bottom`, `--scroll-hint-height`, `--scroll-hint-gap`, `--scroll-hint-clearance`) on `:root`, updating `--scroll-hint-height` at `@media (max-width: 768px)` to match `ScrollHintArrow.astro`. |
| `src/pages/oferta.astro` | Add `position: relative` to `.oferta-container`; switch `.oferta-hint` from `position: fixed` to `position: absolute` using `--scroll-hint-bottom`; apply `padding-bottom: var(--scroll-hint-clearance)` to `.oferta-section:not(.oferta-section--last)` under `@media (prefers-reduced-motion: no-preference)`. |
| `src/pages/index.astro` | Switch `.home-hint` (already inside `position: relative` `.hero-text-col`) from `position: fixed` to `position: absolute; left: 50%` using `--scroll-hint-bottom` and remove the redundant mobile `left: 50%` override; apply `padding-bottom: var(--scroll-hint-clearance)` to `.hero-section:not(.hero-section--last)` under `@media (prefers-reduced-motion: no-preference)`. |
| `src/home/snapNavigator.ts` | Simplify `updateHint()` to `if (!transition) setHint(current !== last)` (removing `fitsAboveHint`, `hintObserver`, and scroll-time `updateHint()` calls); refine post-transition focus restoration when `focusWasOnHint` so focus stays on `hint` only when the destination section fits in the viewport (`maxScroll() <= EDGE_EPSILON_PX`) and moves to `sections[to]` when `hint` sits below the fold on a tall section. |
| `src/config/animation.ts` | Remove unused `SCROLL_HINT_GAP_PX` constant (no longer needed by `snapNavigator.ts`; `src/home-v2/config.ts` retains its own separate constant for `v2.astro`). |
| `docs/architecture/word-based-scroll-animation-system.md` | Update Constants table and Edge-Gated Input § Scroll hint note to reflect container-bottom anchoring and CSS `--scroll-hint-clearance`. |
| `AGENTS.md` | Briefly note container-anchored scroll hint clearance under Shared Snap Navigation. |

## 4. Layout & Styling Specification

### 4.1 Design Tokens (`src/styles/global.css`)

`ScrollHintArrow.astro` renders `.scroll-hint` with `height: 1.5em` at `font-size: 2.5rem` (`3.75rem` = `60px`) above `768px` and `font-size: 2rem` (`3rem` = `48px`) at `max-width: 768px`. Define matching layout tokens in `:root`:

```css
/* Snap pages — scroll hint bottom offset, height & content clearance */
--scroll-hint-bottom: 1.5rem;
--scroll-hint-height: 3.75rem; /* 1.5em at 2.5rem font-size */
--scroll-hint-gap: 2rem;       /* matches .section-cta-group top margin */
--scroll-hint-clearance: calc(
  var(--scroll-hint-bottom) + var(--scroll-hint-height) + var(--scroll-hint-gap) + env(safe-area-inset-bottom)
);
```

Inside the existing `@media (max-width: 768px)` `:root` block:

```css
--scroll-hint-height: 3rem; /* 1.5em at 2rem font-size */
```

Resulting bottom clearance on non-last sections (`safe-area-inset-bottom = 0px`):
- **Desktop (`>= 1025px`) & Tablet (`769px – 1024px`):** `1.5rem + 3.75rem + 2rem = 7.25rem` (`116px`)
- **Mobile (`<= 768px`):** `1.5rem + 3rem + 2rem = 6.5rem` (`104px`)

### 4.2 Container Anchoring & Section Clearance

1. **Oferta (`src/pages/oferta.astro`):**
   - `.oferta-container`: add `position: relative;` (no `transform`/`filter`, so `position: fixed` `.oferta-dots` and `.home-footer-dock` remain viewport-fixed). Because inactive `.oferta-section:not(.is-active)` elements are `display: none` and all other siblings are out-of-flow, `.oferta-container` height always equals the active `.oferta-section`'s exact rendered height (`max(100dvh, naturalSectionHeight)`).
   - `.oferta-hint`:
     ```css
     .oferta-hint {
       position: absolute;
       left: 50%;
       bottom: calc(var(--scroll-hint-bottom) + env(safe-area-inset-bottom));
       transform: translateX(-50%);
       z-index: 4;
     }
     ```
   - Inside `@media (prefers-reduced-motion: no-preference)`:
     ```css
     .oferta-section:not(.oferta-section--last) {
       padding-bottom: var(--scroll-hint-clearance);
     }
     ```
     Because `.oferta-section:not(.oferta-section--last)` has specificity `(0, 2, 0)`, it overrides the base, tablet, and mobile `.oferta-section` `padding` shorthand (`(0, 1, 0)`) across all viewports while leaving `.oferta-section--last` (`padding-bottom: calc(... + var(--home-footer-h))`) and `@media (prefers-reduced-motion: reduce)` untouched.

2. **Home (`src/pages/index.astro`):**
   - `.hero-text-col` already has `position: relative; min-height: 100dvh; z-index: 2;` and stretches to the active `.hero-section`'s height while `.hero-video-col` stays `height: 100dvh; align-self: start; position: sticky` (desktop/tablet) or `position: fixed` (mobile).
   - `.home-hint`:
     ```css
     .home-hint {
       position: absolute;
       left: 50%;
       bottom: calc(var(--scroll-hint-bottom) + env(safe-area-inset-bottom));
       transform: translateX(-50%);
       z-index: 4;
     }
     ```
     Because `.hero-text-col` is the left column on desktop/tablet and full-width `1fr` on mobile, `left: 50%` centers `.home-hint` across all breakpoints without viewport-width math or mobile media-query overrides.
   - Inside `@media (prefers-reduced-motion: no-preference)`:
     ```css
     .hero-section:not(.hero-section--last) {
       padding-bottom: var(--scroll-hint-clearance);
     }
     ```

## 5. Navigator Behavior & Accessibility (`src/home/snapNavigator.ts`)

1. **Visibility Lifecycle:**
   - Structural CSS clearance guarantees at least `--scroll-hint-gap` (`2rem`) between the active section's content and `.scroll-hint` at every viewport size and dynamic content state (including open mobile `<details>` accordions in `FlavorSelector`, which expand `.oferta-section` and push `.oferta-container`'s bottom edge down synchronously in layout).
   - `updateHint()` simplifies to:
     ```ts
     const updateHint = () => {
       if (!transition) setHint(current !== last);
     };
     ```
   - Remove `fitsAboveHint()`, `hintObserver` (`ResizeObserver`), and the `updateHint()` call inside the `window` `scroll` listener, eliminating layout reads during native scrolling.
   - During any transition (`goTo`), `setHint(false)` hides and marks `hint` `inert` immediately; `onComplete` calls `updateHint()`, fading `hint` back in on sections `0 .. last - 1` (immediately visible in the viewport for short sections, or waiting at the bottom of the section for tall sections).
   - On Home (`/`), during Phase 1 intro before `mountSnapNavigator` runs, `<ScrollHintArrow />` remains hidden via its server-rendered `is-hidden` class and `inert` attribute.

2. **Keyboard Focus Restoration:**
   - If a keyboard user activates `[data-scroll-hint]` (`focusWasOnHint === true`), `enter()` resets `window.scrollTo(0, 0)` for the incoming section `to`.
   - On `onComplete`:
     - If `hint` is active (`!hint.inert`, i.e. `to !== last`) **and** the incoming section fits within the viewport (`maxScroll() <= EDGE_EPSILON_PX`), restore `hint.focus({ preventScroll: true })` so sequential keyboard stepping continues seamlessly.
     - Otherwise (either `to === last`, where `hint` is `inert`, or `maxScroll() > EDGE_EPSILON_PX`, where `hint` sits off-screen below the fold at the bottom of a tall section), call `sections[to].focus({ preventScroll: true })` so keyboard focus starts cleanly at the top of the incoming section rather than on an off-screen control.

## 6. Verification Plan

*(Note per `AGENTS.md`: never run Playwright E2E tests automatically unless explicitly requested by the user.)*

- Static verification: `npx astro check` and `npm run build` pass with zero errors.
- Boundary verification: `git diff src/components/stack-fade/ScrollHintArrow.astro src/pages/v2.astro src/home-v2/ src/pages/oferta/v2.astro src/components/offer/` is empty.
- Responsive & behavioral checks (desktop, tablet, mobile, plus `prefers-reduced-motion: reduce`):
  - `/oferta` Sections 1–3 on mobile (including with a `FlavorSelector` accordion item expanded) and on compact tablet/desktop viewports scroll smoothly down to reveal `ScrollHintArrow` with `2rem` gap below the CTA button and `1.5rem` below the arrow; clicking the arrow or performing a settled downward swipe/wheel/key gesture transitions to the next section at `scrollY = 0`.
  - Sections fitting within `100dvh` (e.g. `/oferta` Section 4 on desktop and `/` sections on standard desktop) remain `100dvh` with no scrollbar and display `ScrollHintArrow` centered at `1.5rem` above the viewport bottom.
  - Section 5 (`Dodatkowa oferta` on `/oferta`, `Kontakt` on `/`) keeps `ScrollHintArrow` hidden and `inert` while `.home-footer-dock` slides in.
  - Under `prefers-reduced-motion: reduce`, all sections stack statically with unchanged bottom padding and hidden `ScrollHintArrow`.
