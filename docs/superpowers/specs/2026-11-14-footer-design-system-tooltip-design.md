# Footer Design System Inspector Tooltip

**Date:** 2026-11-14
**Status:** Proposed
**Related:** `DESIGN.md`, `design/stitch/DESIGN.md`, `src/styles/global.css`, `src/components/Footer.astro`, `src/config/gallery.ts`

## 1. Purpose & Goals

Provide a discreet, always-available ("easter-egg") live Design System Inspector anchored to the copyright text (`© 2026 Nulo Cake.`) in `src/components/Footer.astro`.

At a single glance, hovering `© 2026 Nulo Cake.` opens a wide, multi-column **Editorial Bento Sheet** written **100% in English** using standard UX and front-end engineering terminology. It stays open until an explicit click outside its bounds (or pressing `Escape`) and presents a live, constants-driven overview of every major pillar of the *Noir Patisserie* design system:

1. **Color Palette & Semantic Tokens** (live swatch, resolved value, CSS token name, primary UI usage)
2. **Button Variants** (live interactive specimens, token recipe, interaction states, UI usage)
3. **Typography & Fluid Type Scale** (font families, live specimens, fluid `clamp()` formulas, tracking/leading)
4. **Materiality, Elevation & Motion Standards** (surface stacking, backdrop glassmorphism, ghost keylines, corner radii, focus rings, easing)
5. **Responsive Design & Viewport Architecture** (live viewport readout + canonical breakpoint tiers, container/column widths, layout adaptations, mobile viewport/touch standards)

## 2. Non-Negotiable Constraints

1. **Single Source of Truth (Zero Hardcoded Values in Tooltip):**
   - No hex codes, `rgba()` strings, font names, `clamp()` expressions, radii, blur radii, or pixel breakpoints may be hardcoded inside the tooltip markup or metadata descriptions.
   - All CSS token values are resolved dynamically at runtime via `getComputedStyle(document.documentElement)` (and computed specimen styles) from `src/styles/global.css`.
   - All responsive breakpoint numbers, container/drawer widths, and gallery layout constants are imported at build/client time from canonical TypeScript modules (`src/config/responsive.ts` and `src/config/gallery.ts`).
2. **Zero Negative Impact on Existing Site Functionality:**
   - Must not alter computed visual styles of any existing page or component.
   - Must not alter footer layout height (`0px` flow impact on `.home-footer-dock` / `.v2-footer-dock` and their `ResizeObserver`s).
   - Must not add extra keyboard `Tab` stops to the normal page footer when closed.
   - Must not modify `src/home/snapNavigator.ts` or `src/home-v2/stackFade.ts`, and scrolling/interacting inside the open tooltip must never trigger home-page section transitions.
3. **English UX / Web-Dev Nomenclature:**
   - Every heading, label, token category, specimen caption, and usage note inside the tooltip is strictly in English.

## 3. Architecture & File Boundaries

| File | Responsibility |
|---|---|
| `src/styles/global.css` | Canonical CSS custom properties (`@theme` + `:root`) for colors, font families, fluid typography tokens, layout max-width, prose measure, corner radii, glassmorphism, ghost keylines, and standard easing. Existing rules reference these variables with zero change to computed values. |
| `src/config/responsive.ts` | New canonical TypeScript constants for site-wide responsive breakpoints and layout constraints (`BREAKPOINTS`, container max-width, mobile drawer max-width, sub-breakpoints), plus helper `getViewportTierLabel(widthPx)` for live viewport telemetry. |
| `src/config/designSystem.ts` | Typed, 100% English metadata registry referencing CSS custom property names (`cssVar`) and `responsive.ts` / `gallery.ts` constants — never duplicating raw token values. |
| `src/components/DesignSystemTooltip.astro` | Self-contained Top-Layer (`popover="manual"`) Editorial Bento Sheet component: markup, scoped styles, live CSS token resolver, viewport tier badge updater, hex copy-to-clipboard micro-interaction, hover-intent trigger wiring, outside-click/Escape dismissal, and event-propagation isolation. |
| `src/components/Footer.astro` | Wraps `&copy; 2026 Nulo Cake.` in `<span class="footer-copy-trigger" data-ds-trigger>&copy; 2026 Nulo Cake.</span>` and renders `<DesignSystemTooltip />`. |
| `src/components/Navigation.astro` | Replaces magic `768` viewport checks in client script with `BREAKPOINTS.mobileMax` imported from `src/config/responsive.ts` so responsive constants are genuinely shared by production code. |

