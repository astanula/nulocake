import type { Page } from '@playwright/test';

/**
 * Scrolls the page to an exact vertical pixel position using
 * `window.scrollTo({ behavior: 'instant' })`.
 *
 * After scrolling, waits for GSAP ScrollTrigger to process the new
 * scroll position. With `scrub: 1`, ScrollTrigger needs ~100ms
 * to update the DOM.
 *
 * Deterministic: no smooth scrolling, no animation timing dependency.
 */
export async function scrollToDeterministicPosition(
  page: Page,
  yOffset: number,
): Promise<void> {
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
    // Wait 100ms for ScrollTrigger scrub to update
    return new Promise<void>((resolve) => setTimeout(resolve, 500));
  }, yOffset);
}
