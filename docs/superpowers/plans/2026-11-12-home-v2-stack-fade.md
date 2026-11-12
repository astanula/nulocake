# Home Page v2: Stack Fade

**Specification:** `docs/superpowers/specs/2026-11-12-home-v2-stack-fade-design.md`
**Status:** Implemented; awaiting manual browser verification by the user

Each phase ends in a buildable state. No existing file is modified; only the
files listed in spec §2 are created. Do not run tests.

## 1. Static Page and Layout

Create `src/pages/v2.astro` using `Layout`, `Navigation`, and `Footer`:

- Root `<main class="v2-root">` with the split-screen grid: left `.v2-stage`,
  right `.v2-media` (static `hero-poster.webp` + glow). Copy v1's responsive
  rules for tablet and mobile, renamed to `v2-` classes.
- Five `<section class="v2-section" data-v2-label="…">` elements with v1
  content copied verbatim, `.word` spans removed, `accent-italic` kept, IDs
  prefixed (`v2-section-hero`, `v2-cta-oferta`, …). Testimonials carousel uses
  `#v2-testimonials`, `#v2-carousel-prev`, `#v2-carousel-next`; drop
  `.blur-in` classes.
- `<nav class="v2-dots" aria-label="Sekcje">` with one `<button>` per section
  (label span inside, `aria-label` = label).
- `<div class="v2-footer-dock" inert><Footer /></div>`.
- Scoped styles: stacked absolute sections with `overflow-y: auto`, hidden
  scrollbar styling consistent with v1, top fade mask on the stage, dot and
  label styles (pink active, outline inactive, label on hover/focus-visible),
  mobile dot sizing, last-section `padding-bottom: var(--v2-footer-h)`,
  footer dock fixed bottom translated off-screen.
- `:global` rules: `html.v2-locked, html.v2-locked body { overflow: hidden }`
  and `body:has(.v2-root)` overrides undoing `scroll-layout-active` (fixed
  nav, auto body height, block display).
- Without JS: section 0 visible, others hidden by CSS default classes, so the
  page renders sensibly.

Check: `npm run build`; `/nulocake/v2/` is emitted and v1 output is unchanged.

## 2. Configuration and Carousel

- `src/home-v2/config.ts`: constants from spec §5.
- `src/home-v2/testimonialsCarousel.ts`: v1 carousel logic ported to a
  function `initTestimonials(root): () => void` that returns a teardown
  (clears interval, aborts listeners via `AbortController`). Targets v2 IDs.

## 3. Stack Fade Controller

`src/home-v2/stackFade.ts` exporting `mountStackFade(root): () => void`.

State: `sections[]`, `dots[]`, `footerDock`, `active`, `animating`,
`lastInnerScroll` timestamp, `reducedMotion`, current timeline.

Core:

- `setActive(index)`: toggles `is-active`, `inert`, `visibility`, dot
  `aria-current`, footer `inert` (only when last is active).
- `goTo(target, { force })`: no-op when animating or target is current or out
  of range. Builds one `gsap.timeline` with `defaults` from config:
  - Forward: show target, set `zIndex` above, set `scrollTop = 0`,
    `fromTo(target, { yPercent: 100 }, { yPercent: 0 })` and
    `to(current, { scale: SCALE_PAST, opacity: OPACITY_PAST })` at `0`.
  - Backward: show target at `scale: SCALE_PAST, opacity: OPACITY_PAST`
    beneath, set `scrollTop = max`, `to(current, { yPercent: 100 })` and
    `to(target, { scale: 1, opacity: 1 })` at `0`.
  - Footer: if target is last, `to(footer, { yPercent: 0 })` at `0`; if
    current is last, `to(footer, { yPercent: 100 })` at `0`.
  - Reduced motion: opacity-only tweens of `REDUCED_MOTION_S` for sections
    and footer.
  - Dots update at timeline start; `onComplete` hides and resets the old
    section (`clearProps`), calls `setActive`, clears `animating`.
- `atEdge(dir)`: bottom/top check within 2px and
  `performance.now() - lastInnerScroll >= EDGE_GUARD_MS`.
- `step(dir)`: `if (atEdge(dir)) goTo(active + dir)`.

Input:

- `Observer.create({ target: window, type: 'wheel,touch', tolerance,
  onDown/onUp })` mapped so wheel-down and swipe-up mean "next". Do not call
  `preventDefault` so inner native scrolling keeps working.
- Passive `scroll` listener on each section updates `lastInnerScroll`.
- `keydown` on `document`: skip editable targets; ArrowDown/PageDown/Space →
  next, ArrowUp/PageUp/Shift+Space → previous (if not at edge, smooth-scroll
  the active section by 80% of its height; else `step`); Home/End →
  `goTo(0|last, { force })`. `preventDefault` for handled keys.
- Dot `click` → `goTo(index, { force })`.
- `ResizeObserver` on the footer dock writes `--v2-footer-h` on the root.
- `matchMedia('(prefers-reduced-motion: reduce)')` change updates
  `reducedMotion`.

Teardown returned by `mountStackFade`: kill Observer and timeline, abort
listeners (`AbortController`), disconnect `ResizeObserver`, `clearProps` on
sections and footer, remove `html.v2-locked`.

## 4. Page Wiring and Lifecycle

In the `<script>` of `v2.astro`:

- Register `Observer` with GSAP.
- On `astro:page-load`: if `.v2-root` exists, add `html.v2-locked`, call
  `mountStackFade` and `initTestimonials`, store teardowns.
- On `astro:before-swap`: run stored teardowns if present.
- Guard both document listeners with `window.homeV2PageLoadAdded` /
  `window.homeV2BeforeSwapAdded` (typed via `declare global` in
  `stackFade.ts`).
- Never create or kill ScrollTrigger instances.

## 5. Verification and Handoff

- `npm run build` and `git diff --check`; `astro check` limited to new files
  (existing errors elsewhere are known).
- Start the dev server and open `/nulocake/v2/` in the browser preview for the
  user to check: wheel/trackpad, keys, dots + labels, tall-section inner scroll
  (shrink the window height), footer with last section, mobile width swipe,
  reduced motion, navigation v2 → subpage → v2 and v1 → v2 → v1 without
  console errors or stuck overflow.
- Confirm `git status` shows only new files plus docs.
- Commit after the user confirms behaviour.
