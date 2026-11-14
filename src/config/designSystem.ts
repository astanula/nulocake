/**
 * Metadata registry for the live Design System Inspector tooltip.
 *
 * IMPORTANT: No raw token values (hex codes, rgba strings, font names, clamp
 * expressions, or breakpoint numbers) are hardcoded here. All values are
 * resolved dynamically from CSS Custom Properties in `src/styles/global.css`
 * or imported from canonical TypeScript config modules (`responsive.ts`, `gallery.ts`).
 */

import {
  BREAKPOINTS as GALLERY_BREAKPOINTS,
  GALLERY_PADDING_DESKTOP,
  GALLERY_PADDING_MOBILE,
  IMAGE_BORDER_RADIUS,
  IMAGE_GAP,
} from './gallery';
import { BREAKPOINTS, LAYOUT_METRICS, type ViewportTierId } from './responsive';

export const HOVER_INTENT_MS = 180;
export const TOOLTIP_ANCHOR_GAP_PX = 12;
export const TOOLTIP_VIEWPORT_MARGIN_PX = 16;

export interface ColorTokenEntry {
  tokenName: string;
  cssVar: `--color-${string}`;
  needsKeyline?: boolean;
  usage: string;
}

export interface ColorTokenGroup {
  id: string;
  title: string;
  tokens: readonly ColorTokenEntry[];
}

export const COLOR_TOKEN_GROUPS: readonly ColorTokenGroup[] = [
  {
    id: 'surfaces',
    title: 'Canvas & Surface Elevation Tiers',
    tokens: [
      {
        tokenName: 'surface-container-lowest',
        cssVar: '--color-surface-container-lowest',
        needsKeyline: true,
        usage: 'Gallery thumbnail wells, custom scrollbar track, mobile navigation drawer base',
      },
      {
        tokenName: 'background',
        cssVar: '--color-background',
        needsKeyline: true,
        usage: 'Primary matte-obsidian page canvas and global footer background',
      },
      {
        tokenName: 'surface-dim',
        cssVar: '--color-surface-dim',
        needsKeyline: true,
        usage: 'Recessed background plane and low-emphasis container wells',
      },
      {
        tokenName: 'surface',
        cssVar: '--color-surface',
        needsKeyline: true,
        usage: 'Elevated cards (Cake Size Guide, About portrait frame, Google Map box, Chat handoff)',
      },
      {
        tokenName: 'surface-container-low',
        cssVar: '--color-surface-container-low',
        needsKeyline: true,
        usage: 'Form text inputs, flavor dropdown list, testimonial cards, resting carousel buttons',
      },
      {
        tokenName: 'surface-container',
        cssVar: '--color-surface-container',
        needsKeyline: true,
        usage: 'Interactive hover fill on circular carousel & gallery controls',
      },
      {
        tokenName: 'surface-bright',
        cssVar: '--color-surface-bright',
        needsKeyline: true,
        usage: 'High-priority elevated surface tier for stacked foreground layers',
      },
      {
        tokenName: 'surface-container-high',
        cssVar: '--color-surface-container-high',
        needsKeyline: true,
        usage: 'Floating micro-overlays and SectionDots hover/focus tooltip pills',
      },
      {
        tokenName: 'surface-container-highest',
        cssVar: '--color-surface-container-highest',
        needsKeyline: true,
        usage: 'Custom scrollbar thumb and highest surface elevation accents',
      },
    ],
  },
  {
    id: 'accents',
    title: 'Brand & Interactive Accents',
    tokens: [
      {
        tokenName: 'primary',
        cssVar: '--color-primary',
        usage: 'Italic headline emphasis, secondary CTA label, checkmarks/icons, focus rings, nav limelight',
      },
      {
        tokenName: 'primary-container',
        cssVar: '--color-primary-container',
        usage: 'Primary CTA 135deg gradient start stop, ::selection highlight, keyboard skip-link',
      },
      {
        tokenName: 'primary-gradient-end',
        cssVar: '--color-primary-gradient-end',
        usage: 'Primary CTA 135deg gradient end stop (silken fondant sheen)',
      },
      {
        tokenName: 'on-primary',
        cssVar: '--color-on-primary',
        needsKeyline: true,
        usage: 'High-contrast dark ink on pink Primary CTAs, ::selection text, and active badges',
      },
      {
        tokenName: 'glow',
        cssVar: '--color-glow',
        needsKeyline: true,
        usage: 'Diffused radial ambient backlight behind hero media and map placeholder',
      },
    ],
  },
  {
    id: 'content',
    title: 'Content Ink, Keylines & Validation',
    tokens: [
      {
        tokenName: 'on-surface',
        cssVar: '--color-on-surface',
        usage: 'Primary soft-white display headings, active navigation links, form input values',
      },
      {
        tokenName: 'on-surface-variant',
        cssVar: '--color-on-surface-variant',
        usage: 'Editorial body prose, uppercase section eyebrows, resting nav links & social icons',
      },
      {
        tokenName: 'outline',
        cssVar: '--color-outline',
        usage: 'Input placeholders, inactive section dots, copyright metadata, resting icon-button borders',
      },
      {
        tokenName: 'outline-variant',
        cssVar: '--color-outline-variant',
        needsKeyline: true,
        usage: 'Resting keylines on secondary CTAs, form controls, cards, and ghost dividers',
      },
      {
        tokenName: 'error',
        cssVar: '--color-error',
        usage: 'Invalid form control border/ring (aria-invalid) and inline field error messages',
      },
    ],
  },
];

