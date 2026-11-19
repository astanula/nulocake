import { test, expect } from './fixtures/base-fixture';
import { waitForHydration } from './helpers/hydration';
import { scrollToDeterministicPosition } from './helpers/scroll';
import { testConfig, navLinkSelector } from './test-config';

test('about navigates with the hint, dots, and keys while keeping the portrait visible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(testConfig.routes.oMnie);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.evaluate(() => document.fonts.ready);

  const intro = page.locator('.about-intro');
  const contact = page.locator('.about-contact');
  const hint = page.locator('[data-scroll-hint]');
  const dock = page.locator('.home-footer-dock');
  const dots = page.locator('[data-section-dot]');
  await expect(dots).toHaveCount(2);
  await expect(intro).toBeVisible();
  await expect(contact).toBeHidden();
  await expect(page.locator('.scroll-container')).toHaveCount(0);
  await expect(dock).toHaveJSProperty('inert', true);
  await expect(hint).not.toHaveClass(/is-hidden/);

  await hint.click();
  await expect(contact.locator('.contact-actions')).toHaveCSS('opacity', '1');
  await expect(intro).toBeHidden();
  await expect(contact).toBeFocused();
  await expect(dots.last()).toHaveAttribute('aria-current', 'true');
  await expect(dock).toHaveJSProperty('inert', false);
  await expect(hint).toHaveClass(/is-hidden/);
  await expect(page.locator('.portrait-image')).toBeInViewport();

  await dots.first().click();
  await expect(intro.locator('.word').first()).toHaveCSS('opacity', '1');
  await expect(contact).toBeHidden();
  await expect(dock).toHaveJSProperty('inert', true);

  await page.keyboard.press('End');
  await expect(contact.locator('.contact-actions')).toHaveCSS('opacity', '1');
  await page.keyboard.press('Home');
  await expect(intro.locator('.word').first()).toHaveCSS('opacity', '1');
  await expect(dots.first()).toHaveAttribute('aria-current', 'true');
});

test('about scrolls tall sections natively before snapping at the edge', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await page.goto(testConfig.routes.oMnie);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.evaluate(() => document.fonts.ready);

  const intro = page.locator('.about-intro');
  const hint = page.locator('[data-scroll-hint]');
  await expect(hint).toHaveClass(/is-hidden/);
  await page.keyboard.press('PageDown');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(intro).toHaveClass(/is-active/);

  const bottom = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  await scrollToDeterministicPosition(page, bottom);
  await expect(hint).not.toHaveClass(/is-hidden/);
  await page.keyboard.press('PageDown');
  await expect(page.locator('.about-contact .contact-actions')).toHaveCSS('opacity', '1');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('about restores static content on reduced motion and remounts snapping when re-enabled', async ({ page }) => {
  await page.goto(testConfig.routes.oMnie);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.keyboard.press('End');
  await expect(page.locator('.contact-actions')).toHaveCSS('opacity', '1');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).not.toHaveClass(/home-snap-active/);
  await expect(page.locator('.about-intro')).toBeVisible();
  await expect(page.locator('.about-contact')).toBeVisible();
  await expect(page.locator('.intro-lead')).toHaveCSS('opacity', '1');
  await expect(page.locator('.section-dots')).toBeHidden();
  await expect(page.locator('[data-scroll-hint]')).toBeHidden();
  await expect(page.locator('.home-footer-dock')).toHaveCSS('position', 'static');
  await expect(page.locator('.home-footer-dock')).toHaveJSProperty('inert', false);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await expect(page.locator('.about-intro')).toHaveClass(/is-active/);
  await expect(page.locator('.about-contact')).toBeHidden();
  await page.keyboard.press('End');
  await expect(page.locator('.contact-actions')).toHaveCSS('opacity', '1');
});

test('about cleans up snapping on page swaps and initializes again on return', async ({ page }) => {
  await page.goto(testConfig.routes.oMnie);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);

  for (const route of ['oferta', 'oMnie', 'kontakt'] as const) {
    await page.locator(navLinkSelector(route)).click();
    await page.waitForURL(`**${testConfig.routes[route]}`);
    await waitForHydration(page);
    if (route !== 'kontakt') {
      await expect(page.locator('html')).toHaveClass(/home-snap-active/);
      const section = route === 'oMnie' ? '.about-section' : '.oferta-section';
      await expect(page.locator(section).first()).toHaveClass(/is-active/);
      await page.keyboard.press('End');
      await expect(page.locator(section).last()).toHaveClass(/is-active/);
      await expect(page.locator(section).last().locator('.section-cta-group')).toHaveCSS('opacity', '1');
    }
  }

  await expect(page.locator('html')).not.toHaveClass(/home-snap-active/);
  const nativeHomeKey = await page.evaluate(() => document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
  ));
  expect(nativeHomeKey).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).not.toHaveClass(/home-snap-active/);
});
