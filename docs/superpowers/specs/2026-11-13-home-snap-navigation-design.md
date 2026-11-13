# Home Page: Snap Section Navigation

**Date:** 2026-11-13
**Status:** Draft, awaiting user review; implementation pending
**Related:** `DESIGN.md`, `src/pages/index.astro`, `src/config/animation.ts`,
`docs/architecture/word-based-scroll-animation-system.md`,
`docs/superpowers/specs/2026-11-12-home-v2-stack-fade-design.md` (v2 input
and footer dock)

## 1. Purpose and Decision

The home page (`/`, "v1") currently maps scroll position 1:1 onto a scrubbed
GSAP timeline (ScrollTrigger pin, `scrub: 1`), so the user must keep
scrolling until a section's animation completes. Replace this with **snap
navigation**: a scroll gesture longer than a threshold triggers a
transition, and the transition then plays by itself, at a fixed configurable
speed, to the next section's fully-visible state. How fast or how far the
user scrolls does not matter; scrolling only triggers.

**The visual experience must not change.** Every word/blur-in tween, its
timing (WU cascade, `DURGAP`), and the backward visual (today's "scroll up"
look) stay exactly as they are. Only the driver changes: time instead of
scroll position.

Rejected alternative: building separate time-based intro/outro timelines
per section. It duplicates the existing timeline construction and risks
visual drift from today.

## 2. Core Mechanism: Time-Driven Master Timeline

Keep the existing master timeline exactly as `buildScrollTimeline` builds it
today (same tweens, same positions in pixel units, same
`computeSectionData`), but **without a ScrollTrigger**: it is created
paused and never driven by scroll.

### 2.1 Reference positions (timeline units = px, as today)

For section `i` with `secStart = sectionStarts[i]`, `introSpan`, and
`HOLD_PX = HOLD × PX_PER_WU`:

| Name | Section 0 | Section i > 0 |
|---|---|---|
| `rest(i)` — fully visible, resting point | `0` | `secStart + introSpan` |
| `outroStart(i)` — first frame of outro | `0` | `secStart + introSpan + HOLD_PX` |
| `outroEnd(i)` — section hidden | `sectionStarts[1]` | `sectionStarts[i + 1]` |

The last section has no outro. The hold range (`rest` → `outroStart`) has
no tweens, so seeking across it is visually instant and invisible.

### 2.2 Transitions

A transition is a GSAP timeline that plays segments of the master timeline
with `masterTl.tweenFromTo(a, b, { duration, ease: SNAP_EASE })` and
instant `masterTl.seek(x)` jumps between them.

**Forward, `from` → `to` (`to > from`):**

1. Seek to `outroStart(from)` (instant; crosses the hold).
2. Play `outroStart(from)` → `outroEnd(from)`: the outro of `from`.
3. If `to > from + 1`: seek to `sectionStarts[to]` (instant). Intermediate
   sections are never shown: at that position they are already in their
   post-outro (hidden) state.
4. Play `sectionStarts[to]` → `rest(to)`: the intro of `to`.

**Backward, `from` → `to` (`to < from`):** the reverse, so the visual equals
today's scroll-up:

1. Play `rest(from)` → `sectionStarts[from]`: the intro of `from` in reverse.
2. If `to < from - 1`: seek to `outroEnd(to)` (instant).
3. Play `outroEnd(to)` → `outroStart(to)`: the outro of `to` in reverse.
4. Seek to `rest(to)` (instant; crosses the hold).

Adjacent steps and jumps (`Home`/`End`, §3) use the same procedure;
adjacent steps simply skip the extra seek. The controller exposes this as
an internal `goTo(index)`.

### 2.3 Speed

Speed is set by **one constant, `SNAP_MS_PER_WU`** in
`src/config/animation.ts` (§8): the number of milliseconds each Word Unit of
timeline length takes to play. Segment duration depends only on segment
length:

