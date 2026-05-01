# UI/UX Improvements Plan for Nulo Cake Landing Page

This plan addresses the UI/UX issues identified in the landing page (`src/pages/index.astro`) based on the `ui-ux-pro-max` guidelines.

## User Review Required

Please review the proposed changes below. Once approved, I will implement them in `src/pages/index.astro`.

> [!WARNING]
> **Image Formats**: The current gallery images are PNGs. I will update the code to reference WebP images (e.g., `gallery-1.webp`). You will need to convert your actual image files or I can help you do that if needed. Are you okay with me changing the file extensions in the code to `.webp`?

## Proposed Changes

### src/pages/index.astro

#### [MODIFY] [index.astro](file:///c:/Users/astan/Personal/Dev/nulocake/src/pages/index.astro)

**1. Performance Improvements**
- Change `<img src="/gallery-1.png" ... />` to reference modern formats like `.webp`.
- Add explicit width and height attributes to gallery images (e.g., `width="400" height="400"`) to prevent CLS.

**2. Animation Timings**
- Update GSAP entrance animation `duration` for `.hero-section-inner` from `1` to `0.4`.
- Update GSAP reveal `duration` for `.gallery-item` from `0.6` to `0.4`.
- Update GSAP `stagger` for `.gallery-item` from `0.1` to `0.05`.
- Update GSAP `stagger` for `.testimonial-card` from `0.12` to `0.05`.

**3. Touch & Interaction**
- Update CSS for `.gallery-item:hover img` to `.gallery-item:hover img, .gallery-item:focus-within img, .gallery-item:active img`.
- Update CSS for `.section-link:hover svg` to `.section-link:hover svg, .section-link:focus-visible svg, .section-link:active svg`.

**4. Typography & Readability**
- Increase `font-size` of `.testimonial-role` from `0.6875rem` (11px) to `0.75rem` (12px) or `0.875rem` (14px).
- Increase `font-size` of `.testimonial-name` from `0.8125rem` (13px) to `1rem` (16px).

**5. Accessibility**
- Add `role="img"` to the `.testimonial-stars` wrapper div.
- Add `aria-hidden="true"` to the inner `<svg>` stars.
- Add `aria-hidden="true"` and `tabindex="-1"` to the hero `<video>` element.

## Verification Plan

### Manual Verification
- After implementation, I will verify the changes by inspecting the modified code.
- We will ensure that animations feel snappy and responsive.
- We will ensure that accessibility attributes are correctly placed.
