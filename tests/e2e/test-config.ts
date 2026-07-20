const basePath = '/nulocake';

/**
 * Central test configuration constants.
 *
 * All test behavior is controlled from this single file.
 * Tests and fixtures import from here — never hardcode these values.
 */
export const testConfig = {
  /** Mirror astro.config.mjs `base` — all routes and assets live under this path */
  basePath: '/nulocake',

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

/** CSS selector for a nav link pointing at a configured route */
export function navLinkSelector(route: keyof typeof testConfig.routes): string {
  return `a.nav-link[href="${testConfig.routes[route]}"]`;
}
