import { test, expect } from '../fixtures/base-fixture';
import { testConfig, navLinkSelector } from '../test-config';
import { waitForHydration } from '../helpers/hydration';

test.describe('Home gallery controls', () => {
  test('navigate the gallery and work after returning to Home', async ({ page }) => {
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);

    const openGallery = async () => {
      await page.locator('[data-section-dot="2"]').click();
      await expect(page.locator('#section-gallery')).toHaveClass(/is-active/);
    };
    const track = page.locator('#gallery-track');
    const prev = page.getByRole('button', { name: 'Poprzednie zdjęcia' });
    const next = page.getByRole('button', { name: 'Następne zdjęcia' });

    await openGallery();
    await expect(prev).toHaveAttribute('aria-disabled', 'true');
    await expect(next).toHaveAttribute('aria-disabled', 'false');
    await next.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await expect(prev).toHaveAttribute('aria-disabled', 'false');

    await track.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
    await expect(next).toHaveAttribute('aria-disabled', 'true');
    await prev.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(next).toHaveAttribute('aria-disabled', 'false');

    await page.locator(navLinkSelector('oferta')).click();
    await page.waitForURL('**/oferta');
    await page.locator(navLinkSelector('landing')).click();
    await page.waitForURL(`**${testConfig.routes.landing}`);
    await waitForHydration(page);
    await expect(page.locator('html')).toHaveClass(/home-snap-active/);
    await openGallery();
    await expect(next).toHaveAttribute('aria-disabled', 'false');
    await next.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('controls work on mobile with reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);

    const track = page.locator('#gallery-track');
    const prev = page.getByRole('button', { name: 'Poprzednie zdjęcia' });
    const next = page.getByRole('button', { name: 'Następne zdjęcia' });
    await expect(next).toHaveAttribute('aria-disabled', 'false');
    await next.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    await prev.click();
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBe(0);
    await expect(prev).toHaveAttribute('aria-disabled', 'true');
  });
});