Files explicitly **not** modified: `src/home/snapNavigator.ts`, `src/home-v2/stackFade.ts`, `src/pages/*`, `src/layouts/Layout.astro`.

## 4. Token & Constant Architecture

### 4.1 CSS Custom Properties (`src/styles/global.css`)

In addition to the existing 19 `--color-*` tokens, 2 `--font-family-*` tokens, and 27 `--title-*` section heading tokens, `:root` exposes the remaining foundational tokens used by `global.css` rules:

- **Typography Scale Tokens:**
  - `--type-display-lg-size: clamp(2.5rem, 5vw, 4rem)`, `--type-display-lg-weight: 700`, `--type-display-lg-leading: 1.05`, `--type-display-lg-tracking: -0.02em`
  - `--type-display-sm-size: clamp(1.5rem, 3vw, 2.25rem)`, `--type-display-sm-weight: 600`, `--type-display-sm-leading: 1.1`, `--type-display-sm-tracking: -0.02em`
  - `--type-title-lg-size: clamp(1.125rem, 2vw, 1.375rem)`, `--type-title-lg-weight: 600`, `--type-title-lg-leading: 1.4`
  - `--type-body-lg-size: 1rem`, `--type-body-lg-weight: 400`, `--type-body-lg-leading: 1.7`, `--prose-max-width: 65ch`
  - `--type-label-md-size: 0.75rem`, `--type-label-md-weight: 600`, `--type-label-md-tracking: 0.1em`
- **Button Geometry Tokens:**
  - `--btn-padding-y: 0.875rem`, `--btn-padding-x: 1.75rem`, `--btn-font-size: 0.875rem`, `--btn-font-weight: 600`, `--btn-hover-scale: 1.02`, `--btn-active-scale: 0.98`
- **Layout, Corner Radius, Materiality & Motion Tokens:**
  - `--layout-max-width: 1400px`
  - `--radius-xs: 0.125rem`, `--radius-sm: 0.25rem`, `--radius-md: 0.5rem`, `--radius-lg: 0.75rem`, `--radius-pill: 9999px`
  - `--glass-bg: rgba(19, 19, 19, 0.6)`, `--glass-blur: 24px`
  - `--ghost-border: rgba(68, 66, 65, 0.15)`
  - `--focus-ring-width: 2px`, `--focus-ring-offset: 3px`
  - `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)`

All existing rules in `global.css` (`.display-lg`, `.display-sm`, `.title-lg`, `.body-lg`, `.label-md`, `.btn-primary`, `.btn-secondary`, `:focus-visible`) consume these custom properties so computed CSS output remains 100% identical while making every value inspectable from `getComputedStyle(document.documentElement)`.

### 4.2 Responsive Design Constants (`src/config/responsive.ts` & `src/config/gallery.ts`)

`src/config/responsive.ts` exports:

- `BREAKPOINTS`:
  - `desktopMin: 1025` (`px`)
  - `tabletMax: 1024` (`px`)
  - `tabletMin: 769` (`px`)
  - `mobileMax: 768` (`px`)
  - `contactStackMax: 900` (`px`)
  - `smallMobileMax: 480` (`px`)
  - `compactMobileMax: 360` (`px`)
