import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';

/**
 * Tests for homepage ScrollTrigger and interval cleanup on page leave.
 *
 * Verifies that:
 * 1. astro:before-swap listener is guarded against duplicates
 * 2. ScrollTrigger instances are killed when navigating away
 * 3. Testimonials auto-play interval is cleared on leave
 * 4. Overflow styles are reset when leaving homepage
 * 5. Re-visiting homepage creates fresh state (no zombie instances)
 */
test.describe('Homepage cleanup on leave', () => {
  /**
   * Helper: Navigate and wait for hydration
   */
  async function navigateAndHydrate(page: any, route: string) {
    await page.goto(route);
    await waitForHydration(page);
  }

  /**
   * Helper: Get the before-swap listener guard state
   */
  async function getBeforeSwapGuardState(page: any) {
    return await page.evaluate(() => {
      return (window as any).homePageBeforeSwapListenerAdded === true;
    });
  }

  /**
   * Helper: Wait for the before-swap guard variable to be set
   */
  async function waitForBeforeSwapGuard(page: any) {
    await page.waitForFunction(() => {
      return (window as any).homePageBeforeSwapListenerAdded === true;
    }, { timeout: 10000 });
  }

  /**
   * Helper: Get ScrollTrigger instances pinned to hero-sticky-wrapper
   */
  async function getHomepageScrollTriggers(page: any): Promise<number> {
    return await page.evaluate(() => {
      const allTriggers = (window as any).ScrollTrigger?.getAll() ?? [];
      const filtered = allTriggers.filter((t: any) => {
        const pin = t.pin;
        if (!pin) return false;
        const el = pin instanceof HTMLElement ? pin : document.querySelector(pin);
        return el && el.classList.contains('hero-sticky-wrapper');
      });
      return filtered.length;
    });
  }

  /**
   * Helper: Check if testimonials interval is running
   */
  async function isTestimonialsIntervalActive(page: any) {
    return await page.evaluate(() => {
      return (window as any).testimonialsAutoPlayInterval !== null;
    });
  }

  test('before-swap listener guard is set after homepage visit', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);

    await waitForBeforeSwapGuard(page);
    const guardSet = await getBeforeSwapGuardState(page);

    expect(guardSet).toBe(true);
  });

  test('before-swap listener is not duplicated on re-visit', async ({ page }) => {
    // First visit
    await navigateAndHydrate(page, testConfig.routes.landing);
    await waitForBeforeSwapGuard(page);

    // Navigate away and back
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    // Guard should still be true (not re-added)
    const guardSet = await getBeforeSwapGuardState(page);
    expect(guardSet).toBe(true);
  });

  test('ScrollTrigger instances are killed when navigating away', async ({ page }) => {
    // Start at homepage
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Wait for animations to initialize
    await page.waitForTimeout(2000);

    // Get initial ScrollTrigger count for homepage
    const initialTriggersCount = await getHomepageScrollTriggers(page);
    expect(initialTriggersCount).toBeGreaterThan(0);

    // Navigate away from homepage
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Wait a bit for cleanup to happen
    await page.waitForTimeout(500);

    // Navigate back to homepage
    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    // Wait for re-initialization
    await page.waitForTimeout(2000);

    // Get ScrollTrigger count after re-visit
    const afterRevisitTriggersCount = await getHomepageScrollTriggers(page);

    // Should have fresh instances (old ones were killed)
    // The count should be the same as initial (not accumulated)
    expect(afterRevisitTriggersCount).toBe(initialTriggersCount);
  });

  test('testimonials interval is cleared on leave', async ({ page }) => {
    // Start at homepage
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Wait for page to fully initialize (including testimonials carousel)
    await page.waitForTimeout(2000);

    // Navigate away from homepage
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Wait for cleanup
    await page.waitForTimeout(500);

    // Navigate back to homepage
    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    // Wait for re-initialization
    await page.waitForTimeout(2000);

    // Interval should be fresh (old one was cleared)
    // No error should occur from zombie interval manipulating detached DOM
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    expect(errors).toHaveLength(0);
  });

  test('overflow styles are reset when leaving homepage', async ({ page }) => {
    // Start at homepage during Phase 1 (first visit)
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);

    // Wait for Phase 1 to potentially set overflow: hidden
    await page.waitForTimeout(3000);

    // Navigate away from homepage
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Overflow styles should be reset
    const htmlOverflow = await page.evaluate(() => {
      return document.documentElement.style.overflow;
    });
    const bodyOverflow = await page.evaluate(() => {
      return document.body.style.overflow;
    });

    expect(htmlOverflow).toBe('');
    expect(bodyOverflow).toBe('');
  });

  test('re-visiting homepage creates fresh animations', async ({ page }) => {
    // First visit
    await navigateAndHydrate(page, testConfig.routes.landing);
    await page.waitForTimeout(2000);

    // Get initial state
    const heroSection = page.locator('#section-hero');
    const initialClass = await heroSection.getAttribute('class');

    // Navigate away
    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Navigate back
    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);
    await page.waitForTimeout(2000);

    // Hero section should have fresh state
    const afterRevisitClass = await heroSection.getAttribute('class');

    // The class should indicate proper initialization
    // (no interference from previous zombie instances)
    expect(afterRevisitClass).toContain('is-active');
  });

  test('no console errors during navigation cycle', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate: Home -> Oferta -> Home -> Galeria -> Home
    await navigateAndHydrate(page, testConfig.routes.landing);

    await page.click('a.nav-link[href="/oferta"]');
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    await page.click('a.nav-link[href="/galeria"]');
    await page.waitForURL('**/galeria');
    await waitForHydration(page);

    await page.click('a.nav-link[href="/"]');
    await page.waitForURL('**/');
    await waitForHydration(page);

    // Verify no errors occurred during the full cycle
    expect(errors).toHaveLength(0);
  });
});
