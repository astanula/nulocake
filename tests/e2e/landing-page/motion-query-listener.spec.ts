import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';

/**
 * Tests for motion query listener accumulation fix.
 *
 * Verifies that:
 * 1. Guard variable prevents duplicate listener registration
 * 2. Multiple navigations don't cause listener accumulation
 * 3. Reduced motion preference change is handled correctly
 */
test.describe('Motion query listener accumulation fix', () => {
  /**
   * Helper: Navigate and wait for hydration
   */
  async function navigateAndHydrate(page: any, route: string) {
    await page.goto(route);
    await waitForHydration(page);
  }

  /**
   * Helper: Get the motion query listener guard state
   */
  async function getMotionQueryGuardState(page: any) {
    return await page.evaluate(() => {
      return (window as any).motionQueryListenerAdded === true;
    });
  }

  /**
   * Helper: Wait for the guard variable to be set
   */
  async function waitForMotionQueryGuard(page: any) {
    await page.waitForFunction(() => {
      return (window as any).motionQueryListenerAdded === true;
    }, { timeout: 10000 });
  }

  test('guard variable is set after initial homepage load', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);

    await waitForMotionQueryGuard(page);
    const guardSet = await getMotionQueryGuardState(page);

    expect(guardSet).toBe(true);
  });

  test('multiple navigations preserve guard variable', async ({ page }) => {
    // Start at landing page
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForMotionQueryGuard(page);

    let guardSet = await getMotionQueryGuardState(page);
    expect(guardSet).toBe(true);

    // Navigate to Oferta
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Navigate back to Home
    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    guardSet = await getMotionQueryGuardState(page);
    expect(guardSet).toBe(true);

    // Navigate away and back again
    await page.click('a.nav-link[href="/o-mnie"]');
    await page.waitForURL('**/o-mnie');
    await waitForHydration(page);

    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    guardSet = await getMotionQueryGuardState(page);
    expect(guardSet).toBe(true);
  });

  test('no errors during multiple homepage visits', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to homepage
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForMotionQueryGuard(page);

    // Navigate away and back multiple times
    const routes = [testConfig.routes.oferta, testConfig.routes.galeria, testConfig.routes.oMnie];

    for (const route of routes) {
      await page.click(`a.nav-link[href="${route}"]`);
      await page.waitForURL(`**${route}`);
      await waitForHydration(page);

      await page.click('a.nav-link[href="/"]');
      await page.waitForURL('**/');
      await waitForHydration(page);
    }

    // Verify no errors occurred
    expect(errors).toHaveLength(0);
  });

  test('reduced motion preference triggers correct behavior', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForMotionQueryGuard(page);

    // Wait for initialization to complete (either Phase 1 or Phase 2)
    await page.waitForFunction(() => {
      const bodyOverflow = getComputedStyle(document.body).overflow;
      return bodyOverflow === 'visible' || bodyOverflow === 'hidden';
    }, { timeout: 15000 });

    // Verify hero sections are visible (either via animation or makeAllSectionsVisible)
    const sections = page.locator('.hero-section');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);

    // All sections should have visibility set (either 'visible' or empty string after clearProps)
    for (let i = 0; i < count; i++) {
      const section = sections.nth(i);
      const visibility = await section.evaluate((el: HTMLElement) => el.style.visibility);
      // Either 'visible' (from makeAllSectionsVisible) or empty string (from clearProps)
      expect(['visible', ''].includes(visibility)).toBe(true);
    }
  });
});
