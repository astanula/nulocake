import type { Locator, Page } from '@playwright/test';

/** Pause infinite-scroll GSAP tweens so gallery wrappers become hoverable. */
export async function pauseGalleryLoop(page: Page): Promise<void> {
  await page.evaluate(() => {
    const gsap = (window as { gsap?: { getTweensOf: (target: Element) => { pause: () => void }[] } }).gsap;
    if (!gsap) return;

    document.querySelectorAll('.gallery-column-inner').forEach((inner) => {
      gsap.getTweensOf(inner).forEach((tween) => tween.pause());
    });
  });
}

/**
 * Hover a gallery image wrapper via pointer events.
 * Playwright's hover() fails on continuously animated columns; mouse.move alone
 * does not reliably fire pointerover for the delegated gallery listener.
 */
export async function hoverElement(page: Page, locator: Locator): Promise<void> {
  await pauseGalleryLoop(page);

  await locator.evaluate((el) => {
    el.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = el.getBoundingClientRect();
    el.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    );
  });
}

/** Move pointer off the gallery container to end hover / float state. */
export async function leaveGallery(page: Page): Promise<void> {
  await page.evaluate(() => {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    container.dispatchEvent(
      new PointerEvent('pointerleave', {
        bubbles: true,
        pointerType: 'mouse',
      }),
    );
  });
}

/** Wait until gallery original-set images have finished loading. */
export async function waitForGalleryImages(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const images = Array.from(
      document.querySelectorAll('.gallery-set-original img'),
    ) as HTMLImageElement[];
    return images.length > 0 && images.every((img) => img.complete);
  });
}
