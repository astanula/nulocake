# Current Scroll Animation Implementation

Reference document describing the current scroll animation code in `src/pages/index.astro` (lines ~482–743). Use this to understand what exists before migrating to the Word-Based Scroll Unit System.

## File Location

All animation code is in a single `<script>` block at the bottom of `src/pages/index.astro`.

## Dependencies

```typescript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
```

## HTML Structure

The hero area is a pinned full-viewport container with stacked sections. Only one section is visible at a time.

```
#hero-scroll-container  (.hero-container)
  .hero-sticky-wrapper
    .hero-text-col
      .hero-section  (×5, stacked via position:absolute)
        .hero-section-inner
          .section-heading
            span.word  (×N, individually animated)
          p.section-body.blur-in  (optional, animated as one block)
          div.section-cta-group.blur-in  (optional, animated as one block)
          div.gallery-carousel.blur-in  (optional, animated as one block)
          div.testimonials-stack.blur-in  (optional, animated as one block)
    .hero-video-col
```

### Section Content Inventory

| # | ID | `.word` elements | `.blur-in` elements |
|---|---|---|---|
| 0 | section-hero | 6 (Wymarzony, tort, na, Twoją, wyjątkową, okazję.) | 2 (paragraph, CTA buttons) |
| 1 | section-story | 4 (Sztuka, która, zachwyca, smakiem.) | 2 (paragraph, link) |
| 2 | section-gallery | 4 (Moje, słodkie, dzieła, sztuki) | 2 (gallery carousel, CTA button) |
| 3 | section-testimonials | 4 (Co, mówią, moi, klienci?) | 1 (testimonials stack) |
| 4 | section-contact | 5 (Gotowy, na, swój, wymarzony, tort?) | 2 (paragraph, CTA button) |

## CSS Visibility

Sections are hidden by default and shown via a class toggle:

```css
.hero-section {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
}
.hero-section.is-active {
  visibility: visible;
  pointer-events: auto;
}
```

## Reduced Motion

If `prefers-reduced-motion: reduce` is active, all animations are skipped. `makeAllSectionsVisible()` forces all sections and elements to `opacity: 1`, `filter: none`, `transform: none`, `visibility: visible`.

## Animation Architecture

### Current Constants

```typescript
const SW   = 25;   // Section width (timeline time-units per section, fixed for all)
const STAG = 5.0;  // Max stagger spread across all words in a section
const DUR  = 5.0;  // Tween duration for transform properties (opacity, y, scale, rotateX)
const FDUR = 2.5;  // Tween duration for filter properties (blur, brightness)
const HOLD = 3;    // Time-units where section stays fully visible
const OUTRO_OFFSET = STAG + DUR + HOLD; // = 13
```

### ScrollTrigger Setup

```typescript
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: heroContainer,       // #hero-scroll-container
    start: 'top top',
    end: '+=500%',                // Viewport-relative (changes with window height)
    pin: '.hero-sticky-wrapper',
    scrub: 1,                     // 1-second smooth scrub
    onUpdate: (self) => { ... }
  }
});
```

### Active Section Detection (in onUpdate)

Currently uses equal-width division (all sections same width):

```typescript
const activeIndex = Math.min(
  sections.length - 1,
  Math.floor(self.progress * sections.length)
);
```

This toggles `is-active` class on the matching section.

### Section 0 Scroll-Back Fix (in onUpdate)

Section 0 has no intro in the timeline. When scrolling back to section 0's range before the outro offset, `onUpdate` forces all section 0 elements to their visible state:

```typescript
const s0outroStart = OUTRO_OFFSET; // 13
const timelineTime = self.progress * (sections.length * SW);
if (activeIndex === 0 && timelineTime < s0outroStart) {
  // gsap.set() all section 0 words and blur-in elements to visible state
  // with overwrite: 'auto'
}
```

### Section 0: Time-Based Load Animation

On page load, section 0 plays a standalone time-based animation (not scroll-driven):