export const ELEVATION_STRIP_VARS = COLOR_TOKEN_GROUPS[0].tokens.map((t) => ({
  name: t.tokenName.replace('surface-container-', '').replace('surface-', ''),
  cssVar: t.cssVar,
}));

export interface ButtonVariantSpec {
  id: 'primary' | 'secondary' | 'nav-cta' | 'channel' | 'icon-circle';
  name: string;
  selector: string;
  specimenLabel: string;
  fillVars: readonly string[];
  inkVar: string;
  borderVar?: string;
  hoverNote: string;
  usage: string;
}

export const BUTTON_VARIANTS: readonly ButtonVariantSpec[] = [
  {
    id: 'primary',
    name: 'Primary Filled CTA',
    selector: '.btn-primary',
    specimenLabel: 'Primary CTA',
    fillVars: ['--color-primary-container', '--color-primary-gradient-end'],
    inkVar: '--color-on-primary',
    hoverNote: '135deg gradient · hover scale + brightness(1.1)',
    usage: 'Primary conversion actions across Hero, Offer sections, About, and Contact handoff',
  },
  {
    id: 'secondary',
    name: 'Secondary Ghost CTA',
    selector: '.btn-secondary',
    specimenLabel: 'Secondary Ghost',
    fillVars: [],
    inkVar: '--color-primary',
    borderVar: '--color-outline-variant',
    hoverNote: 'Transparent fill · border transitions to primary + hover scale',
    usage: 'Secondary navigation links, About story link, photo upload trigger, email form submit',
  },
  {
    id: 'nav-cta',
    name: 'Header Navigation CTA',
    selector: '.nav-cta',
    specimenLabel: 'Order CTA',
    fillVars: [],
    inkVar: '--color-primary',
    borderVar: '--color-outline-variant',
    hoverNote: 'Compact ghost · subtle primary alpha tint on hover',
    usage: 'Persistent top-bar conversion action across desktop and mobile (hidden on /kontakt)',
  },
  {
    id: 'channel',
    name: 'Direct Channel Tile',
    selector: '.channel-btn',
    specimenLabel: 'Chat Channel',
    fillVars: [],
    inkVar: '--color-on-surface',
    borderVar: '--color-outline-variant',
    hoverNote: 'Icon + label tile · border & ink shift to primary on hover',
    usage: 'Direct messenger launchers on /kontakt (Messenger, WhatsApp, Instagram, SMS)',
  },
  {
    id: 'icon-circle',
    name: 'Circular Icon Control',
    selector: '.carousel-btn / .gp-arrow',
    specimenLabel: 'Icon Control',
    fillVars: ['--color-surface-container-low'],
    inkVar: '--color-on-surface',
    borderVar: '--color-outline',
    hoverNote: 'Circular pill radius · fill shifts to surface-container + primary border',
    usage: 'Directional controls for Testimonials carousel and Gallery lightbox navigation',
  },
];

