import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { Section0Simulation } from './section-0-simulation';
import {
  computeExpectedStates,
  getSection0HalfWUCheckpoints,
  getSection0SpanWU,
  isSection0Active,
} from '../helpers/animation-calculator';
import { SNAP_MS_PER_WU, WU_WORD } from '../../../src/config/animation';

const forwardCheckpoints = getSection0HalfWUCheckpoints();
const backwardCheckpoints = forwardCheckpoints
  .filter((wu) => wu < getSection0SpanWU())
  .reverse();

test.describe('Section 0 (Hero) Snap Transition WU Cascade', () => {
  let hero: Section0Simulation;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    hero = new Section0Simulation(page);
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);
    await hero.waitForSnapReady();
  });

  test('first word is halfway faded after half its configured WU duration during forward snap', async ({ page }) => {
    const handle = await hero.captureNextTransition();
    await page.keyboard.press('ArrowDown');
    await hero.seekForwardWU(handle, WU_WORD / 2);

    await expect.poll(async () =>
      hero.w1.evaluate((el) => parseFloat(window.getComputedStyle(el).opacity)),
    ).toBeCloseTo(0.5, 2);

    await hero.finishTransition(handle);
  });

  for (const wu of forwardCheckpoints) {
    test(`Forward snap cascade at ${wu} WU (${wu * SNAP_MS_PER_WU}ms)`, async ({ page }) => {
      const handle = await hero.captureNextTransition();
      await page.keyboard.press('ArrowDown');
      await hero.seekForwardWU(handle, wu);

      await hero.assertActive(isSection0Active(wu));
      await hero.assertStates(computeExpectedStates(wu));
      if (!isSection0Active(wu)) {
        await expect(page.locator('#section-story')).toHaveClass(/is-active/);
      }

      await hero.finishTransition(handle);
    });
  }

  for (const wu of backwardCheckpoints) {
    test(`Backward snap cascade at ${wu} WU`, async ({ page }) => {
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('#section-story')).toHaveClass(/is-active/);
      await expect(hero.hint).not.toHaveClass(/is-hidden/);

      const handle = await hero.captureNextTransition();
      await page.keyboard.press('ArrowUp');

      if (wu === 0) {
        await hero.finishTransition(handle);
      } else {
        await hero.seekBackwardWU(handle, wu);
      }

      await hero.assertActive(isSection0Active(wu));
      await hero.assertStates(computeExpectedStates(wu));

      if (wu !== 0) {
        await hero.finishTransition(handle);
      }
    });
  }
});
