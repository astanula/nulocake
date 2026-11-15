import { test, expect } from '../fixtures/base-fixture';
import { testConfig, navLinkSelector } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { scrollToDeterministicPosition } from '../helpers/scroll';

/**
 * Tests for homepage astro:page-load listener accumulation fix.
 *
 * Verifies that:
 * 1. Guard variable prevents duplicate listener registration
 * 2. Multiple navigations don't cause listener accumulation
 * 3. Page functions correctly after multiple navigations
 */
test.describe('Homepage page-load listener accumulation fix', () => {
  /**
   * Helper: Navigate and wait for hydration
   */
  async function navigateAndHydrate(page: any, route: string) {
    await page.goto(route);
    await waitForHydration(page);
  }

  /**
   * Helper: Get the homepage listener guard state
   */
  async function getHomePageGuardState(page: any) {
    return await page.evaluate(() => {
      return (window as any).homePageLoadListenerAdded === true;
    });
  }

  /**
   * Helper: Wait for the guard variable to be set
   */
  async function waitForHomePageGuard(page: any) {
    await page.waitForFunction(() => {
      return (window as any).homePageLoadListenerAdded === true;
    }, { timeout: 10000 });
  }

  test('guard variable is set after initial homepage load', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);

    await waitForHomePageGuard(page);
    const guardSet = await getHomePageGuardState(page);

    expect(guardSet).toBe(true);
  });

  test('multiple navigations preserve guard variable', async ({ page }) => {
    // Start at landing page
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForHomePageGuard(page);

    let guardSet = await getHomePageGuardState(page);
    expect(guardSet).toBe(true);

    // Navigate to Oferta
    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Navigate back to Home
    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    guardSet = await getHomePageGuardState(page);
    expect(guardSet).toBe(true);

    // Navigate away and back again
    await page.click(navLinkSelector('oMnie'));
    await page.waitForURL('**/o-mnie');
    await waitForHydration(page);

    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    guardSet = await getHomePageGuardState(page);
    expect(guardSet).toBe(true);
  });

  test('homepage animations work correctly after multiple navigations', async ({ page }) => {
    // Navigate: Home -> Oferta -> Home -> Galeria -> Home
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForHomePageGuard(page);

    // Verify hero section is active
    const hero = page.locator('#section-hero');
    await expect(hero).toHaveClass(/is-active/);

    // Navigate away and back
    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    // Verify hero section is still working correctly
    await expect(hero).toHaveClass(/is-active/);

    // Navigate away and back again
    await page.click(navLinkSelector('galeria'));
    await page.waitForURL('**/galeria');
    await waitForHydration(page);

    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    // Verify hero section still works
    await expect(hero).toHaveClass(/is-active/);
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
    await waitForHomePageGuard(page);

    // Navigate away and back multiple times
    const routes = [testConfig.routes.oferta, testConfig.routes.galeria, testConfig.routes.oMnie];

    for (const route of routes) {
      await page.click(`a.nav-link[href="${route}"]`);
      await page.waitForURL(`**${route}`);
      await waitForHydration(page);

      await page.click(navLinkSelector('landing'));
      await page.waitForURL(`**${testConfig.routes.landing}`);
      await waitForHydration(page);
    }

    // Verify no errors occurred
    expect(errors).toHaveLength(0);
  });

  test('snap navigation instances are properly managed across navigations', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForHomePageGuard(page);

    // Wait for body overflow to be restored (indicating initHomePage completed)
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);

    // Navigate away and back
    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    // Wait for initialization
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);

    await page.evaluate(() => {
      const gsap = (window as any).gsap;
      const originalTimeline = gsap.timeline;
      (window as any).__snapTransitionCount = 0;
      gsap.timeline = function (vars?: any) {
        if (vars && typeof vars.onComplete === 'function') {
          (window as any).__snapTransitionCount++;
        }
        return originalTimeline.call(this, vars);
      };
    });

    const hint = page.locator('[data-scroll-hint]');
    const ctaDistance = await page.locator('#section-hero .section-cta-group').evaluate(
      (el) => Math.max(0, el.getBoundingClientRect().bottom - window.innerHeight),
    );
    if (ctaDistance > 0) {
      await scrollToDeterministicPosition(page, Math.ceil(ctaDistance) + 1);
    }
    await hint.click();
    await expect(page.locator('#section-story')).toHaveClass(/is-active/);

    // Only one snap transition should fire (not accumulated)
    const transitionCount = await page.evaluate(() => (window as any).__snapTransitionCount);
    expect(transitionCount).toBe(1);
  });
});
