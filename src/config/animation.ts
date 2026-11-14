/**
 * Shared animation constants for the NuloCake scroll-driven animation system.
 * These are used by both the production code (src/pages/index.astro) and 
 * the E2E tests (tests/e2e) to ensure consistency.
 */

// ── Core Scroll System ───────────────────────────────
export const PX_PER_WU = 40;   // Master timeline units (px) per Word Unit
export const DURGAP    = 0.25;  // Next element starts at 25% of previous duration
export const HOLD      = 2;    // WU of hold between intro and outro (no visible effect under snap navigation)
export const MS_PER_WU = 250;  // Time-based equivalent of PX_PER_WU (section 0 only)

// ── Snap navigation ──────────────────────────────────
export const SNAP_MS_PER_WU = 250;    // Transition speed: ms per WU of timeline length. Lower = faster
export const SNAP_EASE      = 'none'; // Ease applied to each played segment
export const TRIGGER_PX     = 60;     // Vertical gesture distance needed to trigger a transition
export const WHEEL_QUIET_MS = 150;    // Wheel silence that separates two gestures
export const EDGE_EPSILON_PX = 2;     // Subpixel scroll-edge tolerance
export const EDGE_GUARD_MS  = 180;    // Cooldown after native window scroll before a gesture can trigger a transition

// ── Visual Parameters ────────────────────────────────
export const FDUR_RATIO = 1.0; // Filter duration = this × element duration
export const LIFT_PX    = 60;   // Vertical lift offset (px) for intro/outro animations

// Blur range
export const BLUR_MAX_PX  = 16;  // Max blur (px) when element is hidden
export const BLUR_MIN_PX  = 12;  // Min random blur at intro start
export const BLUR_RANGE   = 8;   // Random blur variation range

// Brightness
export const BRIGHTNESS_MIN = 0.6; // Brightness when hidden
export const BRIGHTNESS_MAX = 1.0; // Brightness when visible

// Scale
export const SCALE_INTRO = 0.9;  // Initial scale at intro start
export const SCALE_OUTRO = 1.1;  // Final scale at outro end
export const SCALE_VARIATION    = 0.05; // Per-element scale jitter
export const SCALE_VARIATION_FREQ = 0.2; // Frequency for scale sine variation

// 3D Rotation
export const ROTATEX_DEG = 15; // 3D rotation angle (degrees)

// ── Element Weights (in Word Units) ──────────────────
export const WU_WORD         = 1;
export const WU_BODY         = 1;
export const WU_CTA          = 1;
export const WU_CAROUSEL     = 1;
