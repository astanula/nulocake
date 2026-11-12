import { test, expect } from '../fixtures/base-fixture';
import { testConfig, navLinkSelector } from '../test-config';
import { waitForHydration } from '../helpers/hydration';

/**
 * Tests for navigation behavior.
 *
 * Verifies that:
 * 1. Oferta page styling is preserved after multiple navigations
 * 2. Navigation triggers exactly once per click
 */
test.describe('Navigation', () => {
  /**
   * Helper: Navigate and wait for hydration
   */
  async function navigateAndHydrate(page: any, route: string) {
    await page.goto(route);
    await waitForHydration(page);
  }

  test('Oferta page styling is preserved after multiple navigations', async ({ page }) => {
    // Navigate: Home -> Oferta -> Home -> Oferta
    await navigateAndHydrate(page, testConfig.routes.landing);

    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Check Oferta page styling on first visit
    const contentSection1 = page.locator('.content-section').first();
    await expect(contentSection1).toBeVisible();
    const box1 = await contentSection1.boundingBox();
    expect(box1).not.toBeNull();
    expect(box1!.height).toBeGreaterThan(50);

    // Navigate away and back
    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    await page.click(navLinkSelector('oferta'));
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
    await page.click(navLinkSelector('oferta'));
    await page.waitForURL('**/oferta');
    await waitForHydration(page);

    // Verify no errors occurred during navigation
    expect(errors).toHaveLength(0);
    await expect(page).toHaveURL(/\/oferta/);

    // Click Home link
    await page.click(navLinkSelector('landing'));
    await page.waitForURL(`**${testConfig.routes.landing}`);
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
    await page.click(navLinkSelector('oferta'));
    await page.click(navLinkSelector('oferta'));
    await page.click(navLinkSelector('oferta'));

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
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);

    // Verify we're on the home page
    await expect(page).toHaveURL(testConfig.routes.landing);

    // Verify the home link has active class
    const homeLink = page.locator(navLinkSelector('landing'));
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

  test('mobile menu uses a single close toggle with keyboard access', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateAndHydrate(page, testConfig.routes.oferta);

    const toggle = page.locator('#nav-toggle');
    const navLinks = page.locator('#nav-links');
    await toggle.click();

    await expect(page.getByRole('button', { name: 'Zamknij menu' })).toHaveCount(1);
    await expect(navLinks.locator('button')).toHaveCount(0);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator(navLinkSelector('kontakt'))).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(toggle).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator(navLinkSelector('landing'))).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(navLinks).not.toHaveClass(/open/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toHaveAttribute('aria-label', 'Otwórz menu');
    await expect(toggle).toBeFocused();

    await toggle.click();
    await expect(navLinks).toHaveClass(/open/);
    await toggle.click();
    await expect(navLinks).not.toHaveClass(/open/);
  });

  test('order CTA is absent on Kontakt and returns after client navigation', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.kontakt);
    await expect(page.locator('#nav-cta')).toHaveCount(0);

    await page.click(navLinkSelector('oferta'));
    await page.waitForURL(`**${testConfig.routes.oferta}`);
    await waitForHydration(page);
    await expect(page.locator('#nav-cta')).toBeVisible();

    await page.click('#nav-cta');
    await page.waitForURL(`**${testConfig.routes.kontakt}`);
    await waitForHydration(page);
    await expect(page.locator('#nav-cta')).toHaveCount(0);
  });

  /**
   * Test: Verify limelight animation is triggered with correct GSAP parameters.
   * 
   * This test intercepts the GSAP animation call to ensure:
   * 1. The limelight element is the target of the gsap.to() call
   * 2. Animation duration is 0.4 seconds as specified
   * 3. Easing function is 'power2.inOut' as specified
   * 4. An onComplete callback is present (which triggers navigation after animation)
   * 5. Navigation to the target page occurs (proving onComplete fired)
   * 6. Intermediate position check: verifies the limelight actually moves during animation
   */
  test('limelight animation triggers with correct parameters', async ({ page }) => {
    await navigateAndHydrate(page, testConfig.routes.landing);

    // Get initial limelight position before animation
    const limelight = page.locator('#nav-limelight');
    const initialBox = await limelight.boundingBox();

    // Set up interception of gsap.to to capture limelight animation
    const animationPromise = page.evaluate(() => {
      return new Promise<{
        duration: number;
        ease: string;
        hasOnComplete: boolean;
        targetIsLimelight: boolean;
      }>((resolve) => {
        const limelight = document.getElementById('nav-limelight');
        const originalTo = window.gsap.to;
        
        window.gsap.to = function(target: any, vars: any) {
          // Check if this gsap.to call targets the limelight element
          const isLimelight = 
            target === limelight || 
            (target && target.id === 'nav-limelight');
          
          if (isLimelight) {
            resolve({
              duration: vars.duration,
              ease: vars.ease,
              hasOnComplete: typeof vars.onComplete === 'function',
              targetIsLimelight: true
            });
          }
          
          // Call original gsap.to with original arguments
          return originalTo.call(this, target, vars);
        };
      });
    });

    // Click Oferta link to trigger the animation
    await page.click(navLinkSelector('oferta'));
    
    // Wait for animation to start then check intermediate position
    await page.waitForTimeout(100);
    const intermediateBox = await limelight.boundingBox();
    
    // Verify animation is actually moving the limelight (intermediate position ≠ initial)
    expect(intermediateBox).not.toBeNull();
    expect(intermediateBox!.x).not.toEqual(initialBox!.x);
    
    // Wait for animation to be intercepted
    const params = await animationPromise;
    
    // Verify animation targets the correct element
    expect(params.targetIsLimelight).toBe(true);
    // Verify animation parameters
    expect(params.duration).toBe(0.4);
    expect(params.ease).toBe('power2.inOut');
    expect(params.hasOnComplete).toBe(true);
    
    // Verify navigation occurred (proves onComplete callback fired)
    await page.waitForURL('**/oferta');
    await expect(page).toHaveURL(/\/oferta/);
  });
});
