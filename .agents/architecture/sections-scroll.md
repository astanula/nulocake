# Scroll Line System

A content-aware scroll budget system for scroll-driven section animations. Each section's scroll allocation is proportional to its content complexity, so sections with more content take longer to animate through.

## Core Concept: The Scroll Line (SL)

A **Scroll Line** is the atomic unit of scroll budget. Each individually-animated element in a section contributes a fixed number of scroll lines.

### Counting Rules

| Element type | Scroll Lines |
|---|---|
| Header line (visual line of large heading text, split by `<br />`) | 1 per line |
| Body paragraph (regardless of length — animates as one blurred item) | 1 |
| Call-to-action button group (animates as one blurred item) | 1 |
| Gallery / carousel (animates as one blurred item) | 1 |
| Reviews / testimonials block (animates as one blurred item) | 1 |
| Any other block-level blurred element | 1 |

**Example:** A section with a 3-line heading, a paragraph, and a button group:

```
3 (header lines) + 1 (body) + 1 (buttons) = 5 Scroll Lines
```

A simpler section with a 2-line heading and only a testimonials block:

```
2 (header lines) + 1 (testimonials) = 3 Scroll Lines
```

## Section Budget

Each section has three phases: **intro**, **hold**, and **outro**.

```
┌── intro (N scroll lines) ──┬── hold ──┬── outro (N scroll lines) ──┐
0                             N        N+H                         2N+H
```

| Phase | Duration | Description |
|---|---|---|
| **Intro** | `N` scroll lines | Elements animate from hidden → visible with staggered blur-in |
| **Hold** | `H` scroll lines (constant) | Section stays fully visible, no animation |
| **Outro** | `N` scroll lines | Elements animate from visible → hidden (reverse of intro) |

**Total budget per section** = `2N + H` scroll lines, where:
- `N` = the section's scroll line count (content-dependent)
- `H` = hold duration (constant across all sections, e.g. `H = 2`)

The intro and outro are always **symmetric** — same duration, ensuring consistent feel in both scroll directions.

## Total Scroll Distance

The total scroll distance is the sum of all section budgets, converted to pixels:

```
totalScrollLines = Σ (2Nᵢ + H)  for each section i
totalPixels      = totalScrollLines × PX_PER_LINE
ScrollTrigger end = `+=${totalPixels}`
```

`PX_PER_LINE` is a tunable constant (e.g. 110–130px) that controls overall scroll speed. A higher value makes everything feel slower and more cinematic; a lower value makes it snappier.

**Because we use fixed pixels (not viewport percentages), the scroll distance is consistent regardless of browser window height.** The number of scroll-wheel ticks or arrow-key presses to complete the animation is the same on any screen size.

## Timeline Mapping

### Time Units

Each scroll line maps to exactly **1 timeline time-unit**. The total timeline duration equals `totalScrollLines`.

### Section Start Offsets

Since sections have variable widths, each section starts at the **cumulative sum** of all previous section widgets:

```
sectionStart[0] = 0
sectionStart[i] = sectionStart[i-1] + (2 × N[i-1] + H)
```

**Example** with `H = 2` and sections of N = 4, 4, 3, 4:

```
Section 0: start =  0, width = 10  (range  0–10)
Section 1: start = 10, width = 10  (range 10–20)
Section 2: start = 20, width =  8  (range 20–28)
Section 3: start = 28, width = 10  (range 28–38)
Total: 38 time units
```

### Active Section Detection

The `activeIndex` cannot use a simple equal-division formula because sections have different widths. Instead, use a lookup:

```js
// Precompute cumulative boundaries
const boundaries = [];
let cumulative = 0;
sectionWidths.forEach(w => {
  cumulative += w;
  boundaries.push(cumulative);
});
const totalDuration = cumulative;

// In onUpdate:
const timelineTime = self.progress * totalDuration;
let activeIndex = 0;
for (let i = 0; i < boundaries.length; i++) {
  if (timelineTime < boundaries[i]) {
    activeIndex = i;
    break;
  }
}
```

## Stagger and Duration Scaling

Within each section's intro (or outro), the stagger spread and tween duration scale proportionally to `N`:

```js
const STAG = N * 0.4;   // 40% of intro budget — cascade spread
const DUR  = N * 0.6;   // 60% of intro budget — per-word animation
// STAG + DUR = N  ✓ (fits exactly in the intro phase)
```

The filter/blur tween duration is shorter (clears faster for a crisper feel):

```js
const FDUR = DUR * 0.5;  // blur resolves in half the scroll distance
```

This ensures that sections with more content (`N = 5`) have a wider cascade and longer per-element animation, while simpler sections (`N = 3`) animate more quickly — matching the user's intuition.

## Special Case: First Section (Section 0)

Section 0 is unique because it uses a **time-based load animation** on page load (not scroll-driven). Its intro plays automatically when the page loads.

- **Intro:** Standalone `gsap.to()` tweens with real-time durations and delays. Not part of the scroll timeline.
- **Hold + Outro:** Part of the scroll timeline, starting at `outroOffset = N + H` in the timeline.
- **Scroll-back reset:** When the user scrolls back to section 0's range (before the outro starts), an `onUpdate` callback forces all elements to their fully-visible state, since the timeline has no intro to reverse into.

## Configuration Summary

| Parameter | Type | Description |
|---|---|---|
| `N` (per section) | Content-derived | Scroll lines counted from section HTML |
| `H` | Constant | Hold duration in scroll lines (e.g. 2) |
| `PX_PER_LINE` | Tunable | Pixels of scroll per scroll line (e.g. 110–130) |
| `STAG` ratio | Constant | Fraction of N for cascade spread (e.g. 0.4) |
| `DUR` ratio | Constant | Fraction of N for tween duration (e.g. 0.6) |
| `FDUR` ratio | Constant | Fraction of DUR for filter tween (e.g. 0.5) |
