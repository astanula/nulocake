import { test, expect } from './fixtures/base-fixture';
import { waitForHydration } from './helpers/hydration';
import { testConfig } from './test-config';
import { CAKE_FLAVORS } from '../../src/config/cakeFlavors';

test('selects the first flavor and updates its details when the selection changes', async ({ page }) => {
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);

  const [first, second] = CAKE_FLAVORS;
  const firstRadio = page.getByRole('radio', { name: first.name });
  const secondRadio = page.getByRole('radio', { name: second.name });
  const firstPanel = page.locator(`[data-flavor-panel="${first.id}"]`);
  const secondPanel = page.locator(`[data-flavor-panel="${second.id}"]`);

  await expect(firstRadio).toBeChecked();
  await expect(firstPanel).toBeVisible();
  await expect(secondPanel).toBeHidden();

  await secondRadio.check();
  await expect(secondRadio).toBeChecked();
  await expect(firstPanel).toBeHidden();
  await expect(secondPanel).toBeVisible();
  await expect(page.locator('[data-flavor-status]')).toHaveText(`Pokazuję warstwy smaku: ${second.name}.`);
});

test('uses the pink accent and keeps the details panel within its content area', async ({ page }) => {
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);

  await expect(page.locator('#flavor-hint')).toHaveCSS('color', 'rgb(255, 170, 248)');
  await expect(page.locator('.section-heading-accent')).toHaveCSS('color', 'rgb(255, 170, 248)');

  const layout = page.locator('.flavor-layout');
  const card = page.locator('#flavor-card');
  const layoutBox = await layout.boundingBox();
  const cardBox = await card.boundingBox();
  expect(layoutBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(cardBox!.x + cardBox!.width).toBeLessThan(layoutBox!.x + layoutBox!.width - 1);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('.flavor-accordion-item summary').first().click();
  const mobileSelector = await page.locator('[data-flavor-selector]').boundingBox();
  const mobilePanel = await page.locator('.flavor-accordion-item[open] .flavor-accordion-panel').boundingBox();
  expect(mobileSelector).not.toBeNull();
  expect(mobilePanel).not.toBeNull();
  expect(mobilePanel!.x + mobilePanel!.width).toBeLessThanOrEqual(mobileSelector!.x + mobileSelector!.width + 1);
});

test('switches to an exclusive accordion without flavor titles on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);

  const [first, second] = CAKE_FLAVORS;
  const firstItem = page.locator(`[data-flavor-accordion="${first.id}"]`);
  const secondItem = page.locator(`[data-flavor-accordion="${second.id}"]`);

  await expect(page.locator('.flavor-layout')).toBeHidden();
  await expect(page.locator('.flavor-accordion-item[open]')).toHaveCount(0);

  await firstItem.locator('summary').click();
  await expect(firstItem).toHaveAttribute('open', '');
  await expect(firstItem.locator('.flavor-accordion-panel')).toBeVisible();
  await expect(firstItem.locator('.flavor-accordion-panel h3')).toHaveCount(0);

  await secondItem.locator('summary').click();
  await expect(secondItem).toHaveAttribute('open', '');
  await expect(firstItem).not.toHaveAttribute('open', '');

  const gaps = await secondItem.locator('.flavor-accordion-panel').evaluate((panel) => {
    const panelBox = panel.getBoundingClientRect();
    const style = getComputedStyle(panel);
    return {
      top: panel.querySelector('.flavor-eyebrow')!.getBoundingClientRect().top - panelBox.top - parseFloat(style.borderTopWidth),
      bottom: panelBox.bottom - panel.querySelector('.layer-map')!.getBoundingClientRect().bottom,
    };
  });
  expect(gaps.top).toBeCloseTo(gaps.bottom, 0);
});

test('sizes the small-screen accordion to the details panel width', async ({ page }) => {
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);
  const cardWidth = await page.locator('#flavor-card').evaluate((card) => card.getBoundingClientRect().width);

  await page.setViewportSize({ width: 700, height: 812 });
  const accordionWidth = await page.locator('.flavor-accordion').evaluate((list) => list.getBoundingClientRect().width);
  expect(accordionWidth).toBeCloseTo(cardWidth, 1);
});

