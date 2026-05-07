# Word-Based Scroll Unit System

A precise, dynamic scroll budget system that calculates animation timing based on the exact number and type of elements in a section. This ensures a perfectly consistent animation feel across the entire page, regardless of text length.

## Core Concepts

### 1. The Word Unit (WU)
Instead of counting visual lines, we assign a "weight" to every HTML element that animates. This weight is measured in **Word Units (WU)**. It represents how much "scroll breathing room" an element needs before the next element begins.

| Element Type | Weight (WU) | Rationale |
| :--- | :--- | :--- |
| Single Word (`<span class="word">`) | 1 WU | The baseline unit. |
| Call to Action Buttons | 2 WU | Needs slightly more scroll time to appear and be registered by the user. |
| Body Paragraph | 3 WU | Contains many words; needs significantly more scroll time to wash in and give the user time to start reading. |
| Gallery / Testimonials block | 3 WU | Large visual blocks require more scroll dedication. |

### 2. Animation Constants: DUR and DURGAP
Instead of defining an arbitrary "Stagger" value, the pacing is inextricably linked to the animation duration of a single word.

*   **`DUR` (Duration):** The number of scroll units it takes for an element to physically transition from invisible to fully visible (e.g., `5.0`).
*   **`DURGAP` (Duration Gap Percentage):** A percentage (e.g., `0.5` or 50%) defining when the *next* element should start animating relative to the previous element's duration. 
    *   If `DURGAP = 0.5`, the next word starts when the current word is exactly halfway through its fade-in.
    *   If `DURGAP = 1.0`, the next word starts exactly when the current word finishes.
    *   If `DURGAP = 0.1`, words appear almost simultaneously in a rapid wave.

*   **`GAP` (Calculated base gap):** `GAP = DUR * DURGAP`. (e.g., `5.0 * 0.5 = 2.5` units).

### 3. The Cascade Start Time (STAG equivalent)
Every element in a section receives a specific `startTime` in the intro phase. This is calculated cumulatively using the weights (WU) of the preceding elements.

For a sequence of elements `[E0, E1, E2...]` with weights `[W0, W1, W2...]`:
*   `StartTime(E0) = 0`
*   `StartTime(E1) = StartTime(E0) + (W0 * GAP)`
*   `StartTime(E2) = StartTime(E1) + (W1 * GAP)`

**Example:** A line with 2 words (1 WU each) followed by a button group (2 WU).
*   Word 1 (1 WU): Starts at `0`.
*   Word 2 (1 WU): Starts at `0 + (1 * 2.5) = 2.5`.
*   Buttons (2 WU): Starts at `2.5 + (1 * 2.5) = 5.0`.
*   *(If there was a next element, it would start at `5.0 + (2 * 2.5) = 10.0`)*

The total time it takes just to *start* the last element is the equivalent of the old `STAG` variable. We'll call this `CascadeSpan`.
`CascadeSpan = Sum of all weights (except the last item) * GAP`.

## Section Budget Calculation

Every section is composed of three phases: **Intro**, **Hold**, and **Outro**. The required scroll budget (Section Width or `SW`) is calculated dynamically:

**1. Intro Phase**
The intro phase is complete when the very last element finishes its physical animation.
`IntroSpan = CascadeSpan + DUR`

**2. Hold Phase**
A constant value defining how long the section remains fully readable before fading out.
`HOLD = 10.0` (scroll units)

**3. Outro Phase**
To ensure symmetry when scrolling backwards, the outro phase takes the exact same amount of scroll units as the intro phase.
`OutroSpan = IntroSpan`

**Total Section Width (SW)**
`SW = IntroSpan + HOLD + OutroSpan`

## Global Timeline Math

Because every section calculates its own exact `SW`, the global timeline simply stacks them end-to-end:

*   Section 0 starts at `0`, ends at `SW_0`.
*   Section 1 starts at `SW_0`, ends at `SW_0 + SW_1`.
*   Section 2 starts at `SW_0 + SW_1`, ends at `SW_0 + SW_1 + SW_2`.

**Setting the ScrollTrigger `end` property:**
1. Sum the `SW` of all sections to get `TotalTimelineUnits`.
2. Define a `PX_PER_UNIT` constant (e.g., `40px` per unit).
3. `TotalScrollPixels = TotalTimelineUnits * PX_PER_UNIT`.
4. `ScrollTrigger end = "+=" + TotalScrollPixels`.

## Why this architecture is superior

1.  **Text Agnostic:** You can change the header from 2 words to 15 words. You can add two new paragraphs. You never have to manually adjust math or "Scroll Line" counts. The system reads the DOM weights and perfectly expands the scroll budget to fit the new content.
2.  **Perfect Uniformity:** The visual gap and overlap between words is mathematically locked to `DURGAP`. It will feel perfectly consistent on Section 1 and Section 5, regardless of text density.
3.  **Semantic Pacing:** By assigning a 3 WU weight to a paragraph, the animation naturally "pauses" slightly after the paragraph begins, giving the user's brain a fraction of a second to register the block of text before the CTA buttons fly in. 
4.  **Symmetric Reverse:** Because `OutroSpan` exactly mirrors `IntroSpan`, scrolling backwards perfectly reverses the wave effect with zero jumping or clipping.