export interface TypographyScaleEntry {
  id: string;
  label: string;
  selector: string;
  familyVar: '--font-family-display' | '--font-family-body';
  sizeVar: string;
  weightVar: string;
  leadingVar?: string;
  trackingVar?: string;
  extraVar?: string;
  usage: string;
}

export const TYPOGRAPHY_SCALE: readonly TypographyScaleEntry[] = [
  {
    id: 'display-lg',
    label: 'Display Large',
    selector: '.display-lg',
    familyVar: '--font-family-display',
    sizeVar: '--type-display-lg-size',
    weightVar: '--type-display-lg-weight',
    leadingVar: '--type-display-lg-leading',
    trackingVar: '--type-display-lg-tracking',
    usage: 'Hero statements & primary page headlines (paired with .accent-italic)',
  },
  {
    id: 'display-sm',
    label: 'Display Small',
    selector: '.display-sm',
    familyVar: '--font-family-display',
    sizeVar: '--type-display-sm-size',
    weightVar: '--type-display-sm-weight',
    leadingVar: '--type-display-sm-leading',
    trackingVar: '--type-display-sm-tracking',
    usage: 'Secondary editorial headings and portfolio card titles',
  },
  {
    id: 'title-lg',
    label: 'Title Large',
    selector: '.title-lg',
    familyVar: '--font-family-body',
    sizeVar: '--type-title-lg-size',
    weightVar: '--type-title-lg-weight',
    leadingVar: '--type-title-lg-leading',
    usage: 'Subsection headers and structured card titles',
  },
  {
    id: 'body-lg',
    label: 'Body Editorial',
    selector: '.body-lg',
    familyVar: '--font-family-body',
    sizeVar: '--type-body-lg-size',
    weightVar: '--type-body-lg-weight',
    leadingVar: '--type-body-lg-leading',
    extraVar: '--prose-max-width',
    usage: 'Long-form descriptions & storytelling copy capped for optimal line measure',
  },
  {
    id: 'label-md',
    label: 'Label Uppercase',
    selector: '.label-md',
    familyVar: '--font-family-body',
    sizeVar: '--type-label-md-size',
    weightVar: '--type-label-md-weight',
    trackingVar: '--type-label-md-tracking',
    usage: 'All-caps luxury eyebrows, metadata tags, and form section kickers',
  },
];

export interface SectionTitleScaleEntry {
  selector: string;
  label: string;
  desktopVars: readonly [string, string, string];
  mobileVars: readonly [string, string, string];
}

export const SECTION_TITLE_SCALES: readonly SectionTitleScaleEntry[] = [
  {
    selector: '.section-title-home',
    label: 'Home Section Title',
    desktopVars: ['--title-home-desktop-min', '--title-home-desktop-fluid', '--title-home-desktop-max'],
    mobileVars: ['--title-home-mobile-min', '--title-home-mobile-fluid', '--title-home-mobile-max'],
  },
  {
    selector: '.section-title-lg',
    label: 'Subpage Title LG',
    desktopVars: ['--title-lg-desktop-min', '--title-lg-desktop-fluid', '--title-lg-desktop-max'],
    mobileVars: ['--title-lg-mobile-min', '--title-lg-mobile-fluid', '--title-lg-mobile-max'],
  },
  {
    selector: '.section-title-sm',
    label: 'Subpage Title SM',
    desktopVars: ['--title-sm-desktop-min', '--title-sm-desktop-fluid', '--title-sm-desktop-max'],
    mobileVars: ['--title-sm-mobile-min', '--title-sm-mobile-fluid', '--title-sm-mobile-max'],
  },
];

export interface MaterialityRule {
  id: string;
  title: string;
  cssVars: readonly string[];
  description: string;
}

