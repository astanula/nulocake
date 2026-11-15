import { test, expect } from './fixtures/base-fixture';
import { testConfig } from './test-config';
import { waitForHydration } from './helpers/hydration';
import { scrollToDeterministicPosition } from './helpers/scroll';
import { Section0Simulation } from './landing-page/section-0-simulation';

const pages = [
  { name: 'home', route: testConfig.routes.landing, section: '.hero-section' },
  { name: 'oferta', route: testConfig.routes.oferta, section: '.oferta-section' },
];

const tiers = [
  { name: 'small mobile', width: 375, arrowWidth: 10 },
  { name: 'mobile', width: 600, arrowWidth: 10 },
  { name: 'tablet', width: 900, arrowWidth: 16 },
  { name: 'laptop', width: 1100, arrowWidth: 16 },
  { name: 'desktop', width: 1280, arrowWidth: 16 },
  { name: 'large desktop', width: 1600, arrowWidth: 16 },
];

for (const { name, route, section } of pages) {
  test(`${name} centers the fixed hint and left dots at every viewport tier`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    await waitForHydration(page);
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);
    await page.evaluate(() => document.fonts.ready);

    const hint = page.locator('[data-scroll-hint]');
    const chevron = hint.locator('.scroll-hint-chevron').first();
    await chevron.evaluate((el) => { (el as HTMLElement).style.animationPlayState = 'paused'; });

    for (const tier of tiers) {
      await page.setViewportSize({ width: tier.width, height: 900 });
      const main = await page.locator('main').boundingBox();
      const target = await hint.boundingBox();
      const arrow = await chevron.boundingBox();
      const dots = await page.locator('.section-dots').boundingBox();
      const marks = await page.locator('.section-dot-mark').evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return rect.x + rect.width / 2;
        }),
      );
      if (!main || !target || !arrow || !dots) throw new Error('Missing navigation geometry');

      expect(target.x + target.width / 2, tier.name).toBeCloseTo(main.x + main.width / 2, 0);
      expect(target.y + target.height, tier.name).toBeCloseTo(900 - 24, 0);
      expect(target.width, tier.name).toBeGreaterThanOrEqual(44);
      expect(target.height, tier.name).toBeGreaterThanOrEqual(44);
      expect(arrow.width, tier.name).toBeCloseTo(tier.arrowWidth, 0);
      expect(dots.y + dots.height / 2, tier.name).toBeCloseTo(450, 0);
      for (const center of marks) expect(center, tier.name).toBeCloseTo(marks[0], 0);
    }
  });

  test(`${name} hides the hint on the last section`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(route);
    await waitForHydration(page);
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);
    await page.keyboard.press('End');
    await expect(page.locator(section).last()).toHaveClass(/is-active/);
    const hint = page.locator('[data-scroll-hint]');
    await expect(hint).toHaveClass(/is-hidden/);
    await expect(hint).toHaveJSProperty('inert', true);
  });

  test(`${name} hides dots and hint with reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    await waitForHydration(page);
    await expect(page.locator('.section-dots')).toBeHidden();
    await expect(page.locator('[data-scroll-hint]')).toBeHidden();
  });
}

test('home shows the hint immediately on a short section and advances on click', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(testConfig.routes.landing);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  const hint = page.locator('[data-scroll-hint]');
  await expect(hint).not.toHaveClass(/is-hidden/);
  await expect(hint).toHaveJSProperty('inert', false);
  await hint.click();
  await expect(page.locator('#section-story')).toHaveClass(/is-active/);
});

test('the hint advances without scrolling through trailing section padding', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(testConfig.routes.landing);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.locator('#section-hero').evaluate((el) => { (el as HTMLElement).style.paddingBottom = '40rem'; });
  expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeGreaterThan(0);
  const hint = page.locator('[data-scroll-hint]');
  await expect(hint).not.toHaveClass(/is-hidden/);
  await hint.click();
  await expect(page.locator('#section-story')).toHaveClass(/is-active/);
});

test('the hint stays hidden during transitions and restores focus when the next hint is visible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(testConfig.routes.landing);
  await waitForHydration(page);
  const hero = new Section0Simulation(page);
  await hero.waitForSnapReady();
  const transition = await hero.captureNextTransition();
  await hero.hint.focus();
  await hero.hint.evaluate((el) => (el as HTMLElement).click());
  await expect(hero.hint).toHaveClass(/is-hidden/);
  await expect(hero.hint).toHaveJSProperty('inert', true);
  await hero.finishTransition(transition);
  await expect(hero.hint).not.toHaveClass(/is-hidden/);
  await expect(hero.hint).toBeFocused();
});

test('home gates the fixed hint on the last item while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 320 });
  await page.goto(testConfig.routes.landing);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.evaluate(() => document.fonts.ready);

  const hint = page.locator('[data-scroll-hint]');
  const cta = page.locator('#section-hero .section-cta-group');
  await expect(hint).toHaveClass(/is-hidden/);
  await expect(hint).toHaveJSProperty('inert', true);
  const initial = await hint.boundingBox();
  const distance = await cta.evaluate((el) => el.getBoundingClientRect().bottom - window.innerHeight);
  expect(distance).toBeGreaterThan(10);

  await scrollToDeterministicPosition(page, distance / 2);
  await expect(hint).toHaveClass(/is-hidden/);
  await scrollToDeterministicPosition(page, Math.ceil(distance) + 1);
  await expect(hint).not.toHaveClass(/is-hidden/);
  await expect(hint).toHaveJSProperty('inert', false);
  const scrolled = await hint.boundingBox();
  const ctaBox = await cta.boundingBox();
  if (!initial || !scrolled || !ctaBox) throw new Error('Missing hint or CTA geometry');
  expect(scrolled.y).toBeCloseTo(initial.y, 0);
  expect(ctaBox.y + ctaBox.height).toBeGreaterThan(scrolled.y);

  await scrollToDeterministicPosition(page, 0);
  await expect(hint).toHaveClass(/is-hidden/);
  await expect(hint).toHaveJSProperty('inert', true);
});

test('hint focus moves to a tall destination section', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await page.goto(testConfig.routes.landing);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.evaluate(() => document.fonts.ready);
  const hint = page.locator('[data-scroll-hint]');
  const distance = await page.locator('#section-hero .section-cta-group').evaluate(
    (el) => el.getBoundingClientRect().bottom - window.innerHeight,
  );
  await scrollToDeterministicPosition(page, Math.ceil(distance) + 1);
  await expect(hint).not.toHaveClass(/is-hidden/);
  await hint.focus();
  await hint.evaluate((el) => (el as HTMLElement).click());
  await expect(page.locator('#section-story')).toHaveClass(/is-active/);
  await expect(page.locator('#section-story')).toBeFocused();
  await expect(hint).toHaveClass(/is-hidden/);
  await expect(hint).toHaveJSProperty('inert', true);
});

test('the testimonials carousel is used as the last item when there is no CTA', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 480 });
  await page.goto(testConfig.routes.landing);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.locator('[data-section-dot="3"]').click();
  const section = page.locator('#section-testimonials');
  await expect(section).toHaveClass(/is-active/);
  const carousel = section.locator('.testimonials-carousel');
  await expect(carousel).toHaveCSS('opacity', '1');
  const distance = await carousel.evaluate((el) => el.getBoundingClientRect().bottom - window.innerHeight);
  expect(distance).toBeGreaterThan(0);
  const hint = page.locator('[data-scroll-hint]');
  await expect(hint).toHaveClass(/is-hidden/);
  await scrollToDeterministicPosition(page, Math.ceil(distance) + 1);
  await expect(hint).not.toHaveClass(/is-hidden/);
});

test('oferta responds to mobile accordion expansion without a scroll event', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 600 });
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);
  await expect(page.locator('html')).toHaveClass(/home-snap-active/);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html { overflow-anchor: none; }' });

  const hint = page.locator('[data-scroll-hint]');
  const cta = page.locator('.oferta-section').first().locator('.section-cta-group');
  const distance = await cta.evaluate((el) => el.getBoundingClientRect().bottom - window.innerHeight);
  await scrollToDeterministicPosition(page, Math.max(0, Math.ceil(distance) + 1));
  await expect(hint).not.toHaveClass(/is-hidden/);
  const scrollY = await page.evaluate(() => window.scrollY);

  await page.locator('.flavor-accordion-item summary').first().evaluate((el) => (el as HTMLElement).click());
  await expect(page.locator('.flavor-accordion-item').first()).toHaveAttribute('open', '');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  await expect(hint).toHaveClass(/is-hidden/);
  await expect(hint).toHaveJSProperty('inert', true);
  const expandedDistance = await cta.evaluate((el) => el.getBoundingClientRect().bottom - window.innerHeight);
  expect(expandedDistance).toBeGreaterThan(0);
  await scrollToDeterministicPosition(page, scrollY + Math.ceil(expandedDistance) + 1);
  await expect(hint).not.toHaveClass(/is-hidden/);
});
