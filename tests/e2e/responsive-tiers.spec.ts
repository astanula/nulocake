import { test, expect } from './fixtures/base-fixture';
import { waitForHydration } from './helpers/hydration';
import { testConfig } from './test-config';
import {
  CUSTOM_MEDIA,
  TIER_MIN_WIDTH_PX,
  VIEWPORT_TIER_ORDER,
  VIEWPORT_TIERS,
  type ViewportTierId,
} from '../../src/config/responsive';
import { GALLERY_COLUMNS_BY_TIER } from '../../src/config/gallery';

const VIEWPORT_HEIGHT = 800;

const viewportBoundaryCases: ReadonlyArray<{
  width: number;
  tier: ViewportTierId;
}> = [
  { width: TIER_MIN_WIDTH_PX.mobile - 1, tier: 'small-mobile' },
  { width: TIER_MIN_WIDTH_PX.mobile, tier: 'mobile' },
  { width: TIER_MIN_WIDTH_PX.tablet - 1, tier: 'mobile' },
  { width: TIER_MIN_WIDTH_PX.tablet, tier: 'tablet' },
  { width: TIER_MIN_WIDTH_PX.laptop - 1, tier: 'tablet' },
  { width: TIER_MIN_WIDTH_PX.laptop, tier: 'laptop' },
  { width: TIER_MIN_WIDTH_PX.desktop - 1, tier: 'laptop' },
  { width: TIER_MIN_WIDTH_PX.desktop, tier: 'desktop' },
  { width: TIER_MIN_WIDTH_PX.largeDesktop - 1, tier: 'desktop' },
  { width: TIER_MIN_WIDTH_PX.largeDesktop, tier: 'large-desktop' },
];

test('hydrates Design System clamp formulas and reports every viewport tier boundary', async ({
  page,
}) => {
  await page.goto(testConfig.routes.kontakt);
  await waitForHydration(page);

  await page.locator('[data-ds-trigger]').click();
  await expect(page.locator('[data-ds-tooltip]')).toBeVisible();

  const sectionClamps = page.locator('[data-ds-section-clamp]');
  await expect(sectionClamps).toHaveCount(3);
  await expect(sectionClamps.nth(0)).toHaveText(
    /^large-desktop–tablet: clamp\(.+\) · mobile–small-mobile: clamp\(.+\)$/,
  );
  await expect(sectionClamps.nth(1)).toHaveText(/^All tiers: clamp\(.+\)$/);
  await expect(sectionClamps.nth(2)).toHaveText(/^All tiers: clamp\(.+\)$/);
  for (let i = 0; i < 3; i++) {
    await expect(sectionClamps.nth(i)).not.toContainText('var(');
  }

  const viewportPill = page.locator('[data-ds-viewport]');
  const tierRows = page.locator('[data-ds-tier]');
  const activeTierRows = page.locator('[data-ds-tier][data-active="true"]');

  await expect(tierRows).toHaveCount(VIEWPORT_TIER_ORDER.length);

  for (const { width, tier } of viewportBoundaryCases) {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });

    const expectedTier = VIEWPORT_TIERS[tier];
    await expect(viewportPill).toHaveText(
      `Viewport: ${width}×${VIEWPORT_HEIGHT}px · Active: ${expectedTier.label} (${expectedTier.range})`,
    );
    await expect(activeTierRows).toHaveCount(1);
    await expect(activeTierRows).toHaveAttribute('data-ds-tier', tier);
  }
});

test('keeps Navigation and gallery CSS and JavaScript tier boundaries aligned', async ({
  page,
}) => {
  await page.setViewportSize({
    width: TIER_MIN_WIDTH_PX.tablet - 1,
    height: VIEWPORT_HEIGHT,
  });
  await page.goto(testConfig.routes.kontakt);
  await waitForHydration(page);

  const navToggle = page.locator('#nav-toggle');

  await expect(navToggle).toBeVisible();
  expect(
    await page.evaluate(
      (query) => window.matchMedia(query).matches,
      CUSTOM_MEDIA['--from-tablet'],
    ),
  ).toBe(false);

  await page.setViewportSize({
    width: TIER_MIN_WIDTH_PX.tablet,
    height: VIEWPORT_HEIGHT,
  });

  await expect(navToggle).toBeHidden();
  expect(
    await page.evaluate(
      (query) => window.matchMedia(query).matches,
      CUSTOM_MEDIA['--from-tablet'],
    ),
  ).toBe(true);

  await page.setViewportSize({
    width: TIER_MIN_WIDTH_PX.tablet - 1,
    height: VIEWPORT_HEIGHT,
  });
  await page.goto(testConfig.routes.galeria);
  await waitForHydration(page);

  const visibleGalleryColumns = page.locator(
    '.gallery-column:not(.is-hidden)',
  );
  const galleryBoundaryCases: ReadonlyArray<{
    width: number;
    tier: ViewportTierId;
  }> = [
    { width: TIER_MIN_WIDTH_PX.tablet - 1, tier: 'mobile' },
    { width: TIER_MIN_WIDTH_PX.tablet, tier: 'tablet' },
    { width: TIER_MIN_WIDTH_PX.laptop - 1, tier: 'tablet' },
    { width: TIER_MIN_WIDTH_PX.laptop, tier: 'laptop' },
  ];

  for (const { width, tier } of galleryBoundaryCases) {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
    await expect(visibleGalleryColumns).toHaveCount(
      GALLERY_COLUMNS_BY_TIER[tier],
    );
  }
});
