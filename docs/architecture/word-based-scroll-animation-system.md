# Word-Based Scroll Animation System

Section animations where each element's animation duration and start time are derived from a single unit: the **Word Unit (WU)**. All sections live on one **master timeline** measured in px (`PX_PER_WU` per WU). The master timeline is not scroll-driven: it is paused and played by time through **snap navigation** (see [Time-Driven Playback](#time-driven-playback-snap-navigation)).

Code: `src/home/sectionTimeline.ts` (timeline construction), `src/home/snapNavigator.ts` (edge-gated input and playback), `src/pages/index.astro` (Phase 1 intro, Home mount/teardown), `src/pages/oferta.astro` (immediate Section 0, Oferta mount/teardown). Constants: `src/config/animation.ts`. Specs: `docs/superpowers/specs/2026-11-13-home-snap-navigation-design.md`, `docs/superpowers/specs/2026-11-14-oferta-snap-navigation-design.md`, `docs/superpowers/specs/2026-11-14-scroll-hint-tall-sections-design.md`.

## Constants

| Constant | Type | Description |
|---|---|---|
| `PX_PER_WU` | timeline px | Master timeline length equal to 1 WU. The unit of all timeline positions; it does not set playback speed. |
| `DURGAP` | ≥ 0 | Fraction of the previous element's duration that elapses before the next element starts. `< 1` = elements overlap (e.g. `0.5` means next starts at 50% of previous). `1` = next starts exactly when previous finishes. `> 1` = visible pause between previous finishing and next starting (e.g. `1.5` means a gap equal to 50% of previous duration). |
| `HOLD` | WU | Timeline length (in WU) between a section's intro and outro. Transitions seek across it instantly, so it has no visible effect. |
| `FDUR_RATIO` | 0–1 | Fraction of element duration used for the filter/blur tween. E.g. `0.5` means blur clears in half the duration of the main animation. The filter tween runs in parallel with the main tween, starting at the same time. |
| `MS_PER_WU` | milliseconds | Time-based equivalent of `PX_PER_WU`, used only for section 0's page-load intro animation on Home (`/`). `element.duration = element.WU × MS_PER_WU`. |
| `SNAP_MS_PER_WU` | milliseconds | **Transition speed**: playback time per WU of timeline length. Lower = faster. Applies to every transition and the footer dock slide. |
| `SNAP_EASE` | GSAP ease | Ease of each played timeline segment. |
| `TRIGGER_PX` | px | Vertical gesture distance (wheel or touch) needed to trigger a transition. |
| `WHEEL_QUIET_MS` | milliseconds | Wheel silence that separates two gestures. |
| `EDGE_EPSILON_PX` | px | Subpixel tolerance for top/bottom `window` scroll-edge detection. |
| `EDGE_GUARD_MS` | milliseconds | Cooldown after native `window` scroll before a gesture or directional key can trigger a transition. |

## Element Weights

Every animated element has a **weight in WU**. The weight determines that element's animation duration:

```
element.duration = element.WU × PX_PER_WU
```

By default, a single heading word = 1 WU. All other weights are defined by the user per project. Examples:

| Element | Default WU |
|---|---|
| Heading word | 1 |
| Body paragraph | user-defined |
| CTA button group | user-defined |
| Gallery block | user-defined |

## Per-Element Start Time Calculation

Elements animate in sequence. Each element's start time depends on the previous element's start time and duration:

```
element[0].start = 0
element[i].start = element[i-1].start + element[i-1].duration × DURGAP
```

## Section Phases

Each section has three sequential phases: **Intro → Hold → Outro**.

### Intro Phase

Elements transition from hidden to visible with a staggered cascade. Each element has two parallel tweens:

1. **Main tween** (full `element.duration`): animates `opacity`, `y`, `scale`, `rotateX`
2. **Filter tween** (`element.duration × FDUR_RATIO`): animates `filter` (blur, brightness). Starts at the same time as the main tween but finishes earlier, so blur clears first and the element continues drifting into final position.

The stagger works as follows. The first element starts animating immediately when the section begins. Each subsequent element starts after a delay determined by the previous element's duration × DURGAP. Elements with higher WU weights naturally create larger gaps before the next element begins.

