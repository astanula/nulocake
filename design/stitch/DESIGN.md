# Design System Strategy: The Noir Patisserie

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Gallery."** 

We are not building a storefront; we are curating an exhibition of edible art. For 'Nulo Cake', the UI must act as the silent, obsidian frame that allows the vibrant artistry of the cakes to vibrate. To achieve a high-end editorial feel, we break from the rigid "Bootstrap-style" symmetry. We embrace **Intentional Asymmetry**—where text blocks and high-resolution imagery overlap, creating a sense of physical depth and motion. This system prioritizes breathing room (white space) and smooth, cinematic transitions over information density.

## 2. Colors
Our palette is rooted in a deep, nocturnal foundation, punctuated by a singular, electric accent that mimics the vibrancy of artisanal frosting.

### The Palette
- **Background (`#131313`)**: A soft-black matte finish that provides more depth than a pure `#000000`.
- **Primary (`#ffaaf8`) / Container (`#eb65eb`)**: Our signature pink. Use the `primary_container` for high-impact CTAs.
- **Surface Tiers**: We use `surface_container_lowest` (#0e0e0e) through `surface_container_highest` (#353534) to define focus.

### Core Color Principles
*   **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. A border is a fence; we want an open gallery. Transitions between sections must be achieved through subtle shifts in surface tokens (e.g., moving from `surface` to `surface_container_low`) or through large-scale image backgrounds.
*   **Surface Hierarchy & Nesting:** Treat the UI as a series of stacked, fine papers. An element of higher importance should sit on `surface_bright`, while the main canvas stays on `surface_dim`.
*   **The "Glass & Gradient" Rule:** Floating navigation or overlay cards should utilize Glassmorphism. Use `surface` at 60% opacity with a `24px` backdrop-blur. 
*   **Signature Textures:** For primary buttons and hero elements, use a subtle radial gradient: `primary_container` (#eb65eb) to `on_secondary_container` (#eb9fe4). This adds a "silken" sheen reminiscent of fondant.

## 3. Typography
The typography is a dialogue between the architectural strength of Epilogue and the fluid, modern readability of Manrope.

*   **Display & Headlines (Epilogue):** These are our "Statement" pieces. Epilogue’s slightly geometric yet sophisticated structure should be used with tight letter-spacing (-0.02em) to create an authoritative, editorial feel. 
    *   *Usage:* Use `display-lg` for hero sections, often overlapping the edge of a cake image to create depth.
*   **Body & Titles (Manrope):** A clean, humanist sans-serif that balances the drama of the headlines. 
    *   *Usage:* `body-lg` for descriptions of flavor profiles. Ensure a line height of 1.6 to maintain a premium, airy feel.
*   **Label & Utility (Manrope):** Used for micro-copy and metadata. Always in `label-md`, often in all-caps with increased letter-spacing (+0.1em) to denote luxury status.

## 4. Elevation & Depth
In "The Digital Gallery," elevation is communicated through light and transparency, never through heavy shadows.

*   **The Layering Principle:** Depth is achieved by "stacking." Place a `surface_container_highest` card onto a `surface` background to create a "lift" that feels integrated into the environment rather than a separate floating object.
*   **Ambient Shadows:** If an element must float (like a modal), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4)`. The shadow should feel like a soft glow rather than a dark stain.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similar background, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use semi-transparent surface tokens for "Price Tags" or "Flavor Badges" that sit directly on top of cake photography. This maintains the "Digital Gallery" aesthetic by allowing the product colors to bleed through.

## 5. Components

### Buttons
- **Primary:** Roundedness `sm` (0.125rem). A sharp, architectural feel. Background: `primary_container`. Text: `on_primary`. 
- **Secondary:** Transparent background with a `Ghost Border`. Text: `primary`.
- **States:** On hover, the primary button should transition to a 10% lighter tint with a subtle scale-up (1.02x).

### Input Fields
- Avoid boxed inputs. Use "Underline" style inputs with the `outline` token. When focused, the line transforms into the `primary` pink. Helper text uses `label-sm`.

### Cards & Lists
- **The Forbiddance:** No horizontal dividers.
- **The Solution:** Use `vertical white space` (minimum 48px between items) or a shift to `surface_container_low`.
- **Cake Portfolio Cards:** Large-scale imagery with `display-sm` text overlapping the bottom-left corner. Use `surface_container_lowest` for the card background to make the photos "pop" against the standard `surface`.

### Custom Component: "The Flavor Chip"
- Small, pill-shaped (`full` roundedness) interactive tags. Use `surface_variant` with `on_surface_variant` text. These should feel like small luxury labels found in a boutique.

## 6. Do’s and Don’ts

### Do
- **DO** use generous margins. If you think there is enough space, add 20% more.
- **DO** use high-quality, high-contrast imagery where the cake is the hero.
- **DO** use smooth, eased transitions (e.g., `cubic-bezier(0.4, 0, 0.2, 1)`) for all hover states.
- **DO** ensure text on pink accents meets AA accessibility standards using the `on_primary` token.

### Don't
- **DON'T** use standard 1px borders or "drop shadows" with 20%+ opacity.
- **DON'T** crowd the layout. If an interface feels "functional" like a spreadsheet, it has failed.
- **DON'T** use generic iconography. Icons must be thin-stroke (1pt or 1.5pt) to match the elegance of the typography.
- **DON'T** use pure white (#FFFFFF) for large blocks of text; use `on_surface` (#e5e2e1) to reduce eye strain against the dark background.