```
duration_s = (|b − a| / PX_PER_WU) × SNAP_MS_PER_WU / 1000
```

- Lower value = faster, higher = slower; halving it doubles the speed.
- Changing it affects every transition (forward, backward, jumps) and the
  footer dock slide (§6) proportionally, and nothing else.
- It is independent of `MS_PER_WU` (Phase 1 intro) and `PX_PER_WU`
  (timeline units). Its initial value equals `MS_PER_WU`, so transitions
  start at the same speed as the first-visit intro.

### 2.4 Active section

`is-active` is derived from the master timeline position with today's
lookup (first section whose range `[sectionStarts[k], sectionStarts[k] + sw[k])`
contains the position). It is re-applied on every master timeline render,
including instant seeks, so it switches directly from `from` to `to` on
jumps.

## 3. Input

The document never scrolls on the home page while snap navigation is
mounted (§6). Input only *requests* transitions:

- **Wheel / trackpad and vertical touch swipe.** A *gesture* is one touch
  (touchstart → touchend), or a run of wheel events without a
  `WHEEL_QUIET_MS` gap. Vertical distance (wheel `deltaY` normalised to px;
  finger travel for touch) is accumulated per gesture. When it exceeds
  `TRIGGER_PX`, one transition to the adjacent section in that direction is
  requested and the rest of that gesture is ignored. A new gesture starts
  from zero, so tiny nudges never add up to a trigger. Horizontal-dominant
  movement (|dx| > |dy|) does not count, so the gallery strip and
  testimonials carousel keep their horizontal swipes.
- **Keyboard** (ignored when focus is in an editable field, or when a
  modifier key other than Shift is held):
  - `ArrowDown`, `PageDown`, `Space` → next
  - `ArrowUp`, `PageUp`, `Shift+Space` → previous
  - `Home` → first section, `End` → last section
  - `Space` on a focused button keeps its native activation.
- **Locking.** Input is ignored (not queued) while a transition plays,
  while the Phase 1 intro plays, and while the mobile navigation drawer
  is open. Requests for the current section, before the first or past the
  last section are no-ops.

## 4. Lifecycle and Session State

- **Phase 1** (first visit, `window.hasSeenIntro` unset) is unchanged: the
  time-based intro of section 0, including the hero video readiness check.
  When it completes, it clears section 0's inline styles, sets
  `hasSeenIntro`, builds the paused master timeline at position 0, and
  mounts snap navigation.
- **Subsequent visits:** section 0 is shown in its final state, the master
  timeline is built at 0, and snap navigation is mounted immediately.
- "Phase 2" (scroll-driven timeline) is replaced by snap navigation.
- Init runs on `astro:page-load` only when `.hero-section` elements exist
  (note: `o-mnie.astro` also uses `#hero-scroll-container`, so that ID alone
  is not a home-page signal).
- **Teardown** on `astro:before-swap` (when the home page is mounted): kill
  the running transition, the master timeline and the pending Phase 1
  `delayedCall`, remove all listeners (single `AbortController`), disconnect
  the `ResizeObserver`, clear the testimonials auto-play interval, remove
  the page-lock class, and clear GSAP inline styles on the footer dock.
- Every mount starts at section 0 with the footer hidden.
- Focus: sections get `tabindex="-1"`. If focus was inside the outgoing
  section, focus moves to the new active section when the transition
  completes.

## 5. Layout

- On mount, snap navigation adds `home-snap-active` to `<html>`; teardown
  removes it. Under that class `html` and `body` get `overflow: hidden` and
  `overscroll-behavior: none`. During Phase 1 the existing inline overflow
  lock applies as today.
- The `.hero-sticky-wrapper` stays a `100dvh` grid; it is no longer pinned.
  Section markup, content and padding are unchanged apart from
  `tabindex="-1"` (§4) and the last section's footer padding (§6).

## 6. Footer