**IntroSpan** = the total timeline length from the first element starting to the last element finishing:

```
IntroSpan = lastElement.start + lastElement.duration
```

### Hold Phase

After all elements have finished their intro animation, the section stays fully visible for a fixed timeline length:

```
HoldSpan = HOLD × PX_PER_WU
```

Nothing animates during the hold. A section rests at the start of its hold; transitions cross the hold with an instant seek.

### Outro Phase

Elements transition from visible back to hidden, using the same cascade structure as the intro but with reversed visual direction (elements blur out, fade, move in the opposite direction). The outro uses the exact same start offsets and durations as the intro, ensuring symmetric timing.

```
OutroSpan = IntroSpan
```

### Total Section Width

```
SW = IntroSpan + HoldSpan + OutroSpan
```

## Section Transitions

Sections are placed **end-to-end with zero gap**. The moment one section's outro ends, the next section's intro begins.

Only one section is ever visible at a time under `prefers-reduced-motion: no-preference`: inactive sections (`:not(.is-active)`) have `display: none`, while the active section (`.is-active`) has `display: flex; position: relative; min-height: 100dvh; height: auto; overflow: clip` so `document.documentElement.scrollHeight` matches the active section's natural height without creating an inner scroll container. At the exact boundary where `.is-active` switches to the incoming section, `window.scrollTo(0, 0)` runs synchronously so incoming headings and cascades always play from the top of the section.

### Forward (section A → section B)

```
Timeline position →

Section A range                          Section B range
├── intro ──┬── hold ──┬── outro ──┤├── intro ──┬── hold ──┬── outro ──┤
                                   ↑
                          is-active switches from A to B here
```

1. Section A is visible and playing its **outro** (words blur out, fade, move up)
2. Section A's outro finishes — instantly section B becomes `is-active`, section A becomes hidden
3. Section B's **intro** begins (words blur in, appear, move into position)
4. Section B reaches its resting point (start of hold) — content stays fully visible

### Backward (section B → section A)

The same timeline played in reverse, so the visual is the mirror of going forward:

1. Section B's **intro plays in reverse** (words blur back out, fade, lift away) — this is how the current section disappears
2. Timeline crosses back into section A's range — instantly section A becomes `is-active`, section B becomes hidden
3. Section A's **outro plays in reverse** (words unblur, reappear, settle back into place) — this is how the section above reappears
4. Timeline seeks across section A's hold to its resting point

A transition always runs to completion; input is ignored while it plays.

## Example: Full Section Cycle

**Section content:** 5 heading words (W1–W5), 1 paragraph (P), 1 CTA button group (B)

**Constants:** `PX_PER_WU = 100`, `DURGAP = 0.5`, `HOLD = 2 WU`, `FDUR_RATIO = 0.5`

**Weights:** W1–W5 = 1 WU each, P = 3 WU, B = 2 WU

### Element Timing Table

| Element | WU | Duration (px) | Start (px) | End (px) |
|---|---|---|---|---|
| W1 | 1 | 100 | 0 | 100 |
| W2 | 1 | 100 | 50 | 150 |
| W3 | 1 | 100 | 100 | 200 |
| W4 | 1 | 100 | 150 | 250 |
| W5 | 1 | 100 | 200 | 300 |
| P | 3 | 300 | 250 | 550 |
| B | 2 | 200 | 400 | 600 |

Start time calculation:
- W1: `0`
- W2: `0 + 100 × 0.5 = 50`
- W3: `50 + 100 × 0.5 = 100`
- W4: `100 + 100 × 0.5 = 150`
- W5: `150 + 100 × 0.5 = 200`
- P: `200 + 100 × 0.5 = 250`
- B: `250 + 300 × 0.5 = 400`

### Section Budget

```
IntroSpan = 400 + 200 = 600px
HoldSpan  = 2 × 100   = 200px
OutroSpan = 600px
SW        = 600 + 200 + 600 = 1400px
```

### Visual Timeline