- `LAYOUT_METRICS`:
  - `homeSplitColDesktopMaxPx: 560`
  - `homeSplitTextTabletMaxPx: 420`
  - `homeSplitMediaTabletMaxPx: 400`
  - `mobileDrawerMaxWidthPx: 320`
  - `mobileDrawerWidthPct: 75`
  - `minTouchTargetPx: 44`
  - `dynamicViewportUnit: '100dvh'`
  - `safeAreaBottomExpr: 'env(safe-area-inset-bottom)'`
  - *(Container max-width is read directly from CSS `--layout-max-width` so it has a single definition in `src/styles/global.css`.)*
- Gallery responsive metrics are imported directly from `src/config/gallery.ts`:
  - `BREAKPOINTS.desktop` (`1024` → 4 columns), `BREAKPOINTS.tablet` (`640` → 3 columns; `< 640` → 2 columns), `GALLERY_PADDING_DESKTOP` (`'12rem'`), `GALLERY_PADDING_MOBILE` (`'1.5rem'`), `IMAGE_GAP` (`'16px'`), `IMAGE_BORDER_RADIUS` (`'8px'`).

## 5. Content Sections & Layout (Option A — Editorial Bento Sheet)

### 5.1 Sheet Chrome & Header
- Rendered in `#top-layer` via `<div id="design-system-tooltip" class="ds-tooltip" popover="manual" role="dialog" aria-label="Noir Patisserie Design System Specification">`.
- Surface styling uses live site tokens: translucent dark surface with `backdrop-filter: blur(var(--glass-blur))`, subtle `outline-variant` border, and diffused ambient elevation shadow (`0 24px 56px rgba(0, 0, 0, 0.65)`).
- Dimensions: `width: min(1140px, calc(100vw - 2rem))`, `max-height: min(78dvh, 740px)`, `overflow-y: auto`.
- **Header Bar:**
  - Eyebrow: `DESIGN SYSTEM SPECIFICATION · LIVE TOKEN INSPECTOR`
  - Title: `Noir Patisserie — UI Architecture & Tokens`
  - **Live Viewport Telemetry Pill:** updates on open and `window.resize` (e.g., `Viewport: 1440×900px · Active Tier: Desktop (≥1025px)`).
  - Dismissal hint: `Click any color value to copy · Click outside or press Esc to dismiss`.

### 5.2 Asymmetric 2-Column Bento Grid (`> 900px` 2 columns `1.12fr 1fr`, `≤ 900px` 1 column)

#### Left Column — `01 · Color Palette & Semantic Tokens`
Displays all 19 CSS color custom properties from `@theme`, grouped into 3 UX categories:
1. **Canvas & Surface Elevation Tiers (9):**
   - `--color-surface-container-lowest`, `--color-background`, `--color-surface-dim`, `--color-surface`, `--color-surface-container-low`, `--color-surface-container`, `--color-surface-bright`, `--color-surface-container-high`, `--color-surface-container-highest`.
   - Note: `--color-on-primary` shares the `#131313` void-black value and is listed explicitly under Brand & Interactive Accents (or Content Ink) with its own row so all 19 tokens are individually represented.
2. **Brand & Interactive Accents (5):**
   - `--color-primary`, `--color-primary-container`, `--color-primary-gradient-end`, `--color-on-primary`, `--color-glow`.
3. **Content Ink, Keylines & Validation (5):**
   - `--color-on-surface`, `--color-on-surface-variant`, `--color-outline`, `--color-outline-variant`, `--color-error`.

Each row renders:
- **Live Color Swatch** (`background: var(--color-...)`, with subtle keyline for dark/translucent swatches)
- **Copyable Resolved Value Button** (`<button type="button" data-ds-copy>` populated dynamically from `getComputedStyle(root).getPropertyValue(cssVar)`, briefly showing `Copied` on click without closing the tooltip)
- **Token Identifier** (short token name, full `--color-*` on `title`)
- **Primary UI Usage** (concise English list of components/states where the token is applied)

#### Right Column — Stacked Cards (`02` – `05`)