export const MATERIALITY_RULES: readonly MaterialityRule[] = [
  {
    id: 'glass',
    title: 'Backdrop Glassmorphism',
    cssVars: ['--glass-bg', '--glass-blur'],
    description: 'Scrolled sticky navigation bar, mobile drawer, and floating overlays',
  },
  {
    id: 'ghost-border',
    title: 'Ghost Keyline Rule',
    cssVars: ['--ghost-border'],
    description: 'Subtle hairlines replacing heavy 1px dividers across header and footer',
  },
  {
    id: 'radii',
    title: 'Architectural Corner Radii',
    cssVars: ['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-pill'],
    description: 'Sharp UI controls (xs), thumbnails (sm), hero media (md), guide cards (lg), pills',
  },
  {
    id: 'focus-motion',
    title: 'Focus Ring & Motion Curve',
    cssVars: ['--focus-ring-width', '--focus-ring-offset', '--ease-standard'],
    description: 'AA-visible keyboard focus outline + standard cubic-bezier transition & reduced-motion support',
  },
];

export interface ResponsiveTierSpec {
  id: ViewportTierId | 'subtiers';
  tierName: string;
  rangeLabel: string;
  highlights: readonly string[];
  dynamicVars?: readonly string[];
}

export const RESPONSIVE_TIERS: readonly ResponsiveTierSpec[] = [
  {
    id: 'desktop',
    tierName: 'Desktop Tier',
    rangeLabel: `≥ ${BREAKPOINTS.desktopMin}px`,
    dynamicVars: ['--layout-max-width'],
    highlights: [
      `1fr / 1fr split-screen Hero (${LAYOUT_METRICS.homeSplitColDesktopMaxPx}px max column measure)`,
      'Horizontal top bar with GSAP limelight indicator & Header CTA',
      `4-column infinite gallery (≥${GALLERY_BREAKPOINTS.desktop}px, ${GALLERY_PADDING_DESKTOP} inline padding, ${IMAGE_GAP} gap)`,
    ],
  },
  {
    id: 'tablet',
    tierName: 'Tablet Tier',
    rangeLabel: `${BREAKPOINTS.tabletMin}px – ${BREAKPOINTS.tabletMax}px`,
    highlights: [
      `Compact 2-column split on Home (${LAYOUT_METRICS.homeSplitTextTabletMaxPx}px text / ${LAYOUT_METRICS.homeSplitMediaTabletMaxPx}px media)`,
      `Contact 2-column layout stacks into single column at ≤${BREAKPOINTS.contactStackMax}px`,
      `3-column infinite gallery (${GALLERY_BREAKPOINTS.tablet}px–${GALLERY_BREAKPOINTS.desktop - 1}px)`,
    ],
  },
  {
    id: 'mobile',
    tierName: 'Mobile Tier',
    rangeLabel: `≤ ${BREAKPOINTS.mobileMax}px`,
    dynamicVars: ['--title-home-mobile-min', '--title-home-mobile-fluid', '--title-home-mobile-max'],
    highlights: [
      `Single-column stack; off-canvas glass drawer (${LAYOUT_METRICS.mobileDrawerWidthPct}% width, max ${LAYOUT_METRICS.mobileDrawerMaxWidthPx}px, ${LAYOUT_METRICS.dynamicViewportUnit})`,
      'Flavor Selector switches from master-detail radio grid to native <details> accordion',
      `2-column infinite gallery (<${GALLERY_BREAKPOINTS.tablet}px, ${GALLERY_PADDING_MOBILE} inline padding, ${IMAGE_BORDER_RADIUS} radius)`,
    ],
  },
  {
    id: 'subtiers',
    tierName: 'Compact & Device Resilience',
    rangeLabel: `≤ ${BREAKPOINTS.smallMobileMax}px / ≤ ${BREAKPOINTS.compactMobileMax}px`,
    highlights: [
      `Full-width chat channel tiles at ≤${BREAKPOINTS.smallMobileMax}px; condensed size-guide cells at ≤${BREAKPOINTS.compactMobileMax}px`,
      `Viewport stability via ${LAYOUT_METRICS.dynamicViewportUnit} + iOS ${LAYOUT_METRICS.safeAreaBottomExpr}`,
      `Touch optimization: min ${LAYOUT_METRICS.minTouchTargetPx}px hit targets, touch-action: manipulation, prefers-reduced-motion fallback`,
    ],
  },
];
