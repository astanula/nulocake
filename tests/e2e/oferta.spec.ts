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
  const mobileLayout = await layout.boundingBox();
  const mobileCard = await card.boundingBox();
  expect(mobileLayout).not.toBeNull();
  expect(mobileCard).not.toBeNull();
  expect(mobileCard!.x + mobileCard!.width).toBeLessThanOrEqual(mobileLayout!.x + mobileLayout!.width + 1);
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

for (const { width, thumbnailWidth, thumbnailHeight, padding } of [
  { width: 1280, thumbnailWidth: 32, thumbnailHeight: 31, padding: 6.5 },
  { width: 375, thumbnailWidth: 26, thumbnailHeight: 26, padding: 6 },
]) {
  test(`uses smaller thumbnails and compact vertical spacing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(testConfig.routes.oferta);
    await waitForHydration(page);

    const pick = page.locator('.flavor-pick').first();
    const thumbnail = pick.locator('.flavor-thumb');
    await expect(thumbnail).toHaveCSS('width', `${thumbnailWidth}px`);
    await expect(thumbnail).toHaveCSS('height', `${thumbnailHeight}px`);
    await expect(pick).toHaveCSS('padding-top', `${padding}px`);
    await expect(pick).toHaveCSS('padding-bottom', `${padding}px`);
    await expect(pick).toHaveCSS('min-height', 'auto');
  });
}

for (const width of [1280, 800, 375, 320]) {
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