- **`02 · Button Variants (Live Interactive Specimens)`**
  5 interactive button specimens reflecting every distinct button pattern in the codebase, with live resolved colors/geometry and usage descriptions:
  1. **Primary CTA (`.btn-primary`):** 135° linear gradient (`--color-primary-container` → `--color-primary-gradient-end`), ink `--color-on-primary`, hover `scale(1.02)` + `brightness(1.1)`. Used for primary conversion CTAs across Hero, Offer sections, About, and Contact chat handoff.
  2. **Secondary Ghost (`.btn-secondary`):** transparent fill, `1px` `--color-outline-variant` border → `--color-primary` on hover, ink `--color-primary`. Used for secondary navigation CTAs, story links, image upload trigger, and form email submit.
  3. **Header Nav CTA (`.nav-cta`):** compact ghost button (`0.5rem 1.25rem`), `--color-outline-variant` border → `--color-primary` + subtle pink tint on hover. Used for desktop top-bar order CTA (hidden on `/kontakt` and mobile drawer viewports).
  4. **Channel Tile Button (`.channel-btn`):** ghost tile with icon, ink `--color-on-surface` + `--color-outline-variant` border → `--color-primary` ink & border on hover. Used for direct chat launchers on `/kontakt` (Messenger, WhatsApp, Instagram, SMS).
  5. **Circular Icon Control (`.carousel-btn` / `.gp-arrow`):** circular `50%` radius button, `--color-surface-container-low` fill + `--color-outline` border → `--color-surface-container` fill + `--color-primary` border on hover. Used for Testimonials carousel arrows and Gallery lightbox navigation.

- **`03 · Typography & Fluid Type Scale`**
  - Font pairings read from `--font-family-display` and `--font-family-body`.
  - Live rendered specimens + dynamically read CSS token specs (`font-weight`, `clamp(...)` / `rem`, `line-height`, `letter-spacing`, measure) for:
    - `.display-lg` + `.accent-italic` emphasis
    - `.display-sm`
    - Responsive Section Headings (`.section-title-home`, `.section-title-lg`, `.section-title-sm` across Desktop / Tablet / Mobile clamp tokens)
    - `.title-lg`, `.body-lg` (`--prose-max-width`), and `.label-md` (uppercase luxury micro-copy).

- **`04 · Materiality, Elevation & Motion Standards`**
  - Visual elevation strip across surface tiers (`lowest` → `highest`) demonstrating the "No-Line" surface layering principle.
  - Token-resolved metrics for **Backdrop Glassmorphism** (`--glass-bg` + `--glass-blur`), **Ghost Keyline** (`--ghost-border`), **Corner Radius Scale** (`--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-pill`), **Keyboard Focus Ring** (`--focus-ring-width` `--color-primary` + `--focus-ring-offset`), and **Standard Motion Curve** (`--ease-standard` + `prefers-reduced-motion` policy).

- **`05 · Responsive Design & Viewport Architecture`**
  - Populated from `src/config/responsive.ts`, `src/config/gallery.ts`, and `:root` `--layout-max-width` / `--title-home-mobile-*`:
    - **Desktop Tier (`≥ 1025px`):** Container capped at `1400px`; 1fr/1fr split-screen hero (`560px` max column width); full top bar with GSAP limelight & Header CTA; 4-column infinite gallery (`≥ 1024px`, `12rem` inline padding).
    - **Tablet Tier (`769px – 1024px`):** Compact 2-column split on Home (`420px` text / `400px` media); Contact 2-column layout stacks at `≤ 900px`; 3-column infinite gallery (`640px – 1023px`).
    - **Mobile Tier (`≤ 768px`):** Single-column editorial flow; off-canvas glass drawer (`75%` width, max `320px`, `100dvh`); mobile hero title clamp (`1.75rem, 6vw, 2.5rem`); Flavor Selector switches from master-detail radio grid to `<details>` accordion; compact `6px` section dots; 2-column gallery (`< 640px`, `1.5rem` inline padding).
    - **Compact Sub-Tiers (`≤ 480px` / `≤ 360px`):** Full-width stacked contact channel tiles (`≤ 480px`) and condensed portion/size-guide table cells (`≤ 360px`).
    - **Viewport & Input Resilience:** `100dvh` dynamic viewport lock (prevents mobile URL-bar jump), `env(safe-area-inset-bottom)` clearance, `touch-action: manipulation`, `44px` minimum tap targets, and `prefers-reduced-motion: reduce` fallback.

