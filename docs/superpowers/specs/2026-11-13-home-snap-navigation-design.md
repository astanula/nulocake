# Home Page: Snap Section Navigation, Dots and Scroll Hint

**Date:** 2026-11-13
**Status:** Draft, awaiting user review; implementation pending
**Related:** `DESIGN.md`, `src/pages/index.astro`, `src/config/animation.ts`,
`docs/architecture/word-based-scroll-animation-system.md`,
`docs/superpowers/specs/2026-11-12-home-v2-stack-fade-design.md` (v2 dots and hint)

## 1. Purpose and Decision

The home page (`/`, "v1") currently maps scroll position 1:1 onto a scrubbed
GSAP timeline (ScrollTrigger pin, `scrub: 1`), so the user must keep
scrolling until a section's animation completes. Replace this with **snap
navigation**: a small scroll gesture triggers a transition, and the
transition then plays by itself at a fixed speed to the next section's
fully-visible state.

On top of snap navigation, add the two controls from v2:

- **Section dots** on the left edge (click = jump to that section).
- **Scroll hint arrow** at the bottom (click = next section).

Both are reusable components so other pages can adopt them later.

**The visual experience must not change.** Every word/blur-in tween, its
timing (WU cascade, `DURGAP`), and the backward visual (today's "scroll up"
look) stay exactly as they are. Only the driver changes: time instead of
scroll position.

Rejected alternatives:

- Dots/hint on top of the scrubbed timeline (smooth or instant scroll to a
  section): a jump from section 1 to 3 would visibly play through section 2,
  and the code would be thrown away by the snap rework.
- Building separate time-based intro/outro timelines per section: duplicates
  the existing timeline construction and risks visual drift from today.

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

Adjacent steps and dot jumps use the same procedure; adjacent steps simply
skip the extra seek.

### 2.3 Speed

Segment duration depends only on the segment length, never on how fast or
how far the user scrolled:

```
duration_s = (|b − a| / PX_PER_WU) × SNAP_MS_PER_WU / 1000
```

With `SNAP_MS_PER_WU = MS_PER_WU`, a transition plays at the same speed as
the first-visit intro of section 0.

### 2.4 Active section

`is-active` is derived from the master timeline position with today's
lookup (first section whose range `[sectionStarts[k], sectionStarts[k] + sw[k])`
contains the position). It is re-applied on every master timeline render,
including instant seeks, so it switches directly from `from` to `to` on
jumps.

## 3. Input

The document never scrolls on the home page while snap navigation is
mounted (see §7). Input only *requests* transitions:

- **Wheel / trackpad and vertical touch swipe.** A *gesture* is one touch
  (touchstart → touchend), or a run of wheel events without a
  `WHEEL_QUIET_MS` gap. Vertical distance (wheel `deltaY` normalised to px;
  finger travel for touch) is accumulated per gesture. When it exceeds
  `TRIGGER_PX`, one transition to the adjacent section in that direction is
  requested and the rest of that gesture is ignored. A new gesture starts
  from zero, so small nudges never add up to a trigger. Horizontal-dominant
  movement (|dx| > |dy|) does not count, so the gallery strip and
  testimonials carousel keep their horizontal swipes.
- **Keyboard** (ignored when focus is in an editable field, or when a
  modifier key other than Shift is held):
  - `ArrowDown`, `PageDown`, `Space` → next
  - `ArrowUp`, `PageUp`, `Shift+Space` → previous
  - `Home` → first section, `End` → last section
  - `Space` on a focused button keeps its native activation.
- **Dots** → jump to the clicked section. **Hint** → next section.
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
  `ResizeObserver`s, clear the testimonials auto-play interval, remove the
  page-lock class, and clear GSAP inline styles on the footer dock.
- Every mount starts at section 0, dot 0 active, footer hidden.
- Focus: sections get `tabindex="-1"`. If focus was inside the outgoing
  section (or on the hint and the hint becomes hidden), focus moves to the
  new active section when the transition completes.

## 5. Section Dots Component

**File:** `src/components/section-nav/SectionDots.astro` (new, reusable).

- Markup and styles only; no script. The page's controller finds
  `[data-section-dot]` buttons and wires clicks and `aria-current`.
- Props: `labels: string[]` (one dot per section), `ariaLabel` (default
  *Sekcje*), `class` (placement by the page).
- Renders `<nav aria-label>` → `<ul>` → one `<button type="button"
  data-section-dot={i} aria-label={label}>` per label, with a dot mark and a
  hover/`:focus-visible` label to the right. Dot 0 is rendered with
  `aria-current="true"`.
- Look copied from v2 (`src/pages/v2.astro`, "Dots" styles): 8px outline
  dots, active dot pink `--color-primary` with glow and scale 1.35, smaller
  (6px, 1.25rem hit area) on mobile.