```
Timeline position (px) →

0        200    300    550 600    800   1400
├─ words cascade in ─┤─P──┤─B─┤   ├hold─┤─── outro (reverse of intro) ───┤
│← ─ ─ ─ IntroSpan (600px) ─ ─ ─→│     │← ─ ─ OutroSpan (600px) ─ ─ ─ →│
```

## Global Timeline

Sections stack sequentially. Each section's start offset is the cumulative sum of all previous section widths:

```
sectionStart[0] = 0
sectionStart[i] = sectionStart[i-1] + SW[i-1]

TotalDuration = sum of all SW
```

## Active Section Detection

Sections have variable widths, so active section is determined by lookup on the master timeline position:

```
activeIndex = index of the section whose range
              [sectionStart[i], sectionStart[i] + SW[i])
              contains masterTimeline.time()
```

`is-active` is re-applied on every master timeline render, including instant seeks, so on jumps it switches directly from the source to the target section.

## Section 0: Initial State & Optional Time-Based Intro

Section 0 is the only section that does **not** have an intro or hold on the master timeline:

- **Home (`/`, `src/pages/index.astro`):** On first visit per session (`window.hasSeenIntro` unset), section 0 plays a standalone time-based entrance animation (`gsap.to()`) using the same WU weights, cascade logic, and `DURGAP`, with durations in milliseconds (`element.duration = element.WU × MS_PER_WU`) while blocking input. Subsequent visits skip Phase 1 and mount snap navigation immediately.
- **Oferta (`/oferta`, `src/pages/oferta.astro`):** Section 0 carries `.is-active` in server-rendered HTML with no load-time hiding animation, so content is immediately visible and interactive on load (including without JavaScript); snap navigation mounts directly at position `0`.

### Timeline Budget

Section 0's timeline budget contains **only its outro**:

```
SW[0] = OutroSpan
```

There is no intro and no hold on the master timeline. The outro uses the same WU-based cascade as other sections (with `PX_PER_WU`), giving symmetric timing when reversed.

### Behavior

- **Forward:** The outro starts immediately from position 0. Words blur out, fade, and exit.
- **Back to section 0:** The outro reverses — words unblur, reappear, and settle back. At position 0, section 0 is fully visible.
- **Visible-state safety:** At the start of each section 0 element's outro, a `set` forces its filter to the fully-visible value, so stale inline styles from the time-based intro do not conflict with the master timeline.

### Timeline Layout

```
Timeline position →

0                    OutroSpan    OutroSpan + SW[1]          ...
├── section 0 outro ──┤├── section 1 (intro+hold+outro) ──┤ ...
```

Section 1's intro begins exactly where section 0's outro ends.

## Time-Driven Playback (Snap Navigation)

The master timeline is created paused. Input only *requests* a transition; the transition then plays by itself, at a fixed speed, to the target section's resting point. How fast or how far the user scrolls does not matter.

### Reference Positions

| Name | Section 0 | Section i > 0 |
|---|---|---|
| `rest(i)` — fully visible, resting point | `0` | `sectionStart[i] + IntroSpan` |
| `outroStart(i)` — first frame of outro | `0` | `sectionStart[i] + IntroSpan + HoldSpan` |
| `outroEnd(i)` — section hidden | `sectionStart[1]` | `sectionStart[i + 1]` |

The last section has no outro.

### Transitions

A transition is a GSAP timeline of master timeline segments (`masterTl.tweenFromTo(a, b)`) and instant seeks (`masterTl.seek(x)`).

- **Forward `from → to`:** seek `outroStart(from)` → play `outroStart(from) → outroEnd(from)` at current `window.scrollY` → at boundary, seek `sectionStart[to]`, switch `.is-active` to `to`, and reset `window.scrollTo(0, 0)` → play `sectionStart[to] → rest(to)`.
- **Backward `from → to`:** play `rest(from) → sectionStart[from]` at current `window.scrollY` → at boundary, seek `outroEnd(to)`, switch `.is-active` to `to`, and reset `window.scrollTo(0, 0)` → play `outroEnd(to) → outroStart(to)` → seek `rest(to)`.

Skipped sections are never shown: at the seek target they are already in their hidden state.

### Speed

