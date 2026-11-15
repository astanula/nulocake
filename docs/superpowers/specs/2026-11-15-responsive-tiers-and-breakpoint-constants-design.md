# Six-Tier Responsive Viewport Architecture & Single-Source Breakpoint Constants

**Date:** 2026-11-15
**Status:** Proposed
**Related:** `DESIGN.md`, `AGENTS.md`, `astro.config.mjs`, `src/config/responsive.ts`, `src/config/gallery.ts`, `src/config/designSystem.ts`, `src/styles/global.css`, `src/components/DesignSystemTooltip.astro`, `src/components/Navigation.astro`

## 1. Purpose & Goals

Expand the site's responsive architecture from 3 viewport tiers (`mobile`, `tablet`, `desktop`) to **6 canonical, non-overlapping viewport tiers** while enforcing a **strict single source of truth** for all numeric breakpoint values across TypeScript, Astro templates, global CSS, and scoped `<style>` blocks:

| Tier ID | Canonical Rule | Effective Pixel Interval |
|---|---|---|
| `small-mobile` | `< 420px` | `0px – 419px` |
| `mobile` | `>= 420px` | `420px – 767px` (`420px <= width < 768px`) |
| `tablet` | `>= 768px` | `768px – 1023px` (`768px <= width < 1024px`) |
| `laptop` | `>= 1024px` | `1024px – 1279px` (`1024px <= width < 1280px`) |
| `desktop` | `>= 1280px` | `1280px – 1535px` (`1280px <= width < 1536px`) |
| `large-desktop` | `>= 1536px` | `>= 1536px` |

### Core Objectives

1. **Single Numeric Definition per Breakpoint:** Each threshold number (`420`, `768`, `1024`, `1280`, `1536`) is defined **once** as a TypeScript constant in `TIER_MIN_WIDTH_PX` inside `src/config/responsive.ts`. Neither `767` / `1023` / `1279` / `1535` off-by-one literals, ad-hoc mid-tier component breakpoints (`360`, `480`, `640`, `900`, `960`), nor raw pixel `@media` queries (e.g. `@media (max-width: 1024px)`) appear anywhere else in `src/`.
2. **Constant-Driven CSS `@media` Queries:** Standard CSS `var(--...)` cannot be evaluated inside `@media` conditions per the W3C CSS specification. Instead, a lightweight, zero-dependency Vite pre-transform plugin (`src/build/responsiveMediaPlugin.ts`) resolves W3C Media Queries Level 5 custom media tokens (e.g. `@media (--below-tablet)`, `@media (--tablet-only)`) directly from `src/config/responsive.ts` across `src/styles/global.css` and all `.astro` `<style>` blocks, and fails the build if raw pixel width queries or unknown tokens are used.
3. **Full Six-Tier Extension of Existing Tier Constants:** Every constant, CSS custom property set, and Design System Inspector structure that previously existed only for the 3 legacy tiers (`desktop`, `tablet`, `mobile`) is extended across all 6 tiers (`small-mobile`, `mobile`, `tablet`, `laptop`, `desktop`, `large-desktop`), initialized to preserve current visual appearance out of the box while allowing independent per-tier tuning.

---

## 2. Non-Negotiable Constraints

1. **Zero Duplicate Breakpoint Literals:**
   - Raw viewport pixel numbers for breakpoints exist **only** in `TIER_MIN_WIDTH_PX` inside `src/config/responsive.ts`.
   - All responsive behavior across pages and components maps strictly onto the 6 canonical tiers (no component-specific pixel breakpoints).
   - Authored CSS in `src/**/*.css` and `src/**/*.astro` must never contain literal `min-width`, `max-width`, or `width < / <= / > / >=` expressions inside `@media` preludes. This invariant is enforced automatically at build/dev time by `responsiveMediaPlugin`.
   - HTML `<Image sizes={...} />` attributes must interpolate exported media condition constants rather than hardcoding `(max-width: ...px)` strings.
2. **Zero External Dependencies:**
   - The CSS custom-media transformation and Tailwind `@theme` breakpoint synchronization must be implemented as an in-repo Vite plugin with no new npm packages.
