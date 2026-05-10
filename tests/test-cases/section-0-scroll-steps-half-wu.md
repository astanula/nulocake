# Section 0 (Hero) 0.5 WU Scroll Animation Simulation

This document provides a step-by-step simulation of the GSAP scroll-driven outro animation for the Hero section (Section 0) on the NuloCake landing page. It simulates the element states at specific scroll positions, advancing by 0.5 Word Unit (WU) increments.

## Assumptions & Constants
Based on `index.astro` and `.agents/architecture/sections-scroll-word-based.md`:
*   **Scroll Increment:** Each step is 0.5 Word Unit (WU), which is exactly `20px` (since `PX_PER_WU = 40px`).
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
To easily map completion percentage to visual properties (interpolated linearly):
*   **Fully Visible (0% complete):**
    *   `.word`: `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`.
    *   `.blur-in`: `opacity: 1`, `y: 0px`, `filter: blur(0px)`.
*   **Partially Animated (50% complete):**
    *   `.word`: `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`.
    *   `.blur-in`: `opacity: 0.5`, `y: -15px`, `filter: blur(8px)`.
*   **Fully Invisible (100% complete):**
    *   `.word`: `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`.
    *   `.blur-in`: `opacity: 0`, `y: -30px`, `filter: blur(16px)`.

---

## 1. Scrolling Down Phase
The simulation begins immediately after the time-based intro finishes. The user is at the very top of the page.

### Step 0: Initial State (Scroll: 0px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 1: Scroll 0.5 WU (Scroll: 20px)
*   **Section 0 (`is-active`):** `true`
*   **W1 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W2 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 2: Scroll 1.0 WU (Scroll: 40px)
*   **Section 0 (`is-active`):** `true`
*   **W1 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W2 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W3 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 3: Scroll 1.5 WU (Scroll: 60px)
*   **Section 0 (`is-active`):** `true`
*   **W1, W2 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W3 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W4 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 4: Scroll 2.0 WU (Scroll: 80px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W3 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W4 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W5, W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 5: Scroll 2.5 WU (Scroll: 100px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W4 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W5 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 6: Scroll 3.0 WU (Scroll: 120px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W5 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W6 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 7: Scroll 3.5 WU (Scroll: 140px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W6 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **P1 (50%):** `opacity: 0.5`, `y: -15px`, `filter: blur(8px)`
*   **CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 8: Scroll 4.0 WU (Scroll: 160px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W6 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **P1 (100%):** `opacity: 0`, `y: -30px`, `filter: blur(16px)`
*   **CTA1 (50%):** `opacity: 0.5`, `y: -15px`, `filter: blur(8px)`

### Step 9: Scroll 4.5 WU (Scroll: 180px)
*   **Section 0 (`is-active`):** `false` (Transition to Section 1 begins)
*   **W1 to W6 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **P1, CTA1 (100%):** `opacity: 0`, `y: -30px`, `filter: blur(16px)`

---

## 2. Scrolling Up Phase
Assuming the user is at 180px and starts scrolling back up. The GSAP Scrub timeline reverses symmetrically.

### Step 10: Scroll back to 4.0 WU (Scroll: 160px)
*   **Section 0 (`is-active`):** `true` (Reactivated)
*   **W1 to W6 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **P1 (100%):** `opacity: 0`, `y: -30px`, `filter: blur(16px)`
*   **CTA1 (50%):** `opacity: 0.5`, `y: -15px`, `filter: blur(8px)`

### Step 11: Scroll back to 3.5 WU (Scroll: 140px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W6 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **P1 (50%):** `opacity: 0.5`, `y: -15px`, `filter: blur(8px)`
*   **CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 12: Scroll back to 3.0 WU (Scroll: 120px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W5 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W6 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 13: Scroll back to 2.5 WU (Scroll: 100px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W4 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W5 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 14: Scroll back to 2.0 WU (Scroll: 80px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W3 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W4 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W5, W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 15: Scroll back to 1.5 WU (Scroll: 60px)
*   **Section 0 (`is-active`):** `true`
*   **W1, W2 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W3 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W4 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 16: Scroll back to 1.0 WU (Scroll: 40px)
*   **Section 0 (`is-active`):** `true`
*   **W1 (100%):** `opacity: 0`, `y: -30px`, `scale: 1.1`, `rotateX: 15deg`, `filter: blur(16px) brightness(0.6)`
*   **W2 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W3 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 17: Scroll back to 0.5 WU (Scroll: 20px)
*   **Section 0 (`is-active`):** `true`
*   **W1 (50%):** `opacity: 0.5`, `y: -15px`, `scale: 1.05`, `rotateX: 7.5deg`, `filter: blur(8px) brightness(0.8)`
*   **W2 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`

### Step 18: Scroll back to 0 WU (Scroll: 0px)
*   **Section 0 (`is-active`):** `true`
*   **W1 to W6 (0%):** `opacity: 1`, `y: 0px`, `scale: 1`, `rotateX: 0deg`, `filter: blur(0px) brightness(1)`
*   **P1, CTA1 (0%):** `opacity: 1`, `y: 0px`, `filter: blur(0px)`
