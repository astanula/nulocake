/**
 * Tunable constants for the v2 home page stack fade navigation.
 * Spec: docs/superpowers/specs/2026-11-12-home-v2-stack-fade-design.md
 */

// ── Transition ───────────────────────────────────────
export const TRANSITION_S    = 0.9;            // Duration of one section change (s)
export const TRANSITION_EASE = 'power3.inOut'; // Ease for all transition tweens
export const SCALE_PAST      = 0.9;            // Scale of the section being covered
export const OPACITY_PAST    = 0;              // Opacity of the section being covered

// ── Input ────────────────────────────────────────────
export const EDGE_GUARD_MS      = 200; // Quiet time after inner scroll before an edge counts
export const WHEEL_QUIET_MS     = 150; // Wheel silence that separates two gestures
export const OBSERVER_TOLERANCE = 10;  // Observer gesture tolerance (px)
export const EDGE_EPSILON_PX    = 2;   // Distance from top/bottom treated as "at edge"
export const KEY_SCROLL_RATIO   = 0.8; // Inner scroll step for keys, × visible height

// ── Scroll hint ──────────────────────────────────────
export const SCROLL_HINT_GAP_PX = 8; // Min space between section content and the hint

// ── Reduced motion ───────────────────────────────────
export const REDUCED_MOTION_S = 0.2; // Crossfade duration
