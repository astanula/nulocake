# Home Page: Section Dots and Scroll Hint

**Date:** 2026-11-13
**Status:** Implemented
**Depends on:** `docs/superpowers/specs/2026-11-13-home-snap-navigation-design.md`
**Related:** `DESIGN.md`, `src/pages/v2.astro` (dots and hint look),
`docs/superpowers/specs/2026-11-12-home-v2-stack-fade-design.md` §8, §13

## 1. Purpose

Add the two controls from v2 to the home page (`/`, "v1"):

- **Section dots** on the left edge (click = jump to that section).
- **Scroll hint arrow** at the bottom (click = next section).

Both are reusable components so other pages (including v2) can adopt them
later.

They are built on top of the home snap navigation controller, whose
time-driven transitions already support jumps that skip intermediate
sections (outro of `from`, then intro of `to`). Built on the old scrubbed
timeline, a dot jump from section 1 to 3 would visibly play through
section 2.

## 2. Prerequisite: Navigator Hooks

Extend `mountSnapNavigator` (`src/home/snapNavigator.ts`) so controls can
attach without knowing its internals:

- Wire `[data-section-dot]` clicks to `goTo(Number(dot.dataset.sectionDot))`.
- Wire `[data-scroll-hint]` clicks to `goTo(active + 1)`.
- Update dots and the hint at transition start and completion (§3, §4).

Input locking stays as specified for snap navigation: clicks are ignored
during a transition, during the Phase 1 intro, and while the mobile
navigation drawer is open.

## 3. Section Dots Component

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
- v2 keeps its own inline dots until a separate session migrates it.

**Home placement:** inside `.hero-text-col`, absolutely positioned on the
left edge and vertically centred, like v2 (`left: 1.5rem`, tablet `1rem`,
mobile `0.375rem`). Labels: *Strona główna*, *O nas*, *Galeria*,
*Opinie klientów*, *Kontakt* (same as the sections' `aria-label`s).

- Dots update when a transition **starts**, reflecting the destination
  immediately. Every mount starts with dot 0 active.
- Dots are visible from first paint (clicks during Phase 1 are ignored) and
  hidden under `prefers-reduced-motion: reduce`.
- Section left padding grows so dots never overlap content, matching v2:
  tablet `3.5rem`, mobile `2.25rem` (desktop `4rem` already fits).

## 4. Scroll Hint Arrow

Reuse `src/components/stack-fade/ScrollHintArrow.astro` unchanged (markup
and styles only, rendered hidden and `inert`).

- **Placement:** inside `.hero-text-col`, horizontally centred,
  `bottom: calc(1.5rem + env(safe-area-inset-bottom))`.
- **Visibility** (same rules as v2): shown only when snap navigation is
  mounted, no transition is running, the active section is not the last,
  and the section's content ends at least `SCROLL_HINT_GAP_PX` above the
  hint. Hidden during Phase 1 and whenever a transition starts; re-checked
  when it completes and when sections or their content resize
  (`ResizeObserver`). Hidden = faded out and `inert`.
- **Click:** transition to the next section.
- **Focus:** if the hint had focus and becomes hidden, focus moves to the
  new active section when the transition completes.

## 5. Reduced Motion

Snap navigation is not mounted under reduced motion, so dots are hidden
(CSS media query) and the hint stays hidden.

## 6. Configuration (`src/config/animation.ts`)

| Constant | Initial value | Meaning |
|---|---|---|
| `SCROLL_HINT_GAP_PX` | `8` | Min space between section content and the hint |

## 7. File Boundaries

| File | Change |
|---|---|
| `src/components/section-nav/SectionDots.astro` | New: reusable dots (§3) |
| `src/home/snapNavigator.ts` | Wire dots and hint (§2, §3, §4) |
| `src/config/animation.ts` | Add `SCROLL_HINT_GAP_PX` |
| `src/pages/index.astro` | Render `SectionDots` and `ScrollHintArrow`, placement styles, section padding |

Not modified: `src/pages/v2.astro`, `src/home-v2/*`,
`ScrollHintArrow.astro`.