```
segment duration (s) = (|b − a| / PX_PER_WU) × SNAP_MS_PER_WU / 1000
```

`SNAP_MS_PER_WU` is the single speed knob; it is independent of `MS_PER_WU` and `PX_PER_WU`.

### Edge-Gated Input

Sections never use inner scroll containers (`overflow-y: auto`). When the active section exceeds `100dvh`, the browser scrolls `window` natively first (`maxScroll = max(0, scrollHeight - innerHeight)`):

- **Short sections (`maxScroll ≤ EDGE_EPSILON_PX`):** Both edges are immediately satisfied (`isAtEdge(±1) === true`), so the first wheel/touch gesture exceeding `TRIGGER_PX` or navigation key press triggers `goTo` immediately.
- **Tall sections (`maxScroll > EDGE_EPSILON_PX`):**
  - **Wheel / touch:** Vertical distance is accumulated per gesture (one touch, or a run of wheel events without a `WHEEL_QUIET_MS` gap) only when the gesture starts and stays settled (`now − lastNativeScroll ≥ EDGE_GUARD_MS`) at `isAtEdge(dir)`. Any gesture that scrolls `window` natively or occurs during the `EDGE_GUARD_MS` cooldown is marked as a native scroll gesture and cannot fire a transition; the **next** settled gesture at the edge triggers `goTo` past `TRIGGER_PX`. Horizontal-dominant movement (`|dx| > |dy|`) does not count.
  - **Keys:** `ArrowDown`/`PageDown`/`Space` (`dir = 1`), `ArrowUp`/`PageUp`/`Shift+Space` (`dir = -1`) scroll `window` natively when `!isAtEdge(dir)` and trigger `goTo(current + dir)` when settled at `isAtEdge(dir)`. `Home`/`End` always jump to first/last. Ignored inside `input, textarea, select, [contenteditable]`; `Space` also ignores `button, summary, a, [role="button"]`.
- **Section dots** (`[data-section-dot]`, `src/components/section-nav/SectionDots.astro`): click jumps to that section; `aria-current` moves to the destination when a transition starts. Hidden under reduced motion.
- **Scroll hint** (`[data-scroll-hint]`, `src/components/stack-fade/ScrollHintArrow.astro`): click goes to the next section. `SectionNavRail.astro` fixes it below and centered on the dot marks at every viewport tier, including while tall sections scroll. Its animated chevrons stay at least `--scroll-hint-gap` below the last dot; the `--sm-scroll-hint-gap`, `--md-scroll-hint-gap`, and `--lg-scroll-hint-gap` tokens and matching width tokens in `src/styles/global.css` configure the three tier groups. The rail keeps the dots centered when space permits and moves them upward on shorter screens. The hint is shown whenever no transition runs and `current !== last`.
- **Transition lock:** While a transition runs (or while the mobile nav drawer `#nav-links.open` is open), `wheel` (excluding `ctrlKey` pinch-zoom) and single-finger vertical `touchmove` call `preventDefault()` so momentum cannot scroll the document mid-animation. Listeners stay in the bubble phase so `#design-system-tooltip` isolates its internal events via `stopPropagation()`.

### Page and Footer

- While mounted, `html.home-snap-active` applies `scrollbar-gutter: stable` and `overscroll-behavior-y: none` (allowing native `window` scrolling whenever the active section exceeds `100dvh`).
- The footer sits in `.home-footer-dock` (fixed below the viewport, `inert`). It slides in parallel with the last section's intro segment and is interactive only while the last section is active.
- Under `prefers-reduced-motion: reduce`, snap navigation is not mounted: all sections flow statically in document order, dots and scroll hint are hidden, and the footer sits statically in normal flow.

## GSAP Implementation Mapping

| System value | GSAP usage |
|---|---|
| `element.duration` | `tl.to(el, { duration: element.duration, ... })` |
| `sectionStart[i] + element.start` | Position parameter (3rd arg): `tl.to(el, vars, position)` |
| `TotalDuration` | Trailing `tl.set({}, {}, TotalDuration)` fixes the timeline length |
| Transition segment `a → b` | `masterTl.tweenFromTo(a, b, { duration, ease: SNAP_EASE })` |
