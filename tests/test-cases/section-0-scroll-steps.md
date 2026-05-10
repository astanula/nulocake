# Section 0 (Hero) Scroll Animation Simulation

This document provides a step-by-step simulation of the GSAP scroll-driven outro animation for the Hero section (Section 0) on the NuloCake landing page. It simulates the element states at specific scroll positions, assuming the user navigates using the keyboard arrow keys.

## Assumptions & Constants
Based on `index.astro` and `.agents/architecture/sections-scroll-word-based.md`:
*   **Scroll Increment:** Each arrow key press scrolls exactly 1 Word Unit (WU), defined as `PX_PER_WU = 40px`.
*   **DURGAP:** `0.5` (Each element starts its animation when the previous element is 50% complete).
*   **FDUR_RATIO:** `1.0` (The filter blur animation runs for the full duration of the element's main animation).
*   **Section 0 Elements:**
    *   `W1`: "Wymarzony" (1 WU)
    *   `W2`: "tort" (1 WU)
    *   `W3`: "na" (1 WU)
    *   `W4`: "Twoją" (1 WU)
    *   `W5`: "wyjątkową" (1 WU)
    *   `W6`: "okazję." (1 WU)
    *   `P1`: Paragraph (1 WU)
    *   `CTA1`: CTA buttons group (1 WU)

### Element Timings (in pixels)
| Element | DOM Type | Start (px) | End (px) | Duration |
| :--- | :--- | :--- | :--- | :--- |
| **W1** | `.word` | `0px` | `40px` | 40px |
| **W2** | `.word` | `20px` | `60px` | 40px |
| **W3** | `.word` | `40px` | `80px` | 40px |
| **W4** | `.word` | `60px` | `100px` | 40px |
| **W5** | `.word` | `80px` | `120px` | 40px |
| **W6** | `.word` | `100px` | `140px` | 40px |
| **P1** | `.blur-in` | `120px` | `160px` | 40px |
| **CTA1** | `.blur-in` | `140px` | `180px` | 40px |

> [!NOTE] 
> The total scroll duration (width) of Section 0 is exactly **180px**. At timeline position 180px and beyond, Section 0 loses the `is-active` class.

### Visual State Definitions
To easily map completion percentage to visual properties:
*   **Fully Visible (0% complete):**
    *   `.word` & `.blur-in`: `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`.
*   **Partially Animated (50% complete):**
    *   `.word`: `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`.
    *   `.blur-in`: `opacity: 0.5`, `y: -15px`, `filter: blur(8px)`.
*   **Fully Invisible (100% complete):**
    *   `.word`: `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`.
    *   `.blur-in`: `opacity: 0`, `y: -30px`, `filter: blur(16px)`.

---

## 1. Scrolling Down Phase
The simulation begins immediately after the time-based intro finishes. The user is at the very top of the page.

### Step 1: Initial State (Scroll: 0px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to CTA1:** Fully Visible.

### Step 1.1: Press Arrow Down (Scroll: 40px)
*   **Section 0 (`is-active`):** `true`
*   **W1:** Fully Invisible (100%).
*   **W2:** Partially Animated (50%).
*   **W3 to CTA1:** Fully Visible (0%).

### Step 1.2: Press Arrow Down (Scroll: 80px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W3:** Fully Invisible.
*   **W4:** Partially Animated (50%).
*   **W5 to CTA1:** Fully Visible.

### Step 1.3: Press Arrow Down (Scroll: 120px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W5:** Fully Invisible.
*   **W6:** Partially Animated (50%).
*   **P1 to CTA1:** Fully Visible.

### Step 1.4: Press Arrow Down (Scroll: 160px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W6:** Fully Invisible.
*   **P1:** Fully Invisible.
*   **CTA1:** Partially Animated (50%).

### Step 1.5: Press Arrow Down (Scroll: 200px)
*   **Section 0 (`is-active`):** `false` *(Section 1 takes over as active)*
*   **W1 to CTA1:** Fully Invisible.

---

## 2. Scrolling Back Up Phase
The user has reached 200px and now presses the Arrow Up key to scrub the timeline backward.

### Step 2.1: Press Arrow Up (Scroll: 160px)
*   **Section 0 (`is-active`):** `true` *(Timeline re-enters Section 0 range `[0, 180px)`)*
*   **Section 1 (`is-active`):** `false`
*   **W1 to P1:** Fully Invisible.
*   **CTA1:** Partially Animated (50% un-blurred).

### Step 2.2: Press Arrow Up (Scroll: 120px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W5:** Fully Invisible.
*   **W6:** Partially Animated (50%).
*   **P1 & CTA1:** Fully Visible (Returned to 0% progress).

### Step 2.3: Press Arrow Up (Scroll: 80px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W3:** Fully Invisible.
*   **W4:** Partially Animated (50%).
*   **W5 to CTA1:** Fully Visible.

### Step 2.4: Press Arrow Up (Scroll: 40px)
*   **Section 0 (`is-active`):** `true`
*   **W1:** Fully Invisible.
*   **W2:** Partially Animated (50%).
*   **W3 to CTA1:** Fully Visible.

### Step 2.5: Press Arrow Up (Scroll: 0px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to CTA1:** Fully Visible. *(Returned exactly to the pristine state)*