- v2 keeps its own inline dots in this session; it will adopt the component
  in a separate session.

**Home placement:** inside `.hero-text-col` (part of the fixed stage),
absolutely positioned on the left edge and vertically centred, like v2
(`left: 1.5rem`, tablet `1rem`, mobile `0.375rem`). Labels: *Strona główna*,
*O nas*, *Galeria*, *Opinie klientów*, *Kontakt* (same as the sections'
`aria-label`s). Dots update when a transition **starts**, reflecting the
destination immediately. Dots are visible from first paint (clicks during
Phase 1 are ignored, §3) and hidden under `prefers-reduced-motion: reduce`.

Section left padding grows so dots never overlap content, matching v2:
tablet `3.5rem`, mobile `2.25rem` (desktop `4rem` already fits).

## 6. Scroll Hint Arrow

Reuse `src/components/stack-fade/ScrollHintArrow.astro` unchanged (markup
and styles only, rendered hidden and `inert`).

- **Placement:** inside `.hero-text-col`, horizontally centred,
  `bottom: calc(1.5rem + env(safe-area-inset-bottom))`.
- **Visibility** (same rules as v2): shown only when snap navigation is
  mounted, no transition is running, the active section is not the last,
  and the section's content ends at least `SCROLL_HINT_GAP_PX` above the
  hint. Hidden during Phase 1 and whenever a transition starts; re-checked
  when it completes and when sections or their content resize. Hidden =
  faded out and `inert`.
- **Click:** transition to the next section.

## 7. Page Lock and Footer

- On mount, snap navigation adds `home-snap-active` to `<html>`; teardown
  removes it. Under that class `html` and `body` get `overflow: hidden` and
  `overscroll-behavior: none`. During Phase 1 the existing inline overflow
  lock applies as today. The `.hero-sticky-wrapper` stays a `100dvh` grid;
  it is no longer pinned.
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
- Under `prefers-reduced-motion: reduce` (§8) the dock is static, in normal
  flow and not `inert`, as the footer is today.

## 8. Reduced Motion

Keep today's behaviour: when `prefers-reduced-motion: reduce` matches (at
init or on change), snap navigation is not mounted (or is torn down) and
`makeAllSectionsVisible()` runs as now. Dots are hidden (CSS media query),
the hint stays hidden, no page lock, footer in normal flow (CSS media query;
teardown also removes the dock's `inert` and inline styles). Improving this
is out of scope.

## 9. Configuration (`src/config/animation.ts`)

New constants, added in a "Snap navigation" group:

| Constant | Initial value | Meaning |
|---|---|---|
| `SNAP_MS_PER_WU` | `250` | Transition speed: ms per WU of timeline length |
| `SNAP_EASE` | `'none'` | Ease applied to each played segment |
| `TRIGGER_PX` | `60` | Vertical gesture distance needed to trigger a transition |
| `WHEEL_QUIET_MS` | `150` | Wheel silence that separates two gestures |
| `SCROLL_HINT_GAP_PX` | `8` | Min space between section content and the hint |

Existing constants keep their values. `PX_PER_WU` and `HOLD` remain the
units of the master timeline; `HOLD` no longer has a visible effect.

## 10. File Boundaries

| File | Change |
|---|---|
| `src/components/section-nav/SectionDots.astro` | New: reusable dots (§5) |
| `src/home/sectionTimeline.ts` | New: `computeSectionData`, paused master timeline, `rest`/`outroStart`/`outroEnd`, active-section lookup — moved from `index.astro`, ScrollTrigger removed |
| `src/home/snapNavigator.ts` | New: `mountSnapNavigator(root, …)` → teardown; state, input, transitions, dots, hint, footer dock, page lock |
| `src/config/animation.ts` | Add §9 constants |
| `src/pages/index.astro` | Markup (dots, hint, footer dock, section `tabindex`), styles (padding, dots/hint placement, page lock, dock), script reduced to Phase 1, mount/teardown, reduced-motion handling, testimonials |
| `docs/architecture/word-based-scroll-animation-system.md` | Describe time-driven playback replacing the scroll mapping |
| `AGENTS.md` | Update the home-page animation notes (Phase 2, cleanup) |

Not modified: `src/pages/v2.astro`, `src/home-v2/*`,
`ScrollHintArrow.astro`, `Layout.astro`, `Navigation.astro`, `Footer.astro`,
tests.

The home page no longer imports or registers ScrollTrigger; it uses the
GSAP Observer plugin (or plain listeners) for input. The
`window.ScrollTrigger` E2E hook is removed.

## 11. Known Gaps and Boundaries

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
