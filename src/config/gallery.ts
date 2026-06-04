/**
 * Configuration for the infinite-scrolling gallery on /galeria.
 * Shared between build-time layout and client-side GSAP animation.
 */

/** Duration (seconds) for one full loop cycle per column. */
export const COLUMN_SPEEDS = [200, 220, 250, 150] as const;

/** Vertical gap between images in a column. */
export const IMAGE_GAP = '16px';

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
export const FLOAT_SCALE_AMOUNT = 1.4;

/** Inner image zoom factor when floating. */
export const FLOAT_ZOOM_AMOUNT = 1.1;

/** Duration (seconds) for floating animation in/out. */
export const FLOAT_ANIMATION_DURATION = 0.4;

/** Easing function for floating animation. */
export const FLOAT_EASE = 'power2.out';

/** Safety margin (px) from viewport/scroll boundaries for floating images. */
export const FLOAT_SAFETY_BUFFER = 16;

// --- Gallery Preview Mode Configuration ---

/** Hero top inset. */
export const PREVIEW_MARGIN_TOP = '1.5rem';

/** Hero bottom inset (above thumb rail). */
export const PREVIEW_MARGIN_BOTTOM = '1.5rem';

/** Gap between the hero image bottom edge and the counter text. */
export const PREVIEW_COUNTER_GAP = '0.5rem';

/** Font size for the image counter (e.g. "3 / 16"). */
export const PREVIEW_COUNTER_FONT_SIZE = '0.9rem';

/** Thumb cell size. */
export const PREVIEW_THUMB_SIZE = '50px';

/** Center thumb vs side size scale. */
export const PREVIEW_THUMB_ACTIVE_SCALE = 1.2;

/** Non-center thumbs in strip opacity. */
export const PREVIEW_THUMB_SIDE_OPACITY = 0.5;

/** Side peeks + outgoing end opacity. */
export const PREVIEW_PEEK_OPACITY = 0.2;

/** Peek width as a fraction of the hero image width (0.1 = 10%, 1 = 100%). */
export const PREVIEW_PEEK_WIDTH_RATIO = 0.2;

/** Peek height as a fraction of the hero image height (0.1 = 10%, 1 = 100%). */
export const PREVIEW_PEEK_HEIGHT_RATIO = 0.9;

/** Hero image width scale during outgoing tween. */
export const PREVIEW_OUTGOING_IMAGE_SCALE = 0.7;

/** Backdrop image blur radius. */
export const PREVIEW_BACKDROP_BLUR = '40px';

/** RGBA overlay color on backdrop. */
export const PREVIEW_BACKDROP_DIM = 'rgba(0, 0, 0, 0.7)';

/** Hero nav master timeline duration (seconds). */
export const PREVIEW_TRANSITION_DURATION = 0.5;

/** GSAP ease for hero nav. */
export const PREVIEW_TRANSITION_EASE = 'power2.inOut';

/** Stage 0: gallery image shift to viewport center (seconds). */
export const PREVIEW_OPEN_SHIFT_DURATION = 0.35;

/** Stage 2: hero grow + backdrop fade (seconds). */
export const PREVIEW_OPEN_HERO_BACKDROP_DURATION = 0.4;

/** Stage 4: thumb strip, peeks, controls (seconds). */
export const PREVIEW_OPEN_CHROME_DURATION = 0.35;

/** GSAP ease for all open/close stages. */
export const PREVIEW_OPEN_EASE = 'power2.out';

/** Cap for getImage preview generation. */
export const PREVIEW_MAX_WIDTH = 1920;

/** Min horizontal swipe distance. */
export const PREVIEW_SWIPE_THRESHOLD_PX = 50;

/** Opacity for the image counter text. */
export const PREVIEW_COUNTER_OPACITY = 0.8;
