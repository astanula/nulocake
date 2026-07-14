import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { hoverElement, leaveGallery, pauseGalleryLoop, waitForGalleryImages } from '../helpers/hover';

test.describe('Gallery Float Effect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(testConfig.routes.galeria);
    await waitForHydration(page);
    await waitForGalleryImages(page);
    await pauseGalleryLoop(page);
  });

  test('image wrapper has pointer cursor', async ({ page }) => {
    const wrapper = page.locator('.gallery-image-wrapper').first();
    await expect(wrapper).toHaveCSS('cursor', 'pointer');
  });

  test('hovering for less than delay does NOT trigger float', async ({ page }) => {
    const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
    await hoverElement(page, wrapper);
    // Wait less than the delay (accounting for GSAP timeScale speed-up)
    await page.waitForTimeout(50);
    await expect(wrapper).not.toHaveClass(/is-floating/);
  });

  test('hovering for full delay triggers float', async ({ page }) => {
    const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
    await hoverElement(page, wrapper);

    // With testConfig.animationTimeScale = 100, the 1000ms delay still uses
    // real setTimeout (not GSAP-controlled), so we need to wait for the full delay.
    // But GSAP animations complete nearly instantly.
    await page.waitForTimeout(1100);

    await expect(wrapper).toHaveClass(/is-floating/);

    // The parent column should be elevated
    const col = wrapper.locator(
      'xpath=ancestor::div[contains(@class,"gallery-column") and not(contains(@class,"gallery-column-inner"))]',
    );
    await expect(col).toHaveClass(/is-elevated/);
  });

  test('moving mouse away reverses the float animation', async ({ page }) => {
    const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
    await hoverElement(page, wrapper);
    await page.waitForTimeout(1100);

    // Float should be active
    await expect(wrapper).toHaveClass(/is-floating/);

    // Move pointer off the gallery container
    await leaveGallery(page);

    // Wait for the reverse animation to complete (near-instant due to timeScale)
    await page.waitForTimeout(200);

    // Float classes should be removed after reverse
    await expect(wrapper).not.toHaveClass(/is-floating/);
    const col = wrapper.locator(
      'xpath=ancestor::div[contains(@class,"gallery-column") and not(contains(@class,"gallery-column-inner"))]',
    );
    await expect(col).not.toHaveClass(/is-elevated/);
  });

  test('only one image can float at a time', async ({ page }) => {
    const wrappers = page.locator('.gallery-set-original .gallery-image-wrapper');
    const first = wrappers.nth(0);
    const second = wrappers.nth(1);

    // Float the first image
    await hoverElement(page, first);
    await page.waitForTimeout(1100);
    await expect(first).toHaveClass(/is-floating/);

    // Move to second image - the first should start reversing
    await hoverElement(page, second);
    await page.waitForTimeout(1100);

    // Only the second should be floating
    await expect(second).toHaveClass(/is-floating/);
    await expect(first).not.toHaveClass(/is-floating/);
  });

  test('cleanup on navigation removes float state', async ({ page }) => {
    const wrapper = page.locator('.gallery-set-original .gallery-image-wrapper').first();
    await hoverElement(page, wrapper);
    await page.waitForTimeout(1100);
    await expect(wrapper).toHaveClass(/is-floating/);

    // Navigate away
    await page.goto(testConfig.routes.landing);
    await waitForHydration(page);

    // Navigate back
    await page.goto(testConfig.routes.galeria);
    await waitForHydration(page);

    // No images should be floating
    const floatingCount = await page.locator('.is-floating').count();
    expect(floatingCount).toBe(0);

    const elevatedCount = await page.locator('.is-elevated').count();
    expect(elevatedCount).toBe(0);
  });
});
