# Home Page v2: Stack Fade Section Navigation

**Date:** 2026-11-12
**Status:** Design approved in conversation; implementation pending
**Related:** `DESIGN.md`, `src/pages/index.astro`,
`docs/architecture/word-based-scroll-animation-system.md`
**Reference:** https://alvarotrigo.com/fullPage/extensions/stack-fade-effect

## 1. Purpose and Decision

Create an alternative home page at `/nulocake/v2` that replaces v1's
scroll-scrubbed word animation with a fullPage-style **stack fade**: discrete,
snap-based section changes on the left column. v1 stays untouched. v2 must be
removable by deleting its own files, with no leftovers in shared code.

Use the GSAP **Observer** plugin (bundled in the installed `gsap` package) to
detect wheel, touch, and keyboard intent, and play one fixed-duration GSAP
timeline per section change. Do not use ScrollTrigger; v2 has no scroll
position. Do not use fullPage.js (its Effects extension is a paid licence).

Rejected alternatives:

- ScrollTrigger pin + `snap`: duration depends on scroll velocity, feels
  floaty, and conflicts with inner scrolling of tall sections.
- CSS scroll-snap + scroll-driven animations: `animation-timeline` lacks
  Firefox support; footer and dot synchronisation become awkward.

## 2. File Boundaries

New files only:

| File | Responsibility |
|---|---|
| `src/pages/v2.astro` | Route `/nulocake/v2`; markup, scoped styles, entry `<script>` |
| `src/home-v2/stackFade.ts` | Controller: state, input, transitions, dots, footer, teardown |
| `src/home-v2/testimonialsCarousel.ts` | Copy of v1's testimonials carousel, re-targeted to v2 IDs |
| `src/home-v2/config.ts` | Tunable constants (see §5) |
| `src/components/stack-fade/ScrollHintArrow.astro` | Reusable scroll-down hint arrow, markup and styles only (see §13) |

v2 reuses only site-wide chrome: `Layout.astro`, `Navigation.astro`,
`Footer.astro`, `src/styles/global.css`, `src/utils/withBase.ts`. None of these
are modified. Deleting `src/pages/v2.astro` and `src/home-v2/` removes v2
entirely.

**Namespace rule.** v1's scripts stay registered after a v1 visit (ClientRouter)
and query `.hero-section`, `.word`, `.blur-in`, `#hero-scroll-container`,
`#testimonials-carousel`, `#carousel-prev`, `#carousel-next`. v2 must not use
any of these classes or IDs. All v2 classes and IDs use a `v2-` prefix. v2's
global window flags use a `homeV2` prefix.

## 3. Layout

- Same composition as v1: split screen (`1fr 1fr`, max width 1400px), text on
  the left, static `hero-poster.webp` image with radial glow on the right. No
  video.
- Mobile (≤768px): same as v1 — single column, image as a full-screen
  background at 20% opacity behind the text.
- The left column is a clipped **stage** (`overflow: hidden`) containing five
  `.v2-section` elements absolutely stacked on top of each other.
- Section content is copied from v1 verbatim (hero, story, gallery,
  testimonials, contact), with the per-word `<span class="word">` wrappers
  removed. The `accent-italic` emphasis is kept. Section padding matches v1.
- The document never scrolls while v2 is mounted: `html:has(.v2-root)` sets
  `overflow: hidden` on `html` and `body`, so the lock disappears with the
  v2 DOM on navigation.
- `Layout.astro` adds `body.scroll-layout-active` for any non-home path,
  which would make the nav `position: relative` and lock body height. v2
  neutralises it in its own styles with `:global(body:has(.v2-root))`
  overrides restoring a fixed nav and normal body layout.
- A soft top fade mask on the stage (transparent → opaque over roughly the nav
  height) keeps text scrolled inside a tall section from colliding with the
  transparent nav.

## 4. Section States and Transition

Exactly one section is **active**. Non-active sections are
`visibility: hidden` and `inert`. During a transition, the outgoing and
incoming sections are both visible; only the active section is ever focusable
after the transition completes.

**Forward (index i → j, j > i):**

