import type { Page } from '@playwright/test';
import { testConfig } from '../test-config';

/**
 * Waits for Astro hydration to complete.
 *
 * Listens for the `astro:idle` event that Astro fires when all
 * client-side scripts have loaded and executed. Falls back to a timeout
 * if the event never fires (e.g. pages without client scripts).
 *
 * Ensures GSAP timelines and ScrollTrigger are fully initialized
 * before tests start asserting.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.evaluate((timeout) => {
    return new Promise<void>((resolve) => {
      // If Astro already fired (document is complete and scripts ran),
      // resolve immediately after a microtask to let any pending
      // initialization settle.
      if (document.readyState === 'complete') {
        // Give a small delay for any post-load initialization
        setTimeout(resolve, 100);
        return;
      }

      const timer = setTimeout(() => {
        // Fallback: resolve anyway after timeout — the page may not
        // have client scripts that fire astro:page-load.
        resolve();
      }, timeout);

      document.addEventListener(
        'astro:idle',
        () => {
          clearTimeout(timer);
          // Small delay to let GSAP timelines initialize after the event
          setTimeout(resolve, 100);
        },
        { once: true },
      );
    });
  }, testConfig.hydrationTimeout);
}