3. **Visual & Behavioral Continuity by Default:**
   - Extending constants to `large-desktop`, `laptop`, and `small-mobile` initializes newly split tiers to their previously inherited values (`large-desktop` and `laptop` inherit legacy `desktop`; `small-mobile` inherits legacy `mobile`), avoiding unintended layout shifts until specific tiers are intentionally tuned.
   - Pre-existing narrow/intermediate component queries snap cleanly to their nearest canonical tier boundary: `360px` / `480px` → `--below-mobile` (`< 420px`), `640px` / `768px` → `--below-tablet` (`< 768px`), and `900px` / `960px` / `1024px` → `--below-laptop` (`< 1024px`).
4. **Editor & Typecheck Compatibility:**
   - `@media (--token-name)` conforms to standard CSS `<media-in-parens>` grammar (`(<ident>)`), producing zero CSS syntax errors in VS Code / `astro-vscode` without requiring `@reference` or `@import` boilerplate in component `<style>` blocks, and passing `npx astro check` and `npm run build` cleanly.

---

## 3. Canonical Constants & Type Model (`src/config/responsive.ts`)

### 3.1 Single-Source Numeric Constants

```ts
export const TIER_MIN_WIDTH_PX = {
  mobile: 420,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  largeDesktop: 1536,
} as const;
```

Notes on retired legacy constants:
- Legacy `BREAKPOINTS` keys (`desktopMin: 1025`, `tabletMax: 1024`, `tabletMin: 769`, `mobileMax: 768`) are replaced by `TIER_MIN_WIDTH_PX` so upper bounds (`tablet - 1`, etc.) are derived programmatically and never stored as separate literals.
- Legacy ad-hoc constants (`contactStackMax: 900`, `smallMobileMax: 480`, `compactMobileMax: 360`) are retired completely in favor of the 6 canonical tiers.

### 3.2 Viewport Tier Types & Concrete Runtime Exports

```ts
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
```

Only helpers with concrete callers in the codebase are exported (no speculative wrapper functions):
- `VIEWPORT_TIERS: Record<ViewportTierId, ActiveViewportTier>` — precomputed once from `TIER_MIN_WIDTH_PX` (computing display ranges `<420px`, `420–767px`, `768–1023px`, `1024–1279px`, `1280–1535px`, `≥1536px` via `nextTierMin - 1`). Consumed by `src/config/designSystem.ts` (`RESPONSIVE_TIERS` range labels) and `getViewportTier()`.
- `getViewportTier(widthPx: number): ActiveViewportTier` — resolves `widthPx` against `TIER_MIN_WIDTH_PX` in descending order. Consumed by:
  1. `src/components/DesignSystemTooltip.astro` (live viewport telemetry pill and active tier row highlight on `window.resize`).
  2. `src/pages/galeria.astro` (`GALLERY_COLUMNS_BY_TIER[getViewportTier(window.innerWidth).id]`).

### 3.3 Programmatic Custom Media Dictionary (`CUSTOM_MEDIA`)

`src/config/responsive.ts` builds and exports `CUSTOM_MEDIA` directly from `TIER_MIN_WIDTH_PX` using CSS Media Queries Level 4 range syntax (eliminating fractional-DPR subpixel gaps such as `767.5px` on scaled displays):

| Custom Media Token | Generated CSS Media Condition | Primary Usage |
|---|---|---|
| `--below-large-desktop` | `(width < 1536px)` | Desktop-first cascade step into `desktop` and below |
| `--below-desktop` | `(width < 1280px)` | Desktop-first cascade step into `laptop` and below |
| `--below-laptop` | `(width < 1024px)` | Cascade step into `tablet` and below (`o-mnie`, `kontakt`, tooltip bento, `global.css`) |
| `--below-tablet` | `(width < 768px)` | Mobile collapse (`mobile` + `small-mobile`) |
| `--below-mobile` | `(width < 420px)` | `small-mobile` compaction (`Navigation`, `CakeSizeGuide`, `ContactChannels`, `global.css`) |
| `--from-mobile` | `(width >= 420px)` | Mobile-up rules |
| `--from-tablet` | `(width >= 768px)` | Tablet-up rules (e.g. `Navigation.astro` limelight check) |
| `--from-laptop` | `(width >= 1024px)` | Laptop-up rules |
| `--from-desktop` | `(width >= 1280px)` | Desktop-up rules |
| `--from-large-desktop` | `(width >= 1536px)` | Large-desktop enhancements |
| `--small-mobile-only` | `(width < 420px)` | Isolated `small-mobile` slice |
| `--mobile-only` | `(420px <= width < 768px)` | Isolated `mobile` slice |
| `--tablet-only` | `(768px <= width < 1024px)` | Isolated `tablet` slice (`index.astro`, `oferta.astro`, `v2.astro`) |
| `--laptop-only` | `(1024px <= width < 1280px)` | Isolated `laptop` slice |
| `--desktop-only` | `(1280px <= width < 1536px)` | Isolated `desktop` slice |
| `--large-desktop-only` | `(width >= 1536px)` | Isolated `large-desktop` slice |

