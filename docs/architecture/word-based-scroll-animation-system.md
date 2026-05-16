# Word-Based Scroll Animation System

Scroll-driven section animations where each element's animation duration and start time are derived from a single unit: the **Word Unit (WU)**.

## Constants

| Constant | Type | Description |
|---|---|---|
| `PX_PER_WU` | pixels | Scroll distance equal to 1 WU. Controls overall speed. |
| `DURGAP` | ≥ 0 | Fraction of the previous element's duration that elapses before the next element starts. `< 1` = elements overlap (e.g. `0.5` means next starts at 50% of previous). `1` = next starts exactly when previous finishes. `> 1` = visible pause between previous finishing and next starting (e.g. `1.5` means a gap equal to 50% of previous duration). |
| `HOLD` | WU | Scroll distance (in WU) the section stays fully visible between intro and outro. |
| `FDUR_RATIO` | 0–1 | Fraction of element duration used for the filter/blur tween. E.g. `0.5` means blur clears in half the scroll distance of the main animation. The filter tween runs in parallel with the main tween, starting at the same time. |
| `MS_PER_WU` | milliseconds | Time-based equivalent of `PX_PER_WU`, used only for section 0's page-load intro animation. `element.duration = element.WU × MS_PER_WU`. |

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

**IntroSpan** = the total scroll distance from the first element starting to the last element finishing:

```
IntroSpan = lastElement.start + lastElement.duration
```

### Hold Phase

After all elements have finished their intro animation, the section stays fully visible for a fixed scroll distance:

```
HoldSpan = HOLD × PX_PER_WU
```

Nothing animates during the hold. The user scrolls through this zone seeing the complete section content.

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

Only one section is ever visible at a time. A CSS class (`is-active`) controls `visibility`. The class switches at the exact boundary between sections.

### Scrolling Down (section A → section B)

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
4. Section B reaches hold — content stays fully visible

### Scrolling Up (section B → section A)

The timeline simply reverses from its current position. No special logic — GSAP scrub handles this naturally.

1. If in section B's hold/intro range, the **intro plays in reverse** (words blur back out, fade, lift away) — this is how the current section disappears
2. Timeline crosses back into section A's range — instantly section A becomes `is-active`, section B becomes hidden
3. Section A's **outro plays in reverse** (words unblur, reappear, settle back into place) — this is how the section above reappears
4. Continue scrolling up through section A's hold, then intro reverses if scrolling further

### Direction Change at Any Point

The user can reverse scroll direction at any moment — in the middle of an intro, mid-hold, or during an outro. The timeline reverses from that exact position. If the user scrolled 0.75 WU into a 2 WU hold phase and reverses, they scroll back exactly 0.75 WU through the hold. No snapping, no skipping.

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
Scroll position (px) →

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
ScrollTrigger end = "+=" + TotalDuration
```

Because `TotalDuration` is in pixels (derived from `PX_PER_WU`), the scroll distance is fixed regardless of viewport height.

## Active Section Detection

Sections have variable widths, so active section is determined by lookup:

```
timelinePosition = scrollProgress × TotalDuration

activeIndex = index of the section whose range
              [sectionStart[i], sectionStart[i] + SW[i])
              contains timelinePosition
```

## Section 0: Time-Based Intro

Section 0 is the only section that does **not** have a scroll-driven intro or hold. Its lifecycle is:

### Page Load: Time-Based Intro

On page load, section 0 plays a one-time entrance animation using the **same WU weights, cascade logic, and DURGAP** as scroll-driven sections, but durations are in **milliseconds** instead of pixels:

```
element.duration = element.WU × MS_PER_WU
element[i].start = element[i-1].start + element[i-1].duration × DURGAP
```

This is a standalone GSAP animation (`gsap.to()`), not part of the scroll timeline. It plays once and completes. After it finishes, section 0 is in its fully-visible state — equivalent to being at the end of hold in a normal section.

### Scroll Budget

Section 0's scroll budget contains **only its outro**:

```
SW[0] = OutroSpan
```

There is no scroll-driven intro and no hold. The outro uses the same WU-based cascade as other sections (with `PX_PER_WU`), giving symmetric timing when reversed.

### Scrolling Behavior

- **Scroll down:** The outro starts immediately from the top of the page. Words blur out, fade, and exit.
- **Scroll back up:** The outro reverses — words unblur, reappear, and settle back. At scroll position 0, section 0 is fully visible.
- **Scroll-back safety:** When the timeline position is within section 0's range and before the outro has started progressing, force all section 0 elements to their fully-visible state via `onUpdate`. This prevents stale inline styles from the time-based intro from conflicting with the scroll timeline.

### Timeline Layout

```
Scroll position →

0                    OutroSpan    OutroSpan + SW[1]          ...
├── section 0 outro ──┤├── section 1 (intro+hold+outro) ──┤ ...
```

Section 1's scroll-driven intro begins exactly where section 0's outro ends.

## GSAP Implementation Mapping

| System value | GSAP usage |
|---|---|
| `element.duration` | `tl.to(el, { duration: element.duration, ... })` |
| `sectionStart[i] + element.start` | Position parameter (3rd arg): `tl.to(el, vars, position)` |
| `TotalDuration` | `ScrollTrigger: { end: '+=' + TotalDuration }` |
