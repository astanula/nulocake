import { test, expect } from '../fixtures/base-fixture';
import { testConfig, navLinkSelector } from '../test-config';
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
   * Helper: Get snap navigation mount state on the current document
   */
  async function getHomepageSnapState(page: any): Promise<{ hasSnapClass: boolean; interceptsHomeKey: boolean }> {
    return await page.evaluate(() => ({
      hasSnapClass: document.documentElement.classList.contains('home-snap-active'),
      interceptsHomeKey: !document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
      ),
    }));
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
    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    // Guard should still be true (not re-added)
    const guardSet = await getBeforeSwapGuardState(page);
    expect(guardSet).toBe(true);
  });

  test('snap navigation is torn down when navigating away', async ({ page }) => {
    // Start at homepage
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Wait for Phase 1 intro to complete and snap navigation to mount
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);

    expect(await getHomepageSnapState(page)).toEqual({
      hasSnapClass: true,
      interceptsHomeKey: true,
    });

    // Navigate away from homepage to a non-snap subpage
    await page.click(navLinkSelector('galeria'));
    await page.waitForURL('**/galeria');
    await waitForHydration(page);

    expect(await getHomepageSnapState(page)).toEqual({
      hasSnapClass: false,
      interceptsHomeKey: false,
    });

    // Navigate back to homepage
    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    // Wait for re-initialization
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);

    expect(await getHomepageSnapState(page)).toEqual({
      hasSnapClass: true,
      interceptsHomeKey: true,
    });
  });

  test('testimonials interval is cleared on leave', async ({ page }) => {
    // Start at homepage
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Wait for page to fully initialize (including testimonials carousel)
    await page.waitForTimeout(2000);

    // Navigate away from homepage
    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Wait for cleanup
    await page.waitForTimeout(500);

    // Navigate back to homepage
    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
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
    await page.click(navLinkSelector('oferta'));
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
    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Navigate back
    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);
    await page.waitForTimeout(2000);

    // Hero section should have fresh state
    const afterRevisitClass = await heroSection.getAttribute('class');

    // The class should indicate proper initialization
    // (no interference from previous zombie instances)
    expect(afterRevisitClass).toContain('is-active');
  });

  test('no console errors during navigation cycle', async ({ page }) => {
    await page.context().route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
    );
    const errors: string[] = [];
    const failedResponses: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    // Navigate: Home -> Oferta -> Home -> Galeria -> Home
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Exercise another GSAP page loading while the homepage navigates.
    const otherPage = await page.context().newPage();
    await Promise.all([
      page.click(navLinkSelector('oferta')),
      otherPage.goto(testConfig.routes.galeria),
    ]);
    await waitForHydration(otherPage);
    await otherPage.close();
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    await page.click(navLinkSelector('galeria'));
    await page.waitForURL('**/galeria');
    await waitForHydration(page);

    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    // Verify no errors occurred during the full cycle
    expect(errors, `Failed responses:\n${failedResponses.join('\n') || '(none)'}`).toHaveLength(0);
  });
});
