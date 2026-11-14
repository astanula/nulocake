import { expect } from '../fixtures/base-fixture';
import type { JSHandle, Locator, Page } from '@playwright/test';
import type { gsap as GSAP } from 'gsap';
import { wuToSnapSeconds } from '../helpers/animation-calculator';

import {
  BLUR_MAX_PX,
  BRIGHTNESS_MIN,
  BRIGHTNESS_MAX,
} from '../../../src/config/animation';

export type TransitionHandle = JSHandle<{
  tl: ReturnType<(typeof GSAP)['timeline']> | null;
}>;

// Pre-compute expected CSS values for each state
const PARTIAL_BLUR_EXPECTED = BLUR_MAX_PX * 0.5; // 8px
const PARTIAL_BRIGHTNESS_EXPECTED = BRIGHTNESS_MIN + (BRIGHTNESS_MAX - BRIGHTNESS_MIN) * 0.5; // 0.8

// Build regex patterns dynamically from constants
const VISIBLE_FILTER_WORD = new RegExp(`none|blur\\(0(?:\\.\\d+)?px\\)\\s*brightness\\(${BRIGHTNESS_MAX}\\)`);
const VISIBLE_FILTER_BLUR = /none|blur\(0(?:\.\d+)?px\)/;

const PARTIAL_FILTER_WORD = new RegExp(
  `blur\\(${PARTIAL_BLUR_EXPECTED}(?:\\.\\d+)?px\\)\\s*brightness\\(${PARTIAL_BRIGHTNESS_EXPECTED.toFixed(1).replace('.', '\\.')}\\)`
);
const PARTIAL_FILTER_BLUR = new RegExp(
  `blur\\(${PARTIAL_BLUR_EXPECTED}(?:\\.\\d+)?px\\)`
);

const INVISIBLE_FILTER_WORD = new RegExp(
  `blur\\(${BLUR_MAX_PX}(?:\\.\\d+)?px\\)\\s*brightness\\(${BRIGHTNESS_MIN.toFixed(1).replace('.', '\\.')}\\)`
);
const INVISIBLE_FILTER_BLUR = new RegExp(`blur\\(${BLUR_MAX_PX}(?:\\.\\d+)?px\\)`);

export type ElementState = 'visible' | 'partially' | 'invisible';

export class Section0Simulation {
  public section0: Locator;
  public hint: Locator;
  public dock: Locator;
  public w1: Locator;
  public w2: Locator;
  public w3: Locator;
  public w4: Locator;
  public w5: Locator;
  public w6: Locator;
  public p1: Locator;
  public cta1: Locator;

  constructor(public readonly page: Page) {
    const section0 = page.locator('#section-hero');
    const words = section0.locator('.word');
    const blurIns = section0.locator('.blur-in');

    this.section0 = section0;
    this.hint = page.locator('[data-scroll-hint]');
    this.dock = page.locator('.home-footer-dock');
    this.w1 = words.nth(0);
    this.w2 = words.nth(1);
    this.w3 = words.nth(2);
    this.w4 = words.nth(3);
    this.w5 = words.nth(4);
    this.w6 = words.nth(5);
    this.p1 = blurIns.nth(0);
    this.cta1 = blurIns.nth(1);
  }

  async waitForSnapReady() {
    await expect(this.page.locator('body')).toHaveCSS('overflow', 'visible');
    await expect(this.page.locator('html')).toHaveClass(/home-snap-active/);
    await expect(this.hint).not.toHaveClass(/is-hidden/);
    await this.page.evaluate(() => document.fonts.ready);
  }

  async captureNextTransition(): Promise<TransitionHandle> {
    return await this.page.evaluateHandle(() => {
      const gsap = (window as Window & { gsap: typeof GSAP }).gsap;
      const originalTimeline = gsap.timeline;
      const state = { tl: null as ReturnType<typeof originalTimeline> | null };

      gsap.timeline = function (vars?: gsap.TimelineVars) {
        const tl = originalTimeline.call(this, vars);
        if (vars && typeof vars.onComplete === 'function') {
          state.tl = tl.pause();
          gsap.timeline = originalTimeline;
        }
        return tl;
      };

      return state;
    });
  }

  async seekForwardWU(handle: TransitionHandle, wu: number) {
    const timeS = wuToSnapSeconds(wu);
    await handle.evaluate((state, t) => {
      if (!state.tl) throw new Error('Expected a captured snap transition timeline');
      state.tl.totalTime(t, false);
    }, timeS);
  }

  async seekBackwardWU(handle: TransitionHandle, wu: number) {
    const remainingS = wuToSnapSeconds(wu);
    await handle.evaluate((state, rem) => {
      if (!state.tl) throw new Error('Expected a captured snap transition timeline');
      const target = Math.max(0, state.tl.duration() - rem);
      state.tl.totalTime(target, false);
    }, remainingS);
  }

  async finishTransition(handle: TransitionHandle) {
    await handle.evaluate((state) => {
      state.tl?.progress(1);
    });
    await handle.dispose();
  }

  async assertActive(isActive: boolean) {
    if (isActive) {
      await expect(this.section0).toHaveClass(/is-active/);
    } else {
      await expect(this.section0).not.toHaveClass(/is-active/);
    }
  }

  async assertStates(states: {
    w1?: ElementState;
    w2?: ElementState;
    w3?: ElementState;
    w4?: ElementState;
    w5?: ElementState;
    w6?: ElementState;
    p1?: ElementState;
    cta1?: ElementState;
  }) {
    // Default unspecified elements to 'visible' to keep tests extremely concise
    const fullStates = {
      w1: 'visible', w2: 'visible', w3: 'visible', w4: 'visible',
      w5: 'visible', w6: 'visible', p1: 'visible', cta1: 'visible',
      ...states
    } as Record<string, ElementState>;

    for (const [key, state] of Object.entries(fullStates)) {
      const locator = this[key as keyof Section0Simulation] as Locator;
      const isWord = key.startsWith('w'); // Words have brightness in filter, blur-in elements do not

      if (state === 'visible') {
        await expect(locator).toHaveCSS('opacity', '1');
        if (isWord) {
          await expect(locator).toHaveCSS('filter', VISIBLE_FILTER_WORD);
        } else {
          await expect(locator).toHaveCSS('filter', VISIBLE_FILTER_BLUR);
        }
        await expect(locator).toHaveCSS('transform', /none|matrix(?:3d)?\(1,\s*0,\s*0/);
      }
      else if (state === 'partially') {
        const opacity = await locator.evaluate(el => parseFloat(window.getComputedStyle(el).opacity));
        expect(opacity).toBeGreaterThan(0);
        expect(opacity).toBeLessThan(1);
      }
      else if (state === 'invisible') {
        await expect(locator).toHaveCSS('opacity', /^0(?:\.0+)?$/);
        if (isWord) {
          await expect(locator).toHaveCSS('filter', INVISIBLE_FILTER_WORD);
        } else {
          await expect(locator).toHaveCSS('filter', INVISIBLE_FILTER_BLUR);
        }
      }
    }
  }
}