- The shared `<Footer />` moves into a full-width `.home-footer-dock` at the
  end of `<main>`. Under `@media (prefers-reduced-motion: no-preference)`
  the dock is `position: fixed` at the viewport bottom, translated fully
  below the viewport (`transform: translateY(100%)`, as in v2), and
  rendered `inert`. This holds from first paint, including during Phase 1.
- When a transition targets the last section, the dock slides up
  (`yPercent: 0`) in parallel with the last section's intro segment, with
  the same duration. When a transition leaves the last section, it slides
  down in parallel with the reversed intro segment. The dock is interactive
  only while the last section is active.
- The last section reserves bottom padding equal to the dock height
  (`--home-footer-h`, measured with a `ResizeObserver`).
- Under `prefers-reduced-motion: reduce` (§7) the dock is static, in normal
  flow and not `inert`, as the footer is today.

## 7. Reduced Motion

Keep today's behaviour: when `prefers-reduced-motion: reduce` matches (at
init or on change), snap navigation is not mounted (or is torn down) and
`makeAllSectionsVisible()` runs as now. No page lock; footer in normal flow
(CSS media query; teardown also removes the dock's `inert` and inline
styles). Improving this is out of scope.

## 8. Configuration (`src/config/animation.ts`)

New constants, added in a "Snap navigation" group, each with a one-line
comment like the existing constants:

| Constant | Initial value | Meaning |
|---|---|---|
| `SNAP_MS_PER_WU` | `250` | **Transition speed** (§2.3): ms per WU of timeline length. Lower = faster |
| `SNAP_EASE` | `'none'` | Ease applied to each played segment |
| `TRIGGER_PX` | `60` | Vertical gesture distance needed to trigger a transition |
| `WHEEL_QUIET_MS` | `150` | Wheel silence that separates two gestures |

`SNAP_MS_PER_WU` is a plain number literal (not derived from `MS_PER_WU`),
so it can be tuned on its own. Existing constants keep their values.
`PX_PER_WU` and `HOLD` remain the units of the master timeline; `HOLD` no
longer has a visible effect.

## 9. File Boundaries

| File | Change |
|---|---|
| `src/home/sectionTimeline.ts` | New: `computeSectionData`, paused master timeline, `rest`/`outroStart`/`outroEnd`, active-section lookup — moved from `index.astro`, ScrollTrigger removed |
| `src/home/snapNavigator.ts` | New: `mountSnapNavigator(root, …)` → teardown; state, input, transitions, footer dock, page lock |
| `src/config/animation.ts` | Add §8 constants |
| `src/pages/index.astro` | Markup (footer dock, section `tabindex`), styles (page lock, dock, last-section padding), script reduced to Phase 1, mount/teardown, reduced-motion handling, testimonials |
| `docs/architecture/word-based-scroll-animation-system.md` | Describe time-driven playback replacing the scroll mapping |
| `AGENTS.md` | Update the home-page animation notes (Phase 2, cleanup) |

Not modified: `src/pages/v2.astro`, `src/home-v2/*`, `src/components/*`,
`Layout.astro`, tests.

The home page no longer imports or registers ScrollTrigger; it uses the
GSAP Observer plugin (or plain listeners) for input. The
`window.ScrollTrigger` E2E hook is removed.

## 10. Known Gaps and Boundaries

- **Tests are out of scope** and will be updated in a separate session.
  Expected to break: `tests/e2e/landing-page/section-0-scroll.spec.ts`,
  `section-0-scroll-half-wu.spec.ts`, `section-0-simulation.ts`,
  `cleanup-on-leave.spec.ts` (ScrollTrigger counts), likely
  `homepage-listener.spec.ts` and `motion-query-listener.spec.ts`, and
  `tests/e2e/helpers/scroll.ts`. Do not run tests unless asked.
- Sections taller than the viewport (very short screens) stay clipped as
  today; no inner scroll.
- No URL hash per section.
- Reduced-motion layout (overlapping sections) is unchanged.
- The testimonials carousel keeps its current init (module level, once).
