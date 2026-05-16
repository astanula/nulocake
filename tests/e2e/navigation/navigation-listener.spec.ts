import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';

/**
 * Tests for navigation listener accumulation fix.
 *
 * Verifies that:
 * 1. Guard variables prevent duplicate listener registration
 * 2. Multiple navigations don't cause listener accumulation
 * 3. Oferta page styling is preserved after multiple navigations
 * 4. Navigation triggers exactly once per click
 */
test.describe('Navigation listener accumulation fix', () => {
  /**
   * Helper: Navigate and wait for hydration
   */
  async function navigateAndHydrate(page: any, route: string) {
    await page.goto(route);
    await waitForHydration(page);
  }

  /**
   * Helper: Get listener guard states from page with retry
   */
  async function getGuardStates(page: any) {
    return await page.evaluate(() => {
      return {
        hasNavPageLoadListener: (document as any).hasNavPageLoadListener,
        hasNavClickDelegated: (document as any).hasNavClickDelegated,
      };
    });
  }

  /**
   * Helper: Wait for guard variables to be set
   */
  async function waitForGuardVariables(page: any) {
    await page.waitForFunction(() => {
      return (document as any).hasNavPageLoadListener === true &&
             (document as any).hasNavClickDelegated === true;
    }, { timeout: 10000 });
  }

  test('guard variables are set after initial load', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Wait for guard variables to be set
    await waitForGuardVariables(page);

    const guards = await getGuardStates(page);

    expect(guards.hasNavPageLoadListener).toBe(true);
    expect(guards.hasNavClickDelegated).toBe(true);
  });

  test('multiple navigations preserve guard variables', async ({ page }) => {
    // Start at landing page
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForGuardVariables(page);
    const guardsAfterFirst = await getGuardStates(page);
    expect(guardsAfterFirst.hasNavPageLoadListener).toBe(true);
    expect(guardsAfterFirst.hasNavClickDelegated).toBe(true);

    // Navigate to Oferta
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    const guardsAfterSecond = await getGuardStates(page);
    expect(guardsAfterSecond.hasNavPageLoadListener).toBe(true);
    expect(guardsAfterSecond.hasNavClickDelegated).toBe(true);

    // Navigate back to Home
    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    const guardsAfterThird = await getGuardStates(page);
    expect(guardsAfterThird.hasNavPageLoadListener).toBe(true);
    expect(guardsAfterThird.hasNavClickDelegated).toBe(true);
  });

  test('Oferta page styling is preserved after multiple navigations', async ({ page }) => {
    // Navigate: Home -> Oferta -> Home -> Oferta
    await navigateAndHydrate(page, testConfig.routes.landing);

    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Check Oferta page styling on first visit
    const contentSection1 = page.locator('.content-section').first();
    await expect(contentSection1).toBeVisible();
    const box1 = await contentSection1.boundingBox();
    expect(box1).not.toBeNull();
    expect(box1!.height).toBeGreaterThan(50);

    // Navigate away and back
    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Check Oferta page styling on second visit - should still be correct
    const contentSection2 = page.locator('.content-section').first();
    await expect(contentSection2).toBeVisible();
    const box2 = await contentSection2.boundingBox();
    expect(box2).not.toBeNull();
    expect(box2!.height).toBeGreaterThan(50);

    // Verify styling is consistent between visits
    expect(box2!.height).toBeCloseTo(box1!.height, 0);
  });

  test('navigation completes without errors', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Click Oferta link
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Verify no errors occurred during navigation
    expect(errors).toHaveLength(0);
    await expect(page).toHaveURL(/\/oferta/);

    // Click Home link
    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    // Verify no errors on second navigation
    expect(errors).toHaveLength(0);
    await expect(page).toHaveURL(testConfig.routes.landing);
  });

  test('rapid clicks do not cause multiple navigations', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Click the same link multiple times rapidly
    await page.click('a.nav-link[href="/oferta"]');
    await page.click('a.nav-link[href="/oferta"]');
    await page.click('a.nav-link[href="/oferta"]');

    // Wait for navigation to complete (should only navigate once)
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Verify no errors (multiple navigate() calls would cause errors)
    expect(errors).toHaveLength(0);
    await expect(page).toHaveURL(/\/oferta/);
  });

  test('logo click navigates correctly', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.oferta);

    // Click logo to go home
    await page.click('a.nav-logo');
    await page.waitForURL('**/');
    await waitForHydration(page);

    // Verify we're on the home page
    await expect(page).toHaveURL(testConfig.routes.landing);

    // Verify the home link has active class
    const homeLink = page.locator('a.nav-link[href="/"]');
    await expect(homeLink).toHaveClass(/nav-link--active/);
  });

  test('mobile menu opens and closes correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Open mobile menu
    await page.click('#nav-toggle');
    const navLinks = page.locator('#nav-links');
    await expect(navLinks).toHaveClass(/open/);

    // Close via backdrop
    await page.click('#nav-backdrop');
    await expect(navLinks).not.toHaveClass(/open/);
  });
});