```typescript
// Initial state
gsap.set(words, {
  opacity: 0, filter: 'blur(16px) brightness(0.6)',
  y: 30, scale: 0.9, rotateX: -15
});
gsap.set(elements, { opacity: 0, filter: 'blur(16px)', y: 30 });

// Per-word entrance (time-based, seconds)
words.forEach((word, wIdx) => {
  const progress = wIdx / words.length;
  const delay = Math.pow(progress, 0.8) * 0.8;   // 0 to 0.8s stagger
  const blur = 12 + Math.floor(Math.random() * 8); // randomized starting blur
  const scale = 0.9 + Math.sin(wIdx * 0.2) * 0.05; // slight scale variation

  gsap.to(word, {
    opacity: 1, y: 0, scale: 1, rotateX: 0,
    duration: 2.2, ease: 'power3.out', delay: delay + 0.2
  });
  gsap.to(word, {
    filter: 'blur(0px) brightness(1)',
    duration: 0.9, ease: 'power2.out', delay: delay + 0.2
  });
});

// blur-in elements follow the same pattern with pseudoIdx
```

### Sections 1–4: Scroll-Driven Intro

Initial state set via `gsap.set()` (same values as section 0). Then per-word timeline tweens:

```typescript
const inStartTime = i * SW;  // e.g. section 1 starts at time 25

words.forEach((word, wIdx) => {
  const progress = wIdx / words.length;
  const delay = Math.pow(progress, 0.8) * STAG;  // Non-linear stagger

  // At inStartTime: set randomized blur and scale
  tl.set(word, { filter: `blur(${blur}px) brightness(0.6)`, scale: scale }, inStartTime);

  // Transform tween
  tl.to(word, {
    opacity: 1, y: 0, scale: 1, rotateX: 0,
    duration: DUR, ease: 'power3.out'
  }, inStartTime + delay);

  // Filter tween (shorter, runs in parallel)
  tl.to(word, {
    filter: 'blur(0px) brightness(1)',
    duration: FDUR, ease: 'power2.out'
  }, inStartTime + delay);
});

// blur-in elements use same pattern, with pseudoIdx for delay calculation
```

### All Sections Except Last: Scroll-Driven Outro

```typescript
const outStartTime = (i * SW) + OUTRO_OFFSET;  // e.g. section 0 outro at time 13

words.forEach((word, wIdx) => {
  const progress = wIdx / words.length;
  const delay = Math.pow(progress, 0.8) * STAG;

  tl.to(word, {
    opacity: 0, y: -30, scale: 1.1, rotateX: 15,
    duration: DUR, ease: 'power2.in'
  }, outStartTime + delay);

  tl.to(word, {
    filter: 'blur(16px) brightness(0.6)',
    duration: FDUR, ease: 'power2.in'
  }, outStartTime + delay);
});

// blur-in elements: opacity: 0, y: -30, filter: 'blur(16px)'
```

### Timeline Duration Pinning

```typescript
tl.addLabel('end', sections.length * SW);  // 5 × 25 = 125
```

### Video Init Guard

The timeline initializes either immediately or waits for the video's `loadedmetadata` event:

```typescript
if (video && video.readyState >= 1) {
  initTimeline();
} else if (video) {
  video.addEventListener('loadedmetadata', initTimeline, { once: true });
} else {
  initTimeline();
}
```

## Known Issues in Current Implementation

1. **Inconsistent word-to-word gap**: `STAG` is fixed at 5.0 for all sections. Sections with more words have smaller gaps between each word starting; sections with fewer words have larger gaps.
2. **All elements share the same DUR**: A single word and a full paragraph both take 5.0 scroll units to animate, which may feel disproportionate.
3. **Viewport-relative scroll distance**: `end: '+=500%'` means total scroll distance changes with browser window height.
4. **Fixed section widths**: All sections get SW=25 regardless of content density.
5. **Non-linear stagger**: Uses `Math.pow(progress, 0.8)` which compresses early words and spreads later words. The new system should use linear cumulative spacing based on WU weights.

## Animation Property Values (Hardcoded)

These values are scattered throughout the code and should be extracted to constants:

| Property | Intro start value | Fully visible value | Outro end value |
|---|---|---|---|
| `opacity` | 0 | 1 | 0 |
| `y` | 30 (px down) | 0 | -30 (px up) |
| `scale` | 0.9 | 1 | 1.1 |
| `rotateX` | -15 (deg) | 0 | 15 (deg) |
| `filter` (words) | `blur(16px) brightness(0.6)` | `blur(0px) brightness(1)` | `blur(16px) brightness(0.6)` |
| `filter` (blur-in) | `blur(16px)` | `blur(0px)` | `blur(16px)` |

### Easing

| Phase | Transform ease | Filter ease |
|---|---|---|
| Intro | `power3.out` | `power2.out` |
| Outro | `power2.in` | `power2.in` |
