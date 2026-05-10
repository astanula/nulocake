/**
 * Central test configuration constants.
 *
 * All test behavior is controlled from this single file.
 * Tests and fixtures import from here — never hardcode these values.
 */
export const testConfig = {
  /** gsap.globalTimeline.timeScale() multiplier — fast-forwards all GSAP animations */
  animationTimeScale: 100,

  /** Inject CSS to force instant scrolling (disables smooth-scroll) */
  disableSmoothScroll: true,

  /** Max ms to wait for Astro hydration (client-side scripts loaded) */
  hydrationTimeout: 10_000,

  /** Named routes for test navigation */
  routes: {
    landing: '/',
  },
} as const;