Because `CUSTOM_MEDIA` is exported from `src/config/responsive.ts`, client scripts pass `CUSTOM_MEDIA['--from-tablet']` directly to `window.matchMedia(...)` (e.g. `Navigation.astro` limelight activation) or `gsap.matchMedia()`, guaranteeing identical browser evaluation between JS and CSS.

---

## 4. Build-Time CSS Pipeline (`src/build/responsiveMediaPlugin.ts`)

### 4.1 Vite Hook & Ordering

Registered in `astro.config.mjs` **before** `tailwindcss()`:

```js
import tailwindcss from '@tailwindcss/vite';
import { responsiveMediaPlugin } from './src/build/responsiveMediaPlugin';

export default defineConfig({
  // ...
  vite: {
    plugins: [responsiveMediaPlugin(), tailwindcss()],
    // ...
  },
});
```

- Uses `enforce: 'pre'` and filters `transform(code, id)` to project CSS modules (`!id.includes('node_modules')` and `(id.endsWith('.css') || id.includes('&lang.css'))`), covering both `src/styles/global.css` and every `.astro` `<style>` / `<style is:global>` virtual module in dev and production builds.
- Because `astro.config.mjs` statically imports `responsiveMediaPlugin` (which imports `src/config/responsive.ts`), Vite automatically tracks `src/config/responsive.ts` in `configFileDependencies` and reloads dev server CSS/JS whenever breakpoint constants change.

### 4.2 Transformation & Compile-Time Guardrails

1. **Raw Width Media Query Rejection (Guardrail):**
   - Before token substitution, scan every `@media <prelude> {` in authored `src/` CSS.
   - If `<prelude>` contains a raw width feature (`\b(?:min-width|max-width|device-width)\b` or `\bwidth\s*(?:<|<=|>|>=|:)`), call `this.error(...)` with file/line context instructing the author to use a `@media (--...)` token from `CUSTOM_MEDIA` in `src/config/responsive.ts`.
   - Non-width media features (`prefers-reduced-motion`, `hover`, `pointer`, `scripting`, `print`) pass through untouched.
2. **Custom Media Substitution:**
   - Within each `@media <prelude> {`, match every `(--[a-z0-9-]+)` token (supporting both standalone `@media (--below-tablet)` and compound `@media (--below-tablet) and (prefers-reduced-motion: no-preference)`).
   - If the token exists in `CUSTOM_MEDIA`, replace `(--token)` with `CUSTOM_MEDIA['--token']`.
   - If the token is unknown, call `this.error(...)` listing valid `CUSTOM_MEDIA` keys.
3. **Tailwind v4 `@theme` Breakpoint Injection (`src/styles/global.css` only):**
   - When transforming `src/styles/global.css`, inject `--breakpoint-*: initial;` and `--breakpoint-mobile`, `--breakpoint-tablet`, `--breakpoint-laptop`, `--breakpoint-desktop`, `--breakpoint-large-desktop` (generated from `TIER_MIN_WIDTH_PX`) into the `@theme { ... }` block before `@tailwindcss/vite` processes it.
   - This keeps Tailwind v4's responsive variant namespace aligned with the 6 canonical tiers without writing pixel numbers in `global.css`.

---

## 5. Extending Existing Tier-Based Constants & Tokens

Every constant group that previously existed only for `desktop`, `tablet`, and `mobile` is extended across all 6 tiers:

