import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';

/**
 * Smoke test — validates that the E2E infrastructure is wired correctly.
 *
 * Proves: server starts, page loads, hydration completes, snap navigation works.
 * No animation assertions — those will come in dedicated test files.
 */
test.describe('Landing page smoke', () => {
  test('page loads and basic infrastructure works', async ({ page }) => {
    // 1. Navigate to the landing page
    await page.setViewportSize({ width: 1280, height: 900 });
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
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);

    // 5. Advance to the next section via snap navigation
    await page.locator('[data-scroll-hint]').click();

    // 6. Assert active section transitioned
    await expect(page.locator('#section-story')).toHaveClass(/is-active/);
    await expect(hero).not.toHaveClass(/is-active/);
  });
});
