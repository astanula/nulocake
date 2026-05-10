import { test, expect, Locator } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { scrollToDeterministicPosition } from '../helpers/scroll';

test.describe('Section 0 (Hero) Scroll Animation', () => {
  test('Step 1: Initial State (Scroll: 0px)', async ({ page }) => {
    // 1. Navigate to the landing page
    await page.goto(testConfig.routes.landing);

    // 2. Wait for Astro hydration
    await waitForHydration(page);

    // 3. Wait for the time-based intro to finish (body overflow is restored)
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');

    // 3.5 Force deterministic scroll to 0px so ScrollTrigger properly updates
    await scrollToDeterministicPosition(page, 0);

    // 4. Assert initial state (Scroll: 0px)
    const section0 = page.locator('#section-hero');
    await expect(section0).toHaveClass(/is-active/);

    // Define elements (W1-W6, P1, CTA1)
    const words = section0.locator('.word');
    const blurIns = section0.locator('.blur-in');

    const w1 = words.nth(0);
    const w2 = words.nth(1);
    const w3 = words.nth(2);
    const w4 = words.nth(3);
    const w5 = words.nth(4);
    const w6 = words.nth(5);
    
    const p1 = blurIns.nth(0);
    const cta1 = blurIns.nth(1);

    // Helper for Fully Visible state
    const assertFullyVisible = async (locator: Locator) => {
      await expect(locator).toHaveCSS('opacity', '1');
      // GSAP sometimes sets filter to blur(0px) brightness(1) or blur(0.0003px), or computed style could be 'none'
      await expect(locator).toHaveCSS('filter', /none|blur\(0(?:\.\d+)?px\)\s*brightness\(1\)/);
      // Transform computed style could be 'none' or a matrix starting with scale=1
      await expect(locator).toHaveCSS('transform', /none|matrix(?:3d)?\(1,\s*0,\s*0/);
    };

    // Assert all elements are fully visible
    await assertFullyVisible(w1);
    await assertFullyVisible(w2);
    await assertFullyVisible(w3);
    await assertFullyVisible(w4);
    await assertFullyVisible(w5);
    await assertFullyVisible(w6);
    await assertFullyVisible(p1);
    await assertFullyVisible(cta1);
  });
});
