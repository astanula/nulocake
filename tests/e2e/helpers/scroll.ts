import type { Page } from '@playwright/test';

/**
 * Scrolls the page to an exact vertical pixel position using
 * `window.scrollTo({ behavior: 'instant' })`.
 *
 * After scrolling, waits for one `requestAnimationFrame` tick so that
 * GSAP ScrollTrigger processes the new scroll position before the
 * test continues asserting.
 *
 * Deterministic: no smooth scrolling, no animation timing dependency.
 */
export async function scrollToDeterministicPosition(
  page: Page,
  yOffset: number,
): Promise<void> {
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    // Return a promise that resolves after one rAF tick
    return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, yOffset);
}
