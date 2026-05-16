import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { Section0Simulation } from './section-0-simulation';
import { computeExpectedStates, isSection0Active } from '../helpers/animation-calculator';

test.describe('Section 0 (Hero) 0.5 WU Scroll Animation', () => {
  let hero: Section0Simulation;

  test.beforeEach(async ({ page }) => {
    hero = new Section0Simulation(page);
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
  });

  // Downward phase
  test('Step 0: Initial State (Scroll: 0px / 0 WU)', async () => {
    await hero.scrollToWU(0);
    await hero.assertActive(isSection0Active(0));
    await hero.assertStates(computeExpectedStates(0));
  });

  test('Step 1: Scroll 0.5 WU (Scroll: 20px)', async () => {
    await hero.scrollToWU(0.5);
    await hero.assertActive(isSection0Active(0.5));
    await hero.assertStates(computeExpectedStates(0.5));
  });

  test('Step 2: Scroll 1.0 WU (Scroll: 40px)', async () => {
    await hero.scrollToWU(1);
    await hero.assertActive(isSection0Active(1));
    await hero.assertStates(computeExpectedStates(1));
  });

  test('Step 3: Scroll 1.5 WU (Scroll: 60px)', async () => {
    await hero.scrollToWU(1.5);
    await hero.assertActive(isSection0Active(1.5));
    await hero.assertStates(computeExpectedStates(1.5));
  });

  test('Step 4: Scroll 2.0 WU (Scroll: 80px)', async () => {
    await hero.scrollToWU(2);
    await hero.assertActive(isSection0Active(2));
    await hero.assertStates(computeExpectedStates(2));
  });

  test('Step 5: Scroll 2.5 WU (Scroll: 100px)', async () => {
    await hero.scrollToWU(2.5);
    await hero.assertActive(isSection0Active(2.5));
    await hero.assertStates(computeExpectedStates(2.5));
  });

  test('Step 6: Scroll 3.0 WU (Scroll: 120px)', async () => {
    await hero.scrollToWU(3);
    await hero.assertActive(isSection0Active(3));
    await hero.assertStates(computeExpectedStates(3));
  });

  test('Step 7: Scroll 3.5 WU (Scroll: 140px)', async () => {
    await hero.scrollToWU(3.5);
    await hero.assertActive(isSection0Active(3.5));
    await hero.assertStates(computeExpectedStates(3.5));
  });

  test('Step 8: Scroll 4.0 WU (Scroll: 160px)', async () => {
    await hero.scrollToWU(4);
    await hero.assertActive(isSection0Active(4));
    await hero.assertStates(computeExpectedStates(4));
  });

  test('Step 9: Scroll 4.5 WU (Scroll: 180px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.assertActive(isSection0Active(4.5));
    await hero.assertStates(computeExpectedStates(4.5));
  });

  // Upward phase
  test('Step 10: Scroll back to 4.0 WU (Scroll: 160px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(4);
    await hero.assertActive(isSection0Active(4));
    await hero.assertStates(computeExpectedStates(4));
  });

  test('Step 11: Scroll back to 3.5 WU (Scroll: 140px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(3.5);
    await hero.assertActive(isSection0Active(3.5));
    await hero.assertStates(computeExpectedStates(3.5));
  });

  test('Step 12: Scroll back to 3.0 WU (Scroll: 120px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(3);
    await hero.assertActive(isSection0Active(3));
    await hero.assertStates(computeExpectedStates(3));
  });

  test('Step 13: Scroll back to 2.5 WU (Scroll: 100px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(2.5);
    await hero.assertActive(isSection0Active(2.5));
    await hero.assertStates(computeExpectedStates(2.5));
  });

  test('Step 14: Scroll back to 2.0 WU (Scroll: 80px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(2);
    await hero.assertActive(isSection0Active(2));
    await hero.assertStates(computeExpectedStates(2));
  });

  test('Step 15: Scroll back to 1.5 WU (Scroll: 60px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(1.5);
    await hero.assertActive(isSection0Active(1.5));
    await hero.assertStates(computeExpectedStates(1.5));
  });

  test('Step 16: Scroll back to 1.0 WU (Scroll: 40px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(1);
    await hero.assertActive(isSection0Active(1));
    await hero.assertStates(computeExpectedStates(1));
  });

  test('Step 17: Scroll back to 0.5 WU (Scroll: 20px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(0.5);
    await hero.assertActive(isSection0Active(0.5));
    await hero.assertStates(computeExpectedStates(0.5));
  });

  test('Step 18: Scroll back to 0 WU (Scroll: 0px)', async () => {
    await hero.scrollToWU(4.5);
    await hero.scrollToWU(0);
    await hero.assertActive(isSection0Active(0));
    await hero.assertStates(computeExpectedStates(0));
  });
});
