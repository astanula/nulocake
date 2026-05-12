/**
 * Shared animation constants for the NuloCake scroll-driven animation system.
 * These are used by both the production code (src/pages/index.astro) and 
 * the E2E tests (tests/e2e) to ensure consistency.
 */

// ── Core Scroll System ───────────────────────────────
export const PX_PER_WU = 40;   // Scroll pixels per Word Unit
export const DURGAP    = 0.5;  // Next element starts at 50% of previous duration
export const HOLD      = 2;    // WU of hold between intro and outro
export const MS_PER_WU = 250;  // Time-based equivalent of PX_PER_WU (section 0 only)

// ── Visual Parameters ────────────────────────────────
export const FDUR_RATIO = 1.0; // Filter duration = this × element duration
export const LIFT_PX    = 30;   // Vertical lift offset (px) for intro/outro animations

// ── Element Weights (in Word Units) ──────────────────
export const WU_WORD         = 1;
export const WU_BODY         = 1;
export const WU_CTA          = 1;
export const WU_CAROUSEL     = 1;
