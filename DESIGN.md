# Design System: Noir Patisserie
> Brand: Nulo Cake (Artystyczne Torty Na Zamówienie)

## Brand Identity
Nulo Cake is an artistic cakes business. The design system, "Noir Patisserie" is focused on a high-end, editorial, and premium aesthetic. The experience should feel like flipping through a luxury magazine, with a strong focus on visual storytelling and culinary art.

## Color Palette
A dark-mode-first aesthetic with vibrant, high-contrast pink accents.
- **Background:** `#131313` (Void black)
- **Surfaces:** `#1a1a1a`, `#1c1c1c`, etc. (Subtle grays for depth)
- **Primary / Accent:** `#ffaaf8` (Vibrant pink)
- **Primary Container:** `#eb65eb` (Used for button gradients with `#eb9fe4`)
- **Text (Primary):** `#e5e2e1` (Soft white)
- **Text (Secondary):** `#c4c0bf` (Muted gray)
- **Outline:** `#8e8b8a` 

## Typography
Clean, modern sans-serif fonts that balance editorial elegance with readability.
- **Display Typeface:** `Epilogue` (Weights: 600, 700) — Used for massive headings, striking statements, and editorial impact.
- **Body Typeface:** `Manrope` (Weights: 400, 600) — Used for paragraph text, UI elements, labels, and buttons.

## Layout & Composition
- **Editorial Split-Screen:** Favor asymmetrical and split-screen layouts (e.g., text sections scrolling on one side, imagery/video pinned on the other).
- **Whitespace:** Generous use of padding and whitespace to let content breathe and feel premium.
- **Dark Canvas:** Elements should blend seamlessly into the dark background, with glowing accents used sparingly for emphasis (e.g., radial gradients behind media).
- **Viewport Tiers:** Use the six canonical, non-overlapping tiers: `small-mobile` `<420px`, `mobile` `420–767px`, `tablet` `768–1023px`, `laptop` `1024–1279px`, `desktop` `1280–1535px`, and `large-desktop` `≥1536px`.

## Interactions & Animation
- **Scroll-Driven Storytelling:** Leverage GSAP & ScrollTrigger to reveal content smoothly as the user scrolls.
- **Micro-interactions:** Buttons should have subtle scale (`scale: 1.02`) and brightness transitions.
- **Performance-First:** Rely on CSS `transform` and `opacity` for animations. Always respect `prefers-reduced-motion`.

## Implementation Rules
- Core design tokens are maintained in `src/styles/global.css`.
- `src/config/responsive.ts` is the responsive single source of truth: use `TIER_MIN_WIDTH_PX`, `CUSTOM_MEDIA`, `VIEWPORT_TIERS`, `getViewportTier()`, and `LAYOUT_METRICS`. Its six-tier CSS custom properties are maintained alongside the global design tokens in `src/styles/global.css`.
- Write responsive CSS with `@media (--...)` tokens only. `src/build/responsiveMediaPlugin.ts` expands these custom-media tokens and enforces the rule at build time.
- GSAP is the standard for complex scroll animations and staggering elements.
