import { test, expect } from './fixtures/base-fixture';
import { testConfig } from './test-config';
import { waitForHydration } from './helpers/hydration';
import { scrollToDeterministicPosition } from './helpers/scroll';

const pages = [
  { name: 'home', route: testConfig.routes.landing, mark: '.section-dot-mark' },
  { name: 'oferta', route: testConfig.routes.oferta, mark: '.section-dot-mark' },
  { name: 'v2', route: `${testConfig.basePath}/v2`, mark: '.v2-dot-mark' },
];

const tiers = [
  { name: 'small mobile', width: 375, arrowWidth: 10, gap: '0.5rem', gapPx: 8 },
  { name: 'mobile', width: 600, arrowWidth: 10, gap: '0.5rem', gapPx: 8 },
  { name: 'tablet', width: 900, arrowWidth: 16, gap: '1rem', gapPx: 16 },
  { name: 'laptop', width: 1100, arrowWidth: 16, gap: '1rem', gapPx: 16 },
  { name: 'desktop', width: 1280, arrowWidth: 16, gap: '1.5rem', gapPx: 24 },
  { name: 'large desktop', width: 1600, arrowWidth: 16, gap: '1.5rem', gapPx: 24 },
];

for (const { name, route, mark } of pages) {
  test(`${name} keeps the arrow aligned below the dots across all viewport tiers`, async ({ page }) => {
    await page.setViewportSize({ width: tiers[0].width, height: 900 });
    await page.goto(route);
    await waitForHydration(page);
    const hint = page.locator('[data-scroll-hint]');
    await expect(hint).not.toHaveClass(/is-hidden/);
    await page.evaluate(() => document.fonts.ready);

    const chevron = hint.locator('.scroll-hint-chevron').first();
    await chevron.evaluate((element) => {
      const chevronElement = element as HTMLElement;
      chevronElement.style.animationPlayState = 'paused';
    });

    for (const tier of tiers) {
      await page.setViewportSize({ width: tier.width, height: 900 });
      const dotBox = await page.locator(mark).last().boundingBox();
      const arrowBox = await chevron.boundingBox();
      const targetBox = await hint.boundingBox();
      expect(dotBox, `${tier.name}: last dot`).not.toBeNull();
      expect(arrowBox, `${tier.name}: arrow`).not.toBeNull();
      expect(targetBox, `${tier.name}: target`).not.toBeNull();
      if (!dotBox || !arrowBox || !targetBox) throw new Error('Missing navigation geometry');

      expect(arrowBox.width, tier.name).toBeCloseTo(tier.arrowWidth, 0);
      expect(arrowBox.x + arrowBox.width / 2, tier.name).toBeCloseTo(dotBox.x + dotBox.width / 2, 0);
      const gap = await hint.evaluate((element) => getComputedStyle(element).getPropertyValue('--scroll-hint-gap').trim());
      expect(gap, tier.name).toBe(tier.gap);
      expect(arrowBox.y - (dotBox.y + dotBox.height), tier.name).toBeGreaterThanOrEqual(tier.gapPx - 0.5);
      expect(arrowBox.x, tier.name).toBeGreaterThanOrEqual(0);
      expect(targetBox.x, tier.name).toBeGreaterThanOrEqual(0);
      expect(targetBox.width, tier.name).toBeGreaterThanOrEqual(44);
    }
  });
}

test('short viewports shift the dots upward while keeping the arrow visible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 250 });
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);
  const hint = page.locator('[data-scroll-hint]');
  await expect(hint).not.toHaveClass(/is-hidden/);
  const dots = await page.locator('.section-dots').boundingBox();
  const target = await hint.boundingBox();
  expect(dots).not.toBeNull();
  expect(target).not.toBeNull();
  if (!dots || !target) throw new Error('Missing navigation geometry');
  expect(dots.y + dots.height / 2).toBeLessThan(125);
  expect(target.y + target.height).toBeLessThanOrEqual(250.5);
});

test('the home arrow stays fixed while a tall section scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto(testConfig.routes.landing);
  await waitForHydration(page);
  const hint = page.locator('[data-scroll-hint]');
  await expect(hint).not.toHaveClass(/is-hidden/);
  const initial = await hint.boundingBox();
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  expect(maxScroll).toBeGreaterThan(0);
  await scrollToDeterministicPosition(page, maxScroll);
  const scrolled = await hint.boundingBox();
  expect(initial).not.toBeNull();
  expect(scrolled).not.toBeNull();
  if (!initial || !scrolled) throw new Error('Missing arrow geometry');
  expect(scrolled.y).toBeCloseTo(initial.y, 0);
});

test('v2 shows the arrow until the last section even with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${testConfig.basePath}/v2`);
  await waitForHydration(page);
  const hint = page.locator('[data-scroll-hint]');
  await expect(hint).not.toHaveClass(/is-hidden/);
  await expect(hint.locator('.scroll-hint-chevron').first()).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('End');
  await expect(page.locator('[data-v2-dot="4"]')).toHaveAttribute('aria-current', 'true');
  await expect(hint).toHaveClass(/is-hidden/);
  await expect(hint).toHaveJSProperty('inert', true);
});

for (const { name, route } of pages.slice(0, 2)) {
  test(`${name} hides the rail with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    await waitForHydration(page);
    await expect(page.locator('.section-nav-rail')).toBeHidden();
  });
}
