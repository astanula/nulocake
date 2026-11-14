/**
 * Canonical responsive design breakpoints and layout constraints shared across
 * components and the live Design System Inspector.
 */

export const BREAKPOINTS = {
  /** Desktop layout starts at ≥1025px */
  desktopMin: 1025,
  /** Tablet upper bound (≤1024px) */
  tabletMax: 1024,
  /** Tablet lower bound (≥769px) */
  tabletMin: 769,
  /** Primary mobile breakpoint (≤768px) */
  mobileMax: 768,
  /** Contact 2-column grid stacks at ≤900px */
  contactStackMax: 900,
  /** Contact channel tiles stack full-width at ≤480px */
  smallMobileMax: 480,
  /** Compact table spacing on narrow handsets (≤360px) */
  compactMobileMax: 360,
} as const;

export const LAYOUT_METRICS = {
  homeSplitColDesktopMaxPx: 560,
  homeSplitTextTabletMaxPx: 420,
  homeSplitMediaTabletMaxPx: 400,
  mobileDrawerMaxWidthPx: 320,
  mobileDrawerWidthPct: 75,
  minTouchTargetPx: 44,
  dynamicViewportUnit: '100dvh',
  safeAreaBottomExpr: 'env(safe-area-inset-bottom)',
} as const;

export type ViewportTierId = 'desktop' | 'tablet' | 'mobile';

export interface ActiveViewportTier {
  id: ViewportTierId;
  label: string;
  range: string;
}

export function getViewportTier(widthPx: number): ActiveViewportTier {
  if (widthPx >= BREAKPOINTS.desktopMin) {
    return {
      id: 'desktop',
      label: 'Desktop',
      range: `≥${BREAKPOINTS.desktopMin}px`,
    };
  }
  if (widthPx >= BREAKPOINTS.tabletMin) {
    return {
      id: 'tablet',
      label: 'Tablet',
      range: `${BREAKPOINTS.tabletMin}–${BREAKPOINTS.tabletMax}px`,
    };
  }
  return {
    id: 'mobile',
    label: 'Mobile',
    range: `≤${BREAKPOINTS.mobileMax}px`,
  };
}
