const basePath = '/nulocake';

/**
 * Central test configuration constants.
 *
 * All test behavior is controlled from this single file.
 * Tests and fixtures import from here — never hardcode these values.
 */
export const testConfig = {
  /** Must match `base` in astro.config.mjs */
  basePath,

  /** gsap.globalTimeline.timeScale() multiplier — fast-forwards all GSAP animations */
  animationTimeScale: 100,

  /** Inject CSS to force instant scrolling (disables smooth-scroll) */
  disableSmoothScroll: true,

  /** Max ms to wait for Astro hydration (client-side scripts loaded) */
  hydrationTimeout: 10_000,

  /** Named routes for test navigation (include Astro base path) */
  routes: {
    landing: `${basePath}/`,
    oferta: `${basePath}/oferta`,
    galeria: `${basePath}/galeria`,
    oMnie: `${basePath}/o-mnie`,
    kontakt: `${basePath}/kontakt`,
  },
} as const;