## 6. Interaction & Lifecycle Mechanics

1. **Trigger Element (`Footer.astro`):**
   - `<span class="footer-copy-trigger" data-ds-trigger>&copy; 2026 Nulo Cake.</span>` inside `.footer-copy`.
   - Styled identically to surrounding `.footer-copy` text (`color: inherit; cursor: inherit;`). No visual hint, underline, or extra `Tab` stop.
2. **Opening:**
   - **Mouse hover:** `pointerenter` (when `e.pointerType === 'mouse'`) starts a `180ms` timer; `pointerleave` before `180ms` cancels it. Once `180ms` elapses, `showPopover()` opens the sheet, resolves live CSS custom properties + viewport telemetry, and positions the sheet `12px` above the trigger (`bottom = window.innerHeight - triggerRect.top + 12`, `left` aligned to trigger left edge and clamped inside `[16px, window.innerWidth - sheetWidth - 16px]`; if space above is smaller than `260px`, falls back to `bottom: 16px`).
   - **Touch / Click fallback:** `click` on `[data-ds-trigger]` opens the sheet immediately if closed (does **not** close it if already open, matching the "disappears only when clicking outside" rule).
   - **Resize handling while open:** `window.resize` recalculates both the sheet anchor position (`positionTooltip()`) and the live viewport telemetry pill + responsive fluid readouts.
3. **Persistence & Dismissal:**
   - Cursor leaving the trigger or leaving the tooltip does **not** close it.
   - Clicking anywhere inside `#design-system-tooltip` (including live specimen buttons or hex copy buttons) keeps it open; specimen buttons use `type="button"` (never anchor navigation or form submit).
   - Document `pointerdown` listener checks `if (isOpen && !tooltip.contains(target) && !trigger.contains(target))` → calls `hidePopover()`.
   - Document `keydown` listener on `Escape` when `isOpen` calls `e.preventDefault()`, `e.stopImmediatePropagation()`, and `hidePopover()`.
4. **Isolation from Home Snap & Stack-Fade Controllers:**
   - Listeners attached directly to `#design-system-tooltip` (`wheel`, `touchstart`, `touchmove`, and `keydown` for `ArrowUp`, `ArrowDown`, `PageUp`, `PageDown`, `Home`, `End`, `' '`) call `e.stopPropagation()` while open so scrolling or pressing navigation keys inside the tooltip never bubbles to `window`/`document` listeners in `snapNavigator.ts` or `stackFade.ts`.
5. **View Transitions Cleanup:**
   - Initialized on `astro:page-load` and torn down on `astro:before-swap` via a single `AbortController` (clearing any pending hover timer and hiding the popover before DOM swap).

## 7. Verification Plan

- Typecheck & Astro diagnostics (`npx astro check` and `npm run build`) pass with zero errors or warnings.
- Manual / code verification across `/` (Home snap-active last section where footer dock slides in), `/oferta`, `/galeria`, `/o-mnie`, and `/kontakt`:
  - Hovering `© 2026 Nulo Cake.` opens the sheet cleanly above the footer without clipping by `.home-footer-dock` (`transform`) or `.scroll-container` (`overflow-y: auto`).
  - Moving the mouse away leaves the tooltip open; clicking inside (specimen buttons, hex copy, internal scroll) leaves it open; clicking outside or pressing `Escape` dismisses it.
  - Scrolling with the mouse wheel inside the open tooltip on `/` (section 5) scrolls the tooltip content and does **not** trigger `snapNavigator` back to section 4.
  - Updating a CSS variable in `src/styles/global.css` immediately reflects in the tooltip's resolved values without touching tooltip code.
