/**
 * Canonical responsive design breakpoints and layout constraints shared across
 * components and the live Design System Inspector.
 */

export const TIER_MIN_WIDTH_PX = {
  mobile: 420,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  largeDesktop: 1536,
} as const;

export const VIEWPORT_TIER_ORDER = [
  'small-mobile',
  'mobile',
  'tablet',
  'laptop',
  'desktop',
  'large-desktop',
] as const;

export type ViewportTierId = (typeof VIEWPORT_TIER_ORDER)[number];

export interface ActiveViewportTier {
  id: ViewportTierId;
  label: string;
  range: string;
}

export const VIEWPORT_TIERS: Record<ViewportTierId, ActiveViewportTier> = {
  'small-mobile': {
    id: 'small-mobile',
    label: 'Small Mobile',
    range: `<${TIER_MIN_WIDTH_PX.mobile}px`,
  },
  mobile: {
    id: 'mobile',
    label: 'Mobile',
    range: `${TIER_MIN_WIDTH_PX.mobile}–${TIER_MIN_WIDTH_PX.tablet - 1}px`,
  },
  tablet: {
    id: 'tablet',
    label: 'Tablet',
    range: `${TIER_MIN_WIDTH_PX.tablet}–${TIER_MIN_WIDTH_PX.laptop - 1}px`,
  },
  laptop: {
    id: 'laptop',
    label: 'Laptop',
    range: `${TIER_MIN_WIDTH_PX.laptop}–${TIER_MIN_WIDTH_PX.desktop - 1}px`,
  },
  desktop: {
    id: 'desktop',
    label: 'Desktop',
    range: `${TIER_MIN_WIDTH_PX.desktop}–${TIER_MIN_WIDTH_PX.largeDesktop - 1}px`,
  },
  'large-desktop': {
    id: 'large-desktop',
    label: 'Large Desktop',
    range: `≥${TIER_MIN_WIDTH_PX.largeDesktop}px`,
  },
};

export function getViewportTier(widthPx: number): ActiveViewportTier {
  if (widthPx >= TIER_MIN_WIDTH_PX.largeDesktop) return VIEWPORT_TIERS['large-desktop'];
  if (widthPx >= TIER_MIN_WIDTH_PX.desktop) return VIEWPORT_TIERS.desktop;
  if (widthPx >= TIER_MIN_WIDTH_PX.laptop) return VIEWPORT_TIERS.laptop;
  if (widthPx >= TIER_MIN_WIDTH_PX.tablet) return VIEWPORT_TIERS.tablet;
  if (widthPx >= TIER_MIN_WIDTH_PX.mobile) return VIEWPORT_TIERS.mobile;
  return VIEWPORT_TIERS['small-mobile'];
}

export const CUSTOM_MEDIA = {
  '--below-large-desktop': `(width < ${TIER_MIN_WIDTH_PX.largeDesktop}px)`,
  '--below-desktop': `(width < ${TIER_MIN_WIDTH_PX.desktop}px)`,
  '--below-laptop': `(width < ${TIER_MIN_WIDTH_PX.laptop}px)`,
  '--below-tablet': `(width < ${TIER_MIN_WIDTH_PX.tablet}px)`,
  '--below-mobile': `(width < ${TIER_MIN_WIDTH_PX.mobile}px)`,
  '--from-mobile': `(width >= ${TIER_MIN_WIDTH_PX.mobile}px)`,
  '--from-tablet': `(width >= ${TIER_MIN_WIDTH_PX.tablet}px)`,
  '--from-laptop': `(width >= ${TIER_MIN_WIDTH_PX.laptop}px)`,
  '--from-desktop': `(width >= ${TIER_MIN_WIDTH_PX.desktop}px)`,
  '--from-large-desktop': `(width >= ${TIER_MIN_WIDTH_PX.largeDesktop}px)`,
  '--small-mobile-only': `(width < ${TIER_MIN_WIDTH_PX.mobile}px)`,
  '--mobile-only': `(${TIER_MIN_WIDTH_PX.mobile}px <= width < ${TIER_MIN_WIDTH_PX.tablet}px)`,
  '--tablet-only': `(${TIER_MIN_WIDTH_PX.tablet}px <= width < ${TIER_MIN_WIDTH_PX.laptop}px)`,
  '--laptop-only': `(${TIER_MIN_WIDTH_PX.laptop}px <= width < ${TIER_MIN_WIDTH_PX.desktop}px)`,
  '--desktop-only': `(${TIER_MIN_WIDTH_PX.desktop}px <= width < ${TIER_MIN_WIDTH_PX.largeDesktop}px)`,
  '--large-desktop-only': `(width >= ${TIER_MIN_WIDTH_PX.largeDesktop}px)`,
} as const;

export type CustomMediaToken = keyof typeof CUSTOM_MEDIA;

const HOME_SPLIT_TEXT_MAX_PX = {
  tablet: 420,
  laptop: 560,
  desktop: 560,
  'large-desktop': 560,
} as const;

const HOME_SPLIT_MEDIA_MAX_PX = {
  tablet: 400,
  laptop: 560,
  desktop: 560,
  'large-desktop': 560,
} as const;

export const LAYOUT_METRICS = {
  homeSplitTextMaxPx: HOME_SPLIT_TEXT_MAX_PX,
  homeSplitMediaMaxPx: HOME_SPLIT_MEDIA_MAX_PX,
  mobileDrawerMaxWidthPx: {
    'small-mobile': 320,
    mobile: 320,
  },
  mobileDrawerWidthPct: {
    'small-mobile': 75,
    mobile: 75,
  },
  minTouchTargetPx: 44,
  dynamicViewportUnit: '100dvh',
  safeAreaBottomExpr: 'env(safe-area-inset-bottom)',
} as const;
