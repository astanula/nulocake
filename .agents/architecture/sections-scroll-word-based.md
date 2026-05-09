# Word-Based Scroll Animation System

Scroll-driven section animations where each element's animation duration and start time are derived from a single unit: the **Word Unit (WU)**.

## Constants

| Constant | Type | Description |
|---|---|---|
| `PX_PER_WU` | pixels | Scroll distance equal to 1 WU. Controls overall speed. |
| `DURGAP` | ≥ 0 | Fraction of the previous element's duration that elapses before the next element starts. `< 1` = elements overlap (e.g. `0.5` means next starts at 50% of previous). `1` = next starts exactly when previous finishes. `> 1` = visible pause between previous finishing and next starting (e.g. `1.5` means a gap equal to 50% of previous duration). |
| `HOLD` | WU | Scroll distance (in WU) the section stays fully visible between intro and outro. |

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

## Per-Section Layout

Each section has three phases: **Intro → Hold → Outro**.

```
IntroSpan = element[last].start + element[last].duration
OutroSpan = IntroSpan  (symmetric)
SW        = IntroSpan + (HOLD × PX_PER_WU) + OutroSpan
```

The outro is the exact reverse of the intro — same start offsets and durations, mirrored.

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

## Section 0 Exception

Section 0 plays a time-based entrance animation on page load (not scroll-driven). Its intro is standalone. Only its outro is part of the scroll timeline. When the user scrolls back into section 0's range before the outro offset, force all elements to their fully-visible state via `onUpdate`.

## GSAP Implementation Mapping

| System value | GSAP usage |
|---|---|
| `element.duration` | `tl.to(el, { duration: element.duration, ... })` |
| `sectionStart[i] + element.start` | Position parameter (3rd arg): `tl.to(el, vars, position)` |
| `TotalDuration` | `ScrollTrigger: { end: '+=' + TotalDuration }` |
