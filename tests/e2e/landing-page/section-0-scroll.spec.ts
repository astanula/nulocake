import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { scrollToDeterministicPosition } from '../helpers/scroll';
import { Section0Simulation } from './section-0-simulation';
import { computeExpectedStates } from '../helpers/animation-calculator';
import {
  EDGE_EPSILON_PX,
  TRIGGER_PX,
  WHEEL_QUIET_MS,
} from '../../../src/config/animation';

const VIEWPORT_HEIGHT = 900;

test.describe('Home Snap Section Navigation', () => {
  let hero: Section0Simulation;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: VIEWPORT_HEIGHT });
    hero = new Section0Simulation(page);
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);
    await hero.waitForSnapReady();
  });

  test('initial resting state shows Section 0, dot 0 current, scroll hint active, and footer dock inert', async ({ page }) => {
    await hero.assertActive(true);
    await hero.assertStates(computeExpectedStates(0));
    await expect(page.locator('[data-section-dot="0"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('[data-section-dot][aria-current="true"]')).toHaveCount(1);
    await expect(hero.hint).not.toHaveClass(/is-hidden/);
    await expect(hero.hint).toHaveJSProperty('inert', false);
    await expect(hero.dock).toHaveJSProperty('inert', true);
    await expect.poll(async () => (await hero.dock.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(VIEWPORT_HEIGHT);
  });

  test('ArrowDown / ArrowUp and PageDown / PageUp snap cleanly between adjacent sections', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#section-story')).toHaveClass(/is-active/);
    await hero.assertActive(false);
    await expect(page.locator('[data-section-dot="1"]')).toHaveAttribute('aria-current', 'true');
    await expect(hero.hint).not.toHaveClass(/is-hidden/);
    await expect(page.locator('#section-story .section-cta-group')).toHaveCSS('opacity', '1');

    await page.keyboard.press('PageDown');
    await expect(page.locator('#section-gallery')).toHaveClass(/is-active/);
    await expect(page.locator('[data-section-dot="2"]')).toHaveAttribute('aria-current', 'true');
    await expect(hero.hint).not.toHaveClass(/is-hidden/);

    await page.keyboard.press('PageUp');
    await expect(page.locator('#section-story')).toHaveClass(/is-active/);
    await expect(hero.hint).not.toHaveClass(/is-hidden/);

    await page.keyboard.press('ArrowUp');
    await hero.assertActive(true);
    await expect(page.locator('[data-section-dot="0"]')).toHaveAttribute('aria-current', 'true');
    await expect(hero.hint).not.toHaveClass(/is-hidden/);
    await hero.assertStates(computeExpectedStates(0));
  });

  test('Space and Shift+Space step sections while ignoring interactive controls', async ({ page }) => {
    await page.locator('#cta-oferta').focus();
    await page.keyboard.press('Space');
    await hero.assertActive(true);
    await expect(page.locator('[data-section-dot="0"]')).toHaveAttribute('aria-current', 'true');

    await hero.section0.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#section-story')).toHaveClass(/is-active/);
    await expect(hero.hint).not.toHaveClass(/is-hidden/);

    await page.keyboard.press('Shift+Space');
    await hero.assertActive(true);
    await expect(hero.hint).not.toHaveClass(/is-hidden/);
  });

  test('End and Home clamp at boundaries, toggle scroll hint, and slide the footer dock', async ({ page }) => {
    await page.keyboard.press('ArrowUp');
    await hero.assertActive(true);
    await expect(page.locator('[data-section-dot="0"]')).toHaveAttribute('aria-current', 'true');

    const contact = page.locator('#section-contact');
    await page.keyboard.press('End');
    await expect(contact).toHaveClass(/is-active/);
    await expect(contact.locator('.section-cta-group')).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-section-dot="4"]')).toHaveAttribute('aria-current', 'true');
    await expect(hero.hint).toHaveClass(/is-hidden/);
    await expect(hero.hint).toHaveJSProperty('inert', true);
    await expect(hero.dock).toHaveJSProperty('inert', false);
    await expect.poll(async () => (await hero.dock.boundingBox())?.y ?? Infinity).toBeLessThan(VIEWPORT_HEIGHT);

    await page.keyboard.press('ArrowDown');
    await expect(contact).toHaveClass(/is-active/);

    await page.keyboard.press('Home');
    await hero.assertActive(true);
    await expect(hero.hint).not.toHaveClass(/is-hidden/);
    await expect(hero.hint).toHaveJSProperty('inert', false);
    await expect(hero.dock).toHaveJSProperty('inert', true);
    await expect.poll(async () => (await hero.dock.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(VIEWPORT_HEIGHT);
  });

  test('section dots and scroll hint arrow navigate directly to target sections', async ({ page }) => {
    await hero.hint.click();
    await expect(page.locator('#section-story')).toHaveClass(/is-active/);
    await expect(hero.hint).not.toHaveClass(/is-hidden/);

    await page.locator('[data-section-dot="3"]').click();
    await expect(page.locator('#section-testimonials')).toHaveClass(/is-active/);
    await expect(page.locator('[data-section-dot="3"]')).toHaveAttribute('aria-current', 'true');
    await expect(hero.hint).not.toHaveClass(/is-hidden/);
  });

  test('wheel gestures require exceeding TRIGGER_PX in one gesture and coalesce momentum', async ({ page }) => {
    await page.mouse.wheel(0, TRIGGER_PX - 20);
    await hero.assertActive(true);

    await page.waitForTimeout(WHEEL_QUIET_MS + 40);
    await page.mouse.wheel(0, TRIGGER_PX - 20);
    await hero.assertActive(true);
    await expect(page.locator('[data-section-dot="0"]')).toHaveAttribute('aria-current', 'true');

    await page.waitForTimeout(WHEEL_QUIET_MS + 40);
    await page.evaluate(() => {
      for (const deltaY of [35, 35, 200]) {
        window.dispatchEvent(new WheelEvent('wheel', { deltaY, deltaMode: 0, bubbles: true, cancelable: true }));
      }
    });

    await expect(page.locator('#section-story')).toHaveClass(/is-active/);
    await expect(page.locator('[data-section-dot="1"]')).toHaveAttribute('aria-current', 'true');
    await expect(hero.hint).not.toHaveClass(/is-hidden/);

    await page.waitForTimeout(WHEEL_QUIET_MS + 40);
    await page.mouse.wheel(0, -(TRIGGER_PX + 20));
    await hero.assertActive(true);
    await expect(hero.hint).not.toHaveClass(/is-hidden/);
  });

  test('tall sections scroll window natively first and snap only after settling at the scroll edge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.evaluate(() => document.fonts.ready);
    const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(maxScroll).toBeGreaterThan(EDGE_EPSILON_PX);

    await page.evaluate((deltaY) => {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY, deltaMode: 0, bubbles: true, cancelable: true }));
    }, TRIGGER_PX + 20);
    await hero.assertActive(true);
    await expect(page.locator('[data-section-dot="0"]')).toHaveAttribute('aria-current', 'true');

    await scrollToDeterministicPosition(page, maxScroll);

    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#section-story')).toHaveClass(/is-active/);
    await expect(hero.hint).toHaveClass(/is-hidden/);
    await expect(hero.hint).toHaveJSProperty('inert', true);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});
