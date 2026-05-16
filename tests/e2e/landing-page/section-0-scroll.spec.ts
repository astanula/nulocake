import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { Section0Simulation } from './section-0-simulation';
import { computeExpectedStates, isSection0Active } from '../helpers/animation-calculator';

test.describe('Section 0 (Hero) Scroll Animation', () => {
  let hero: Section0Simulation;

  test.beforeEach(async ({ page }) => {
    hero = new Section0Simulation(page);
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
  });

  test('Step 1: Initial State (Scroll: 0 WU)', async () => {
    await hero.scrollToWU(0);
    await hero.assertActive(isSection0Active(0));
    await hero.assertStates(computeExpectedStates(0));
  });

  test('Step 1.1: Press Arrow Down (Scroll: 1 WU)', async () => {
    await hero.scrollToWU(1);
    await hero.assertActive(isSection0Active(1));
    await hero.assertStates(computeExpectedStates(1));
  });

  test('Step 1.2: Press Arrow Down (Scroll: 2 WU)', async () => {
    await hero.scrollToWU(2);
    await hero.assertActive(isSection0Active(2));
    await hero.assertStates(computeExpectedStates(2));
  });

  test('Step 1.3: Press Arrow Down (Scroll: 3 WU)', async () => {
    await hero.scrollToWU(3);
    await hero.assertActive(isSection0Active(3));
    await hero.assertStates(computeExpectedStates(3));
  });

  test('Step 1.4: Press Arrow Down (Scroll: 4 WU)', async () => {
    await hero.scrollToWU(4);
    await hero.assertActive(isSection0Active(4));
    await hero.assertStates(computeExpectedStates(4));
  });

  test('Step 1.5: Press Arrow Down (Scroll: 5 WU)', async () => {
    await hero.scrollToWU(5);
    await hero.assertActive(isSection0Active(5));
    await hero.assertStates(computeExpectedStates(5));
  });

  test('Step 2.1: Press Arrow Up (Scroll: 4 WU)', async () => {
    // First scroll down past the section
    await hero.scrollToWU(5);
    // Then scroll back up
    await hero.scrollToWU(4);
    
    await hero.assertActive(isSection0Active(4));
    await hero.assertStates(computeExpectedStates(4));
  });

  test('Step 2.2: Press Arrow Up (Scroll: 3 WU)', async () => {
    await hero.scrollToWU(5);
    await hero.scrollToWU(3);

    await hero.assertActive(isSection0Active(3));
    await hero.assertStates(computeExpectedStates(3));
  });

  test('Step 2.3: Press Arrow Up (Scroll: 2 WU)', async () => {
    await hero.scrollToWU(5);
    await hero.scrollToWU(2);

    await hero.assertActive(isSection0Active(2));
    await hero.assertStates(computeExpectedStates(2));
  });

  test('Step 2.4: Press Arrow Up (Scroll: 1 WU)', async () => {
    await hero.scrollToWU(5);
    await hero.scrollToWU(1);

    await hero.assertActive(isSection0Active(1));
    await hero.assertStates(computeExpectedStates(1));
  });

  test('Step 2.5: Press Arrow Up (Scroll: 0 WU)', async () => {
    await hero.scrollToWU(5);
    await hero.scrollToWU(0);

    await hero.assertActive(isSection0Active(0));
    await hero.assertStates(computeExpectedStates(0));
  });
});

