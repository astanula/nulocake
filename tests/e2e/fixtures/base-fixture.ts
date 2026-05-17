import { test as base, expect } from '@playwright/test';
import { testConfig } from '../test-config';

/**
 * Custom Playwright fixture that automatically applies anti-flake measures
 * before every test:
 *
 * 1. GSAP fast-forward — injects an init script that sets
 *    gsap.globalTimeline.timeScale() to a high multiplier so animations
 *    resolve near-instantly.
 *
 * 2. Smooth scroll disable — injects a style tag forcing
 *    scroll-behavior: auto on <html>, ensuring deterministic scrolling.
 *
 * All test files should import { test, expect } from this module
 * instead of from '@playwright/test' directly.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // ── 1. GSAP fast-forward via init script ──────────────────────────
    // Runs before any page script. Polls briefly for GSAP (loaded as ES module).
    await page.addInitScript((timeScale: number) => {
      // Expose E2E flag for the application to conditionally expose internals (like ScrollTrigger)
      (window as any).__E2E_TEST__ = true;

      const poll = () => {
        if (typeof (window as any).gsap !== 'undefined') {
          (window as any).gsap.globalTimeline.timeScale(timeScale);
        } else if (typeof (globalThis as any).gsap !== 'undefined') {
          (globalThis as any).gsap.globalTimeline.timeScale(timeScale);
        } else {
          // GSAP loaded as an ES module won't be on window by default.
          // Watch for it to appear via a short-lived MutationObserver +
          // requestAnimationFrame polling fallback.
          let attempts = 0;
          const maxAttempts = 100; // ~1.6s at 16ms intervals
          const check = () => {
            attempts++;
            const g = (window as any).gsap ?? (globalThis as any).gsap;
            if (g) {
              g.globalTimeline.timeScale(timeScale);
            } else if (attempts < maxAttempts) {
              requestAnimationFrame(check);
            }
          };
          requestAnimationFrame(check);
        }
      };
      // Run immediately and also on DOMContentLoaded in case we're early
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', poll, { once: true });
      } else {
        poll();
      }
    }, testConfig.animationTimeScale);

    // ── 2. Disable smooth scroll ──────────────────────────────────────
    // Applied after navigation in each test via page.addStyleTag.
    // We hook into the page's 'load' event to inject the style.
    if (testConfig.disableSmoothScroll) {
      page.on('load', async () => {
        await page.addStyleTag({
          content: 'html { scroll-behavior: auto !important; }',
        });
      });
    }

    await use(page);
  },
});

export { expect };