### 5.1 `LAYOUT_METRICS` (`src/config/responsive.ts`)

| Legacy Constant(s) | Extended 6-Tier Structure | Initial Values |
|---|---|---|
| `homeSplitColDesktopMaxPx: 560`, `homeSplitTextTabletMaxPx: 420` | `homeSplitTextMaxPx: Record<'tablet' \| 'laptop' \| 'desktop' \| 'large-desktop', number>` | `{ tablet: 420, laptop: 560, desktop: 560, 'large-desktop': 560 }` |
| `homeSplitColDesktopMaxPx: 560`, `homeSplitMediaTabletMaxPx: 400` | `homeSplitMediaMaxPx: Record<'tablet' \| 'laptop' \| 'desktop' \| 'large-desktop', number>` | `{ tablet: 400, laptop: 560, desktop: 560, 'large-desktop': 560 }` |
| `mobileDrawerMaxWidthPx: 320` | `mobileDrawerMaxWidthPx: Record<'small-mobile' \| 'mobile', number>` | `{ 'small-mobile': 320, mobile: 320 }` |
| `mobileDrawerWidthPct: 75` | `mobileDrawerWidthPct: Record<'small-mobile' \| 'mobile', number>` | `{ 'small-mobile': 75, mobile: 75 }` |
| `minTouchTargetPx`, `dynamicViewportUnit`, `safeAreaBottomExpr` | Unchanged tier-invariant device standards | `44`, `'100dvh'`, `'env(safe-area-inset-bottom)'` |

### 5.2 Global CSS Tier Custom Properties (`src/styles/global.css`)

Extend all 4 tier-suffixed token families in `:root` from `{desktop, tablet, mobile}` to `{large-desktop, desktop, laptop, tablet, mobile, small-mobile}`:

1. **Home Section Titles (`--title-home-{tier}-{min|fluid|max}`, 18 tokens):**
   - `large-desktop`, `desktop`, `laptop`, `tablet`: `2.5rem` / `5vw` / `4rem`
   - `mobile`, `small-mobile`: `1.75rem` / `6vw` / `2.5rem`
2. **Subpage Large Titles (`--title-lg-{tier}-{min|fluid|max}`, 18 tokens):**
   - All 6 tiers initialized to `2.125rem` / `4.3vw` / `3.5rem`
3. **Subpage Small Titles (`--title-sm-{tier}-{min|fluid|max}`, 18 tokens):**
   - All 6 tiers initialized to `1.5rem` / `3vw` / `2.25rem`
4. **Subpage Top Offset (`--subpage-top-offset-{tier}`, 6 tokens):**
   - `large-desktop`, `desktop`, `laptop`: `4rem`
   - `tablet`: `3rem`
   - `mobile`, `small-mobile`: `2rem`
5. **Layout Max Width (`--layout-max-width-{tier}` + active `--layout-max-width`, 6 tokens):**
   - All 6 tiers initialized to `1400px` (`--layout-max-width` resolves to `--layout-max-width-large-desktop` on `:root` and updates per tier alongside `--subpage-top-offset`, so wide-screen `large-desktop` or narrower `laptop` container caps can be tuned via a single token).

Active token resolution in `src/styles/global.css`:
- `:root` binds the active pointer variables (`--title-home-min`, `--title-home-fluid`, `--title-home-max`, `--title-lg-*`, `--title-sm-*`, `--subpage-top-offset`, `--layout-max-width`) to the `large-desktop` tier tokens.
- Five cascading `@media` blocks (`@media (--below-large-desktop)`, `@media (--below-desktop)`, `@media (--below-laptop)`, `@media (--below-tablet)`, `@media (--below-mobile)`) rebind those active pointer variables to `desktop`, `laptop`, `tablet`, `mobile` (plus `--scroll-hint-height: 3rem`), and `small-mobile` respectively.
- `.section-title-home`, `.section-title-lg`, and `.section-title-sm` are each declared **once** using `clamp(var(--title-*-min), var(--title-*-fluid), var(--title-*-max))`.

### 5.3 Gallery Responsive Constants (`src/config/gallery.ts` & `src/pages/galeria.astro`)

