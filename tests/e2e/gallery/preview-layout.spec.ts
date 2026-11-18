import { test, expect } from '../fixtures/base-fixture';
import { waitForHydration } from '../helpers/hydration';
import { testConfig } from '../test-config';

test.describe('Gallery preview layout', () => {
  test('centers the image on all screen sizes and keeps the counter visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(testConfig.routes.galeria);
    await waitForHydration(page);
    await page.locator('.gallery-set-original .gallery-image-wrapper').first().click();

    const preview = page.locator('#gallery-preview');
    const hero = preview.locator('.gp-hero');
    const counter = preview.locator('.gp-counter');
    await expect(preview).toBeVisible();
    await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 390, height: 430 },
      { width: 500, height: 900 },
      { width: 820, height: 1180 },
      { width: 1032, height: 1376 },
      { width: 1365, height: 1024 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await expect.poll(async () => {
        const box = await hero.boundingBox();
        return box ? Math.abs(box.y + box.height / 2 - viewport.height / 2) : Infinity;
      }).toBeLessThan(1);

      const counterBox = await counter.boundingBox();
      expect(counterBox).not.toBeNull();
      expect(counterBox!.y + counterBox!.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});