- Incoming section j: placed above (higher z-index), animates
  `yPercent: 100 → 0` at `opacity: 1, scale: 1`.
- Outgoing section i: stays in place, animates `scale: 1 → SCALE_PAST` and
  `opacity: 1 → 0`.

**Backward (i → j, j < i):** exact reverse — outgoing i animates
`yPercent: 0 → 100` on top; incoming j animates `scale: SCALE_PAST → 1` and
`opacity: 0 → 1` beneath it.

**Jumps (dot clicks, Home/End):** a single direct transition between the
current and target sections, direction derived from the index comparison.
Intermediate sections are not animated.

**Locking:** while a transition plays, all navigation input is ignored (not
queued). Requests to navigate to the current section are no-ops.

## 5. Configuration (`src/home-v2/config.ts`)

| Constant | Initial value | Meaning |
|---|---|---|
| `TRANSITION_S` | `0.9` | Duration of one section change (seconds) |
| `TRANSITION_EASE` | `'power3.inOut'` | Ease for all transition tweens |
| `SCALE_PAST` | `0.9` | Scale of the section being covered |
| `OPACITY_PAST` | `0` | Opacity of the section being covered |
| `EDGE_GUARD_MS` | `200` | Quiet time after inner scroll before an edge counts |
| `WHEEL_QUIET_MS` | `150` | Wheel silence that separates two gestures |
| `EDGE_EPSILON_PX` | `2` | Distance from top/bottom treated as "at edge" |
| `KEY_SCROLL_RATIO` | `0.8` | Inner scroll step for keys, × visible height |
| `REDUCED_MOTION_S` | `0.2` | Crossfade duration under reduced motion |
| `OBSERVER_TOLERANCE` | `10` | Observer gesture tolerance (px) |
| `SCROLL_HINT_GAP_PX` | `8` | Min space between section content and the scroll hint (px) |

## 6. Input

- **Wheel / trackpad** (desktop) and **vertical swipe** (touch): one gesture
  toward "next" or "previous" requests one adjacent section change. A gesture
  is one touch, or a run of wheel events without a `WHEEL_QUIET_MS` gap; each
  gesture can trigger at most one transition, so trackpad inertia that
  outlasts a transition does not trigger a second one.
- Wheel events outside the active section (e.g. over the image) scroll the
  active section.
- Input is ignored while the mobile navigation drawer is open.
- **Keyboard** (ignored when focus is in an editable field):
  - `ArrowDown`, `PageDown`, `Space` → next
  - `ArrowUp`, `PageUp`, `Shift+Space` → previous
  - `Home` → first section, `End` → last section
- Horizontal input is not used for navigation, so the gallery strip and
  testimonials carousel keep their own horizontal and arrow-key behaviour.

## 7. Tall Sections (Inner Scroll)

Each section is its own vertical scroller (`overflow-y: auto`). When the
active section overflows the stage:

- Native scrolling happens inside the section first for wheel and touch.
- Keyboard: because native key scrolling only reaches a focused scroller, the
  controller handles it. When a next/previous key is pressed and the section
  is not at the corresponding edge, smoothly scroll the active section by 80%
  of its visible height in that direction instead of transitioning.
- A "next" request triggers a transition only if the section is scrolled to
  its bottom (within 2px). A "previous" request triggers only at its top.
- **Momentum guard:** if the section emitted a `scroll` event within the last
  `EDGE_GUARD_MS`, or the current gesture started before the section's last
  `scroll` event, the edge does not count yet. The user must start a new
  gesture at the edge. This prevents trackpad inertia from carrying the user
  straight past a section after reaching its edge.
- Landing scroll position: going forward, the incoming section starts at
  `scrollTop = 0`; going backward, it starts at its maximum `scrollTop`, so
  reading continues naturally.
- Dot clicks and Home/End always transition regardless of inner scroll state.
- Keyboard next/previous follows the same edge rules and momentum guard as
  wheel.

## 8. Dots

- A vertical list of buttons inside a `<nav aria-label="Sekcje">`, fixed to
  the left edge of the left column and vertically centred. On mobile the dots
  are smaller and closer to the screen edge.
