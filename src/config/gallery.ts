/**
 * Configuration for the infinite-scrolling gallery on /galeria.
 * Shared between build-time layout and client-side GSAP animation.
 */

/** Duration (seconds) for one full loop cycle per column. */
export const COLUMN_SPEEDS = [100, 100, 100, 100] as const;

/** Vertical gap between images in a column. */
export const IMAGE_GAP = '30px';

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
