/**
 * Configuration for the infinite-scrolling gallery on /galeria.
 * Shared between build-time layout and client-side GSAP animation.
 */

/** Duration (seconds) for one full loop cycle per column. */
export const COLUMN_SPEEDS = [200, 220, 250, 150] as const;

/** Vertical gap between images in a column. */
export const IMAGE_GAP = '24px';

/** Border radius for the gallery images. E.g. '8px', '12px', '16px' etc. */
export const IMAGE_BORDER_RADIUS = '8px';

/** Side padding for the gallery container on desktop viewports. */
export const GALLERY_PADDING_DESKTOP = '12rem';

/** Side padding for the gallery container on mobile viewports. */
export const GALLERY_PADDING_MOBILE = '1.5rem';

/** Responsive breakpoints for column count. */
export const BREAKPOINTS = {
  /** ≥1024px → 4 columns */
  desktop: 1024,
  /** ≥640px → 3 columns */
  tablet: 640,
  // Below 640px → 2 columns (implicit)
} as const;

/** Duration (seconds) for smooth timeScale transitions on hover. */
export const HOVER_TRANSITION_DURATION = 0.4;

/** Height of the fade transition at the top and bottom of the gallery. */
export const GALLERY_FADE_HEIGHT = '10px';

/** Non-linear transition curve midpoint ratio. */
export const GALLERY_FADE_MIDPOINT_RATIO = 0.3;

/** Delay (ms) before floating effect triggers on hover. */
export const FLOAT_HOVER_DELAY_MS = 250;

/** Frame scale factor when floating (1.1 = 10% bigger). */
export const FLOAT_SCALE_AMOUNT = 1.1;

/** Inner image zoom factor when floating. */
export const FLOAT_ZOOM_AMOUNT = 1.1;

/** Duration (seconds) for floating animation in/out. */
export const FLOAT_ANIMATION_DURATION = 0.4;

/** Easing function for floating animation. */
export const FLOAT_EASE = 'power2.out';