- One dot per section; labels from section names: *Strona główna*, *O nas*,
  *Galeria*, *Opinie klientów*, *Kontakt*. Each button has an accessible name
  equal to its label.
- The active dot has `aria-current="true"` and the primary pink accent; others
  use the outline colour.
- On hover and `:focus-visible`, the label appears to the right of the dot.
- Clicking a dot runs a jump transition (§4). Dots update when a transition
  starts, so they reflect the destination immediately.
- Section padding must leave room so dots never overlap section content.

## 9. Footer

- Render the shared `<Footer />` inside a full-width dock fixed to the
  viewport bottom, above the stage, initially translated fully below the
  viewport and `inert`.
- When any transition targets the last section (adjacent step or jump), the
  footer slides up in the same timeline with the same duration and ease. When
  a transition leaves the last section, the footer slides down in the same
  timeline. The footer is interactive only while the last section is active.
- The last section reserves bottom padding equal to the footer's height,
  exposed as a CSS custom property measured with a `ResizeObserver`. If its
  content plus footer exceed the viewport, the last section's inner scroll
  (§7) applies.
- The footer overlays the bottom of the right-hand image while visible; this
  is accepted.

## 10. Reduced Motion

When `prefers-reduced-motion: reduce` matches (checked at init and on
change), keep snap navigation, dots, inner scroll, and footer logic, but
replace movement with an opacity-only crossfade of `REDUCED_MOTION_S`. The
footer fades instead of sliding.

## 11. Lifecycle (Astro View Transitions)

- Initialise on `astro:page-load` only when `.v2-root` exists. Register
  document-level listeners once, guarded by `window.homeV2*` flags.
- Initial state on every mount: section 0 active and visible, all others
  hidden and reset, footer hidden, dot 0 active. No intro animation.
- On `astro:before-swap` (when v2 is mounted): kill the Observer and any
  running timeline, remove the keydown listener and section scroll listeners,
  disconnect the `ResizeObserver`, clear the testimonials auto-play interval,
  and clear GSAP inline styles on v2 elements.
- v2 must not create, kill, or depend on ScrollTrigger instances.

## 12. Known Gaps and Boundaries

- The nav's home icon is not highlighted on `/v2` and Layout's skip link
  (`#hero-scroll-container`) has no target there. Fixing either requires
  editing shared files and is out of scope.
- No URL hash per section.
- No first-load intro and no per-element entrance animation inside sections.
- No automated tests in this change. Do not run existing tests unless the
  user asks.
- v1 (`src/pages/index.astro`, `src/config/animation.ts`) and shared
  components are not modified.

## 13. Scroll Hint Arrow

Reference: the sliding arrows (`.fp-arrow-10`) on
https://alvarotrigo.com/fullPage/extensions/cinematic.html, re-implemented
in our own CSS.

- **Component:** `ScrollHintArrow.astro` renders a `<button data-scroll-hint>`
  with an `aria-label` prop (default *Następna sekcja*) and a `class` prop for
  page placement. No script. It is rendered hidden and `inert`, so it never
  shows without the controller. Any page using the stack fade controller gets
  a working hint by placing the component inside the controller's root.
- **Look:** two down chevrons (16px, `--color-on-surface`, pink
  `--color-primary` on hover/`:focus-visible`) slide down and fade on a 2s
  linear loop, offset by 1s. Smaller on mobile. Under reduced motion: one
  static chevron.
- **Placement (v2):** horizontally centred in the left column,
  `bottom: calc(1.5rem + env(safe-area-inset-bottom))`, below the footer dock.
- **Visibility:** shown only when the active section is not the last one and
  its content ends at least `SCROLL_HINT_GAP_PX` above the hint. Tall
  sections never show it, even when scrolled to their bottom; their overflow
  already signals scrolling. Hidden means faded out (0.3s) and `inert`.
  Re-checked when a transition starts (hide only), when it completes, and on
  section or section-content resize. Between two fitting sections it stays
  visible without flicker. No extra section padding is reserved for it.
- **Click:** runs a transition to the next section (§4). It does nothing
  while a transition runs. If the hint had focus and becomes hidden, focus
  moves to the new active section.
