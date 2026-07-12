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

// ── Gallery preview mode ────────────────────────────────
// Layout & chrome (CSS strings unless noted).

/** Hero top inset (also min top for the close button). */
export const PREVIEW_MARGIN_TOP = '4rem';

/** Hero bottom inset, above the thumbnail rail. */
export const PREVIEW_MARGIN_BOTTOM = '1.5rem';

/** Gap between the hero and the counter. */
export const PREVIEW_COUNTER_GAP = '0.75rem';

/** Counter text size. */
export const PREVIEW_COUNTER_FONT_SIZE = '0.95rem';

/** Opacity for the counter text (0..1). */
export const PREVIEW_COUNTER_OPACITY = 0.7;

/** Thumbnail cell size (square). */
export const PREVIEW_THUMB_SIZE = '64px';

/** Center (active) thumb scale relative to side thumbs. */
export const PREVIEW_THUMB_ACTIVE_SCALE = 1.15;

/** Opacity of non-center thumbnails in the strip (0..1). */
export const PREVIEW_THUMB_SIDE_OPACITY = 0.5;

/** Side-peek opacity (0..1). */
export const PREVIEW_PEEK_OPACITY = 0.35;

/** Peek visible width as a ratio of hero width (0..1). */
export const PREVIEW_PEEK_WIDTH_RATIO = 0.08;

/** Peek visible height as a ratio of hero height (0..1). */
export const PREVIEW_PEEK_HEIGHT_RATIO = 0.6;

/** `::backdrop` blur radius. */
export const PREVIEW_BACKDROP_BLUR = '20px';

/** `::backdrop` dim overlay color. */
export const PREVIEW_BACKDROP_DIM = 'rgba(19, 19, 19, 0.72)';

// Motion (the single open/close hero tween).

/** Duration (seconds) of the hero open/close tween. */
export const PREVIEW_OPEN_DURATION = 0.3;

/** Hero starting scale on open / ending scale on close. */
export const PREVIEW_OPEN_START_SCALE = 0.9;

/** GSAP ease for the hero open/close tween. */
export const PREVIEW_OPEN_EASE = 'power2.out';

// Build-time image generation (getImage widths, px).

/** Cap for the full-resolution preview image. */
export const PREVIEW_MAX_WIDTH = 1600;

/** Generated width for thumbnail-strip images (retina-friendly). */
export const PREVIEW_THUMB_RES = 160;

/** Generated width for side-peek images. */
export const PREVIEW_PEEK_RES = 600;