test('sizes the flavor list to its longest name', async ({ page }) => {
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);
  await page.evaluate(() => document.fonts.ready);

  const dimensions = await page.locator('.flavor-pick-list').evaluate((list) => {
    const pick = list.querySelector<HTMLElement>('.flavor-pick')!;
    const style = getComputedStyle(pick);
    const nameWidths = Array.from(list.querySelectorAll('.flavor-pick-name'), (name) => {
      const range = document.createRange();
      range.selectNodeContents(name);
      return range.getBoundingClientRect().width;
    });
    const expected = Math.max(...nameWidths)
      + pick.querySelector('.flavor-thumb')!.getBoundingClientRect().width
      + pick.querySelector('.flavor-pick-mark')!.getBoundingClientRect().width
      + 2 * parseFloat(style.columnGap)
      + parseFloat(style.paddingLeft)
      + parseFloat(style.paddingRight);
    return { actual: list.getBoundingClientRect().width, expected };
  });

  expect(Math.abs(dimensions.actual - dimensions.expected)).toBeLessThan(1);
});

test('keeps the flavor note on one line when space allows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 812 });
  await page.goto(testConfig.routes.oferta);
  await waitForHydration(page);
  await page.evaluate(() => document.fonts.ready);

  const note = page.locator('.flavor-note');
  const lineCount = () => note.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return new Set(Array.from(range.getClientRects(), (rect) => rect.top)).size;
  });

  expect(await lineCount()).toBe(1);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await lineCount()).toBeGreaterThan(1);
});

for (const { width, selector } of [
  { width: 1280, selector: '.flavor-pick-list .flavor-pick' },
  { width: 375, selector: '.flavor-accordion .flavor-pick' },
]) {
  test(`uses the same compact flavor rows at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(testConfig.routes.oferta);
    await waitForHydration(page);

    const [thumbnailWidth, thumbnailHeight, padding] = [32, 31, 6.5];
    const pick = page.locator(selector).first();
    const thumbnail = pick.locator('.flavor-thumb');
    await expect(thumbnail).toHaveCSS('width', `${thumbnailWidth}px`);
    await expect(thumbnail).toHaveCSS('height', `${thumbnailHeight}px`);
    await expect(pick).toHaveCSS('padding-top', `${padding}px`);
    await expect(pick).toHaveCSS('padding-bottom', `${padding}px`);
    // Include the top border and avoid layout-dependent min-height serialization.
    await expect(pick).toHaveCSS('height', `${thumbnailHeight + 2 * padding + 1}px`);
  });
}

for (const width of [375, 320]) {
  test(`keeps the cake drawing and accordion panel the same width for every flavor at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(testConfig.routes.oferta);
    await waitForHydration(page);

    const widths: { cake: number; panel: number }[] = [];
    for (const flavor of CAKE_FLAVORS) {
      const item = page.locator(`[data-flavor-accordion="${flavor.id}"]`);
      await item.locator('summary').click();
      const panel = item.locator('.flavor-accordion-panel');
      await expect(panel).toBeVisible();
      widths.push({
        cake: await panel.locator('.layer-map-cake').evaluate((element) => element.getBoundingClientRect().width),
        panel: await panel.evaluate((element) => element.getBoundingClientRect().width),
      });
    }

    for (const { cake, panel } of widths) {
      expect(cake).toBeCloseTo(widths[0].cake, 1);
      expect(panel).toBeCloseTo(widths[0].panel, 1);
    }
  });
}

for (const width of [1280, 800]) {
  test(`keeps the cake drawing and details panel the same width for every flavor at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(testConfig.routes.oferta);
    await waitForHydration(page);

    const cake = page.locator('.flavor-panel:not([hidden]) .layer-map-cake');
    const card = page.locator('#flavor-card');
    const referenceWidth = await cake.evaluate((element) => element.getBoundingClientRect().width);
    const referenceCardWidth = await card.evaluate((element) => element.getBoundingClientRect().width);

    for (const flavor of CAKE_FLAVORS) {
      await page.getByRole('radio', { name: flavor.name, exact: true }).check();
      await expect(page.locator(`[data-flavor-panel="${flavor.id}"]`)).toBeVisible();
      const drawingWidth = await cake.evaluate((element) => element.getBoundingClientRect().width);
      expect(drawingWidth).toBeCloseTo(referenceWidth, 1);
      const cardWidth = await card.evaluate((element) => element.getBoundingClientRect().width);
      expect(cardWidth).toBeCloseTo(referenceCardWidth, 1);
    }
  });
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('renders the first selection and its details immediately', async ({ page }) => {
    await page.goto(testConfig.routes.oferta);

    const first = CAKE_FLAVORS[0];
    await expect(page.getByRole('radio', { name: first.name })).toBeChecked();
    await expect(page.locator(`[data-flavor-panel="${first.id}"]`)).toBeVisible();
  });
});