- Remove the duplicate `BREAKPOINTS = { desktop: 1024, tablet: 640 }` object and 2-tier `GALLERY_PADDING_DESKTOP` / `GALLERY_PADDING_MOBILE` constants from `src/config/gallery.ts`.
- Replace them with exhaustive 6-tier records keyed by `ViewportTierId`:
  ```ts
  export const GALLERY_COLUMNS_BY_TIER: Record<ViewportTierId, number> = {
    'small-mobile': 2,
    mobile: 2,
    tablet: 3,
    laptop: 4,
    desktop: 4,
    'large-desktop': 4,
  };

  export const GALLERY_PADDING_BY_TIER: Record<ViewportTierId, string> = {
    'small-mobile': '1.5rem',
    mobile: '1.5rem',
    tablet: '12rem',
    laptop: '12rem',
    desktop: '12rem',
    'large-desktop': '12rem',
  };

  export const GALLERY_IMAGE_SIZES =
    `${CUSTOM_MEDIA['--below-tablet']} 50vw, ${CUSTOM_MEDIA['--below-laptop']} 33vw, 25vw`;
  ```
- In `src/pages/galeria.astro`:
  - `getColumnCount()` becomes `GALLERY_COLUMNS_BY_TIER[getViewportTier(window.innerWidth).id]`.
  - `#gallery-container` sets `--gallery-padding-{tier}` custom properties from `GALLERY_PADDING_BY_TIER` and cascades `--gallery-current-padding` across `@media (--below-*)` blocks.
  - Both `<Image>` tags use `sizes={GALLERY_IMAGE_SIZES}`.

### 5.4 Design System Inspector Registry (`src/config/designSystem.ts` & `src/components/DesignSystemTooltip.astro`)

- **`SectionTitleScaleEntry`:** Replace `{ desktopVars, mobileVars }` with `varsByTier: Record<ViewportTierId, readonly [string, string, string]>`. In `DesignSystemTooltip.astro`, `hydrateDesignTokens()` reads the 6 resolved `clamp(...)` strings in tier order and collapses consecutive tiers sharing an identical formula (e.g. `All tiers: clamp(...)` when all 6 match, or `large-desktop–tablet: clamp(...) · mobile–small-mobile: clamp(...)` for `.section-title-home`), automatically surfacing any future per-tier tweak.
- **`RESPONSIVE_TIERS`:** Simplify `ResponsiveTierSpec.id` strictly to `ViewportTierId` (retiring the legacy `'subtiers'` pseudo-tier) with 6 rows matching every `ViewportTierId` in descending order (`large-desktop`, `desktop`, `laptop`, `tablet`, `mobile`, `small-mobile`), folding device-resilience standards (`100dvh`, `env(safe-area-inset-bottom)`, `44px` tap targets) directly into the mobile/small-mobile highlights. Every `data-ds-tier={tier.id}` row highlights accurately when `updateViewportState()` runs at any viewport width.

---

## 6. Architecture & File-by-File Migration Map

