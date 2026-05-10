import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { scrollToDeterministicPosition } from '../helpers/scroll';

/**
 * Smoke test — validates that the E2E infrastructure is wired correctly.
 *
 * Proves: server starts, page loads, hydration completes, scrolling works.
 * No animation assertions — those will come in dedicated test files.
 */
test.describe('Landing page smoke', () => {
  test('page loads and basic infrastructure works', async ({ page }) => {
    // 1. Navigate to the landing page
    await page.goto(testConfig.routes.landing);

    // 2. Wait for Astro hydration
    await waitForHydration(page);

    // 3. Assert page title contains "Nulo Cake"
    await expect(page).toHaveTitle(/Nulo Cake/);

    // 4. Assert #section-hero exists and has the is-active class
    const hero = page.locator('#section-hero');
    await expect(hero).toBeVisible();
    await expect(hero).toHaveClass(/is-active/);

    // 4.5 Wait for the time-based intro to finish (body overflow is restored)
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');

    // 5. Scroll to a new position
    await scrollToDeterministicPosition(page, 500);

    // 6. Assert scroll position actually changed
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThanOrEqual(500);
  });
});