| File | Required Changes |
|---|---|
| `src/config/responsive.ts` | Define `TIER_MIN_WIDTH_PX`, 6-tier `ViewportTierId`, `VIEWPORT_TIERS`, `getViewportTier()`, `CUSTOM_MEDIA`, and 6-tier `LAYOUT_METRICS`. |
| `src/build/responsiveMediaPlugin.ts` | New Vite `enforce: 'pre'` CSS plugin: validate no raw width `@media` queries in `src/`, expand `(--token)` from `CUSTOM_MEDIA`, and inject `--breakpoint-*` into `global.css` `@theme`. |
| `astro.config.mjs` | Register `responsiveMediaPlugin()` before `tailwindcss()` in `vite.plugins`. |
| `src/styles/global.css` | Extend `--title-home-*`, `--title-lg-*`, `--title-sm-*`, `--subpage-top-offset-*`, and `--layout-max-width-*` to all 6 tiers; cascade active variables via `@media (--below-*)`. |
| `src/config/gallery.ts` | Replace `BREAKPOINTS` and `GALLERY_PADDING_DESKTOP`/`MOBILE` with `GALLERY_COLUMNS_BY_TIER`, `GALLERY_PADDING_BY_TIER`, and `GALLERY_IMAGE_SIZES`. |
| `src/pages/galeria.astro` | Use `GALLERY_COLUMNS_BY_TIER` + `getViewportTier()`, 6-tier `--gallery-padding-*` variables, `GALLERY_IMAGE_SIZES`, and `@media (--below-*)`. |
| `src/config/designSystem.ts` | Extend `SECTION_TITLE_SCALES` (`varsByTier`) and `RESPONSIVE_TIERS` strictly to the 6 `ViewportTierId` entries. |
| `src/components/DesignSystemTooltip.astro` | Update `[data-ds-section-clamp]` hydration for 6-tier `varsByTier`; replace `960px` / `640px` `@media` rules with `@media (--below-laptop)` and `@media (--below-tablet)`. |
| `src/components/Navigation.astro` | Replace `window.innerWidth > BREAKPOINTS.mobileMax` with `window.matchMedia(CUSTOM_MEDIA['--from-tablet']).matches`; replace `768px` / `360px` `@media` rules with `@media (--below-tablet)` and `@media (--below-mobile)`. |
| `src/pages/index.astro` | Replace `(min-width: 769px) and (max-width: 1024px)` → `@media (--tablet-only)` and `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/pages/oferta.astro` | Replace `(min-width: 769px) and (max-width: 1024px)` → `@media (--tablet-only)` and `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/pages/v2.astro` | Replace `(min-width: 769px) and (max-width: 1024px)` → `@media (--tablet-only)` and `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/pages/oferta/v2.astro` | Replace `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/pages/o-mnie.astro` | Build `<Image sizes={...} />` from `CUSTOM_MEDIA`; replace `(max-width: 1024px)` → `@media (--below-laptop)` and `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/pages/kontakt.astro` | Replace `(max-width: 900px)` → `@media (--below-laptop)`. |
| `src/components/Footer.astro` | Replace `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/components/offer/FlavorSelector.astro` | Replace `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/components/offer/CakeSizeGuide.astro` | Replace `(max-width: 768px)` → `@media (--below-tablet)` and `(max-width: 360px)` → `@media (--below-mobile)`. |
| `src/components/section-nav/SectionDots.astro` | Replace `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/components/stack-fade/ScrollHintArrow.astro` | Replace `(max-width: 768px)` → `@media (--below-tablet)`. |
| `src/components/contact/ContactChannels.astro` | Replace `(max-width: 480px)` → `@media (--below-mobile)`. |
| `src/components/contact/ContactForm.astro` | Replace `(max-width: 640px)` → `@media (--below-tablet)`. |
| `DESIGN.md` & `AGENTS.md` | Document the 6 canonical tiers, `src/config/responsive.ts` single-source rule, and `@media (--...)` custom media requirement. |

---

## 7. Verification Plan

*(Note per `AGENTS.md`: never run Playwright E2E tests automatically unless explicitly requested by the user.)*

1. **Static & Build Verification:**
   - `npx astro check` passes with 0 errors and 0 warnings.
   - `npm run build` succeeds, verifying that `responsiveMediaPlugin` transforms `src/styles/global.css` and all `.astro` `<style>` blocks without raw width queries or unresolved `(--*)` tokens, and inspect generated CSS in `dist/_astro/*.css` to confirm `@media (width < 768px)`, `@media (768px <= width < 1024px)`, etc. are emitted cleanly.
2. **Guardrail Verification:**
   - Temporarily introducing `@media (max-width: 1024px)` or `@media (--nonexistent)` in a component `<style>` block causes `npm run build` to fail immediately with a descriptive error, then revert.
3. **Single-Source Audit:**
   - Search `src/` to confirm zero occurrences of `@media` with `min-width`, `max-width`, or `width` comparisons, and confirm each breakpoint integer (`420`, `768`, `1024`, `1280`, `1536`) is defined once in `TIER_MIN_WIDTH_PX` inside `src/config/responsive.ts`.
4. **Playwright E2E Compatibility (when requested by user):**
   - Default Playwright viewport (`1280×720` in `tests/e2e/playwright.config.ts`) resolves to `desktop` (`>= 1280px`), and mobile navigation tests (`375×667` in `tests/e2e/navigation/navigation-listener.spec.ts`) resolve to `small-mobile` (`< 420px`, matching `--below-tablet`).
