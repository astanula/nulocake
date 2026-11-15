# Six-Tier Responsive Viewport Architecture & Single-Source Breakpoint Constants — Implementation Plan

**Date:** 2026-11-15
**Specification:** `docs/superpowers/specs/2026-11-15-responsive-tiers-and-breakpoint-constants-design.md`
**Status:** Planned (Sequential Subagent Execution)

### Execution Model & Subagent Rules

- **Sequential Subagent Execution:** Phases **must** be executed strictly in order (`Phase 1` → `Phase 2` → `Phase 3` → `Phase 4` → **[User Confirmation Gate]** → `Phase 5`). Spawn a **fresh subagent instance per phase** so each subagent operates with a small, focused file context.
- **Buildable Vertical Slices:** Every phase (`1` through `4`) leaves the repository passing `npx astro check` and `npm run build` before handing off to the next phase.
- **Strict Test Policy (`AGENTS.md`):** Subagents executing **Phases 1–4 must NEVER run Playwright E2E tests** (`npm run test:e2e` or `npx playwright test`) or add test files.
- **Mandatory User Confirmation Gate Before Phase 5:** After Phase 4 completes, the orchestrator **must stop and ask the user for explicit confirmation** before starting Phase 5 (running and fixing/extending tests).

---

### 1. Execution Progress Checklist

- [x] Phase 1: Six-Tier Responsive Core, Custom-Media Vite Pipeline & Global Layout Chrome
- [x] Phase 2: Six-Tier Infinite Gallery & Live Design System Inspector
- [x] Phase 3: Snap-Section Pages & Offer Interactive Components Migration
- [x] Phase 4: Editorial & Contact Subpages, Raw-Width Build Guardrail & Design Documentation
- [x] **GATE:** Ask user for explicit confirmation before starting Phase 5 (Test Execution & Fixes)
- [ ] Phase 5: Playwright E2E Test Verification, Fixes & Six-Tier Regression Coverage

---

### 2. Detailed Phase Breakdown

## Phase 1: Six-Tier Responsive Core, Custom-Media Vite Pipeline & Global Layout Chrome
* **DependsOn:** None
* **Objective:** Establish the single-source 6-tier responsive model (`src/config/responsive.ts`), the zero-dependency Vite custom-media & Tailwind `@theme` pre-transform plugin (`src/build/responsiveMediaPlugin.ts`), the 6-tier global CSS token cascade (`src/styles/global.css`), and migrate the persistent global `Navigation` and `Footer` chrome end-to-end.
* **Requirements Addressed:**
  * Spec §1 & §2: Define all 5 canonical threshold numbers (`420`, `768`, `1024`, `1280`, `1536`) once in `TIER_MIN_WIDTH_PX` with zero external npm packages and visual continuity across newly split tiers (`large-desktop`/`laptop` inherit legacy `desktop`; `small-mobile` inherits legacy `mobile`).
  * Spec §3.1–3.3 & §5.1: Export `TIER_MIN_WIDTH_PX`, `VIEWPORT_TIER_ORDER`, `ViewportTierId`, `ActiveViewportTier`, `VIEWPORT_TIERS`, `getViewportTier()`, `CUSTOM_MEDIA` (16 Media Queries Level 4 range tokens), and 6-tier `LAYOUT_METRICS`.
  * Spec §4.1 & §4.2 (items 2 & 3): Register `responsiveMediaPlugin()` before `tailwindcss()` in `astro.config.mjs`; expand `@media (--token)` across `global.css` and `.astro` `<style>` modules, fail the build on unknown `--*` media tokens, and inject `--breakpoint-*` tokens into `global.css` `@theme`. *(Note: the raw-width `@media` rejection guardrail from §4.2 item 1 is activated in Phase 4 once all remaining `.astro` files are migrated so Phases 1–3 build cleanly.)*
  * Spec §5.2: Extend `--title-home-*`, `--title-lg-*`, `--title-sm-*`, `--subpage-top-offset-*`, and `--layout-max-width-*` to all 6 tiers in `src/styles/global.css` and cascade active pointer variables via `@media (--below-*)`.
  * Spec §6 (`Navigation.astro`, `Footer.astro`): Migrate global navigation JS/CSS and footer CSS onto `CUSTOM_MEDIA` and `@media (--below-*)`.
* **Implementation Steps:**
  * [x] **Step 1 — Subagent Context Loading (Read Only These Files):** Read `docs/superpowers/specs/2026-11-15-responsive-tiers-and-breakpoint-constants-design.md` (§1–§5.2, §6), `src/config/responsive.ts`, `astro.config.mjs`, `src/styles/global.css`, `src/components/Navigation.astro`, `src/components/Footer.astro`, and lines 1–25 + 370–420 of `src/config/designSystem.ts` (to verify TypeScript compatibility before Phase 2).
  * [x] **Step 2 — Implement Canonical Constants & Runtime Helpers in `src/config/responsive.ts`:**
    * Define `TIER_MIN_WIDTH_PX = { mobile: 420, tablet: 768, laptop: 1024, desktop: 1280, largeDesktop: 1536 } as const`, `VIEWPORT_TIER_ORDER`, `ViewportTierId`, and `ActiveViewportTier`.
    * Precompute `VIEWPORT_TIERS: Record<ViewportTierId, ActiveViewportTier>` programmatically from `TIER_MIN_WIDTH_PX` using `nextTierMin - 1` (`Small Mobile` `<420px`, `Mobile` `420–767px`, `Tablet` `768–1023px`, `Laptop` `1024–1279px`, `Desktop` `1280–1535px`, `Large Desktop` `≥1536px`) and implement descending `getViewportTier(widthPx: number): ActiveViewportTier`.
    * Build and export `CUSTOM_MEDIA` directly from `TIER_MIN_WIDTH_PX` with all 16 tokens (`--below-large-desktop`, `--below-desktop`, `--below-laptop`, `--below-tablet`, `--below-mobile`, `--from-mobile`, `--from-tablet`, `--from-laptop`, `--from-desktop`, `--from-large-desktop`, `--small-mobile-only`, `--mobile-only`, `--tablet-only`, `--laptop-only`, `--desktop-only`, `--large-desktop-only`) using Level 4 range syntax (`(width < ...)`, `(width >= ...)`, `(...px <= width < ...px)`).
    * Implement the 6-tier `LAYOUT_METRICS` (`homeSplitTextMaxPx`, `homeSplitMediaMaxPx`, `mobileDrawerMaxWidthPx`, `mobileDrawerWidthPct`, `minTouchTargetPx`, `dynamicViewportUnit`, `safeAreaBottomExpr`).
    * *Temporary Phase-1-Only Type Bridge for `src/config/designSystem.ts`:* Include a clearly marked `@deprecated` `BREAKPOINTS` export and legacy `LAYOUT_METRICS` alias properties derived strictly from `TIER_MIN_WIDTH_PX` / `LAYOUT_METRICS` (**no** extra numeric breakpoint literals) solely so untouched `src/config/designSystem.ts` compiles until Phase 2 removes the bridge.
  * [x] **Step 3 — Create `src/build/responsiveMediaPlugin.ts` & Wire `astro.config.mjs`:**
    * Implement `responsiveMediaPlugin()` with `name: 'nulocake-responsive-media'` and `enforce: 'pre'`.
    * Normalize module IDs for Windows (`const normId = id.replaceAll('\\', '/'); const cleanPath = normId.split('?')[0];`) and filter to authored `src/` CSS (`!normId.includes('/node_modules/') && normId.includes('/src/') && (cleanPath.endsWith('.css') || normId.includes('&lang.css'))`).
    * Within each `@media <prelude> {` (ignoring CSS block comments while preserving line counts for accurate `this.error` locations), match `(--[a-z0-9-]+)` tokens, substitute from `CUSTOM_MEDIA`, and call `this.error(...)` listing valid `CUSTOM_MEDIA` keys if an unknown `--*` token is encountered.
    * When `cleanPath.endsWith('/src/styles/global.css')`, inject `--breakpoint-*: initial;` plus `--breakpoint-mobile`, `--breakpoint-tablet`, `--breakpoint-laptop`, `--breakpoint-desktop`, and `--breakpoint-large-desktop` (derived from `TIER_MIN_WIDTH_PX`) into `@theme { ... }`.
    * Register `responsiveMediaPlugin()` **before** `tailwindcss()` in `astro.config.mjs` `vite.plugins`.
  * [x] **Step 4 — Extend `src/styles/global.css` to 6-Tier Custom Properties & Cascading Pointers:**
    * Define all 6-tier custom property families in `:root` (`--title-home-{tier}-{min|fluid|max}`, `--title-lg-{tier}-{min|fluid|max}`, `--title-sm-{tier}-{min|fluid|max}`, `--subpage-top-offset-{tier}`, `--layout-max-width-{tier}`) with initial values matching Spec §5.2, and bind active pointer variables (`--title-home-min/fluid/max`, `--title-lg-min/fluid/max`, `--title-sm-min/fluid/max`, `--subpage-top-offset`, `--layout-max-width`) to `large-desktop` on `:root`.
    * Declare `.section-title-home`, `.section-title-lg`, and `.section-title-sm` once each using `clamp(var(--title-*-min), var(--title-*-fluid), var(--title-*-max))`, and update the stale `desktop ≥1025px · tablet 769–1024px` comment above the section title block to reflect the 6 canonical tiers.
    * Add the 5 cascading `@media` blocks in **strictly descending order** (`@media (--below-large-desktop)` → `desktop`, `@media (--below-desktop)` → `laptop`, `@media (--below-laptop)` → `tablet`, `@media (--below-tablet)` → `mobile` + `--scroll-hint-height: 3rem`, `@media (--below-mobile)` → `small-mobile`).
  * [x] **Step 5 — Migrate Global Chrome (`src/components/Navigation.astro` & `src/components/Footer.astro`):**
    * In `Navigation.astro`: replace `import { BREAKPOINTS }` and both `window.innerWidth > BREAKPOINTS.mobileMax` checks with `CUSTOM_MEDIA` and `window.matchMedia(CUSTOM_MEDIA['--from-tablet']).matches`; replace `@media (max-width: 768px)` → `@media (--below-tablet)` and `@media (max-width: 360px)` → `@media (--below-mobile)` (keeping `--below-mobile` after `--below-tablet`).
    * In `Footer.astro`: replace `@media (max-width: 768px)` → `@media (--below-tablet)`.
  * [x] **Step 6 — Phase 1 Build & Typecheck Verification (No E2E Tests):** Run `npx astro check` and `npm run build` and verify 0 errors/warnings and emitted `@media (width < ...)` rules in `dist/_astro/*.css`. Do **not** run Playwright tests.

---

## Phase 2: Six-Tier Infinite Gallery & Live Design System Inspector
* **DependsOn:** Phase 1
* **Objective:** Upgrade `/galeria` (responsive column count, per-tier container padding, and constant-driven `<Image sizes>`) and the live Noir Patisserie Design System Inspector (`DesignSystemTooltip` + `designSystem.ts`) to full 6-tier support, retiring all remaining legacy breakpoint exports.
* **Requirements Addressed:**
  * Spec §5.3 & §6 (`src/config/gallery.ts`, `src/pages/galeria.astro`): Replace duplicate gallery `BREAKPOINTS` and 2-tier padding constants with `GALLERY_COLUMNS_BY_TIER`, `GALLERY_PADDING_BY_TIER`, and `GALLERY_IMAGE_SIZES`; drive `galeria.astro` column redistribution via `getViewportTier()`, cascade 6-tier `--gallery-padding-*` custom properties via `@media (--below-*)`, and bind `GALLERY_IMAGE_SIZES` on both `<Image>` sets.
  * Spec §5.4 & §6 (`src/config/designSystem.ts`, `src/components/DesignSystemTooltip.astro`): Replace `{ desktopVars, mobileVars }` with 6-tier `varsByTier` and collapse consecutive matching `clamp(...)` formulas dynamically; replace 4-row `RESPONSIVE_TIERS` (including `'subtiers'`) with 6 `ViewportTierId` rows in descending order; migrate sheet `@media` rules to `--below-laptop` and `--below-tablet`.
  * Spec §3.1 & §5.1 (`src/config/responsive.ts`): Remove the temporary Phase 1 `@deprecated` bridge so `src/config/responsive.ts` exports strictly the canonical 6-tier API.
* **Implementation Steps:**
  * [x] **Step 1 — Subagent Context Loading (Read Only These Files):** Read `docs/superpowers/specs/2026-11-15-responsive-tiers-and-breakpoint-constants-design.md` (§3, §5.1, §5.3, §5.4, §6), `src/config/responsive.ts`, `src/config/gallery.ts`, `src/pages/galeria.astro`, `src/config/designSystem.ts`, and `src/components/DesignSystemTooltip.astro`.
  * [x] **Step 2 — Migrate Gallery Config & Page (`src/config/gallery.ts` & `src/pages/galeria.astro`):**
    * In `src/config/gallery.ts`: remove `BREAKPOINTS`, `GALLERY_PADDING_DESKTOP`, and `GALLERY_PADDING_MOBILE`; import `CUSTOM_MEDIA` and `type ViewportTierId` from `./responsive`; export `GALLERY_COLUMNS_BY_TIER` (`2, 2, 3, 4, 4, 4`), `GALLERY_PADDING_BY_TIER` (`'1.5rem'` on `small-mobile`/`mobile`, `'12rem'` on `tablet`–`large-desktop`), and ``GALLERY_IMAGE_SIZES = `${CUSTOM_MEDIA['--below-tablet']} 50vw, ${CUSTOM_MEDIA['--below-laptop']} 33vw, 25vw` ``.
    * In `src/pages/galeria.astro`: pass `sizes={GALLERY_IMAGE_SIZES}` on both `<Image>` components; emit `--gallery-padding-{tier}` inline CSS variables on `#gallery-container` from `GALLERY_PADDING_BY_TIER`; default `--gallery-current-padding: var(--gallery-padding-large-desktop)` on `.gallery-container` and cascade `--gallery-current-padding` across descending `@media (--below-large-desktop)`, `@media (--below-desktop)`, `@media (--below-laptop)`, `@media (--below-tablet)` (keeping `--gallery-top-gap: 1.5rem` and `.gallery-page { padding-bottom: 3rem }` inside `@media (--below-tablet)`), and `@media (--below-mobile)`; update `getColumnCount()` in `<script>` to `GALLERY_COLUMNS_BY_TIER[getViewportTier(window.innerWidth).id]`.
  * [x] **Step 3 — Upgrade Design System Registry & Tooltip (`src/config/designSystem.ts` & `src/components/DesignSystemTooltip.astro`):**
    * In `src/config/designSystem.ts`: update `SectionTitleScaleEntry` to `varsByTier: Record<ViewportTierId, readonly [string, string, string]>` across all 6 tiers for `.section-title-home`, `.section-title-lg`, and `.section-title-sm`; narrow `ResponsiveTierSpec.id` strictly to `ViewportTierId`; define `RESPONSIVE_TIERS` in descending order (`large-desktop`, `desktop`, `laptop`, `tablet`, `mobile`, `small-mobile`) sourcing `rangeLabel` from `VIEWPORT_TIERS[id].range` and building `highlights` dynamically from `LAYOUT_METRICS`, `GALLERY_COLUMNS_BY_TIER`, `GALLERY_PADDING_BY_TIER`, `IMAGE_GAP`, and `IMAGE_BORDER_RADIUS` (folding `100dvh`, `env(safe-area-inset-bottom)`, and `44px` tap targets into `mobile` / `small-mobile` highlights, with zero hardcoded breakpoint integers).
    * In `src/components/DesignSystemTooltip.astro`: pass `scale.varsByTier` to `[data-ds-section-clamp]` and update `hydrateDesignTokens()` to resolve all 6 tier `clamp(...)` strings in descending order (`large-desktop` → `small-mobile`), collapsing consecutive identical formulas (`All tiers: clamp(...)` when all 6 match, or e.g. `large-desktop–tablet: clamp(...) · mobile–small-mobile: clamp(...)`); replace `@media (max-width: 960px)` → `@media (--below-laptop)` and `@media (max-width: 640px)` → `@media (--below-tablet)`.
  * [x] **Step 4 — Finalize Clean `src/config/responsive.ts`:** Remove the temporary Phase 1 `@deprecated` `BREAKPOINTS` / legacy `LAYOUT_METRICS` compatibility exports from `src/config/responsive.ts`.
  * [x] **Step 5 — Phase 2 Build & Typecheck Verification (No E2E Tests):** Run `npx astro check` and `npm run build` and confirm 0 errors and 0 warnings. Do **not** run Playwright tests.

---

## Phase 3: Snap-Section Pages & Offer Interactive Components Migration
* **DependsOn:** Phase 1, Phase 2
* **Objective:** Migrate all snap-navigation and stack-fade pages (`index.astro`, `v2.astro`, `oferta.astro`, `oferta/v2.astro`) alongside their interactive offer and section-chrome components (`FlavorSelector`, `CakeSizeGuide`, `SectionDots`, `ScrollHintArrow`) onto canonical `@media (--*)` tokens.
* **Requirements Addressed:**
  * Spec §2.1, §2.3, §3.3 & §6 (`index.astro`, `oferta.astro`, `v2.astro`, `oferta/v2.astro`): Eliminate the `768px`–`769px` subpixel gap by replacing `(min-width: 769px) and (max-width: 1024px)` with `@media (--tablet-only)` and `(max-width: 768px)` with `@media (--below-tablet)`.
  * Spec §2.3 & §6 (`FlavorSelector.astro`, `CakeSizeGuide.astro`, `SectionDots.astro`, `ScrollHintArrow.astro`): Snap component responsive rules cleanly to `--below-tablet` (`< 768px`) and `--below-mobile` (`< 420px`).
* **Implementation Steps:**
  * [x] **Step 1 — Subagent Context Loading (Read Only These Files):** Read `docs/superpowers/specs/2026-11-15-responsive-tiers-and-breakpoint-constants-design.md` (§2, §3.3, §6), `src/pages/index.astro` (around lines 565–650), `src/pages/v2.astro` (around lines 565–650), `src/pages/oferta.astro` (around lines 390–435), `src/pages/oferta/v2.astro` (around lines 285–305), `src/components/offer/FlavorSelector.astro` (around lines 295–331), `src/components/offer/CakeSizeGuide.astro` (around lines 235–259), `src/components/section-nav/SectionDots.astro` (around lines 100–116), and `src/components/stack-fade/ScrollHintArrow.astro` (around lines 88–110).
  * [x] **Step 2 — Migrate Home & Oferta Page Variants (`index.astro`, `v2.astro`, `oferta.astro`, `oferta/v2.astro`):**
    * In `src/pages/index.astro`, `src/pages/v2.astro`, and `src/pages/oferta.astro`: replace `@media (min-width: 769px) and (max-width: 1024px)` → `@media (--tablet-only)` (updating any `(769px–1024px)` section header comment so no stale off-by-one literals remain) and replace `@media (max-width: 768px)` → `@media (--below-tablet)`. Preserve all `@media (prefers-reduced-motion: ...)` blocks untouched.
    * In `src/pages/oferta/v2.astro`: replace `@media (max-width: 768px)` → `@media (--below-tablet)`.
  * [x] **Step 3 — Migrate Offer & Snap-Navigation Components (`FlavorSelector`, `CakeSizeGuide`, `SectionDots`, `ScrollHintArrow`):**
    * In `src/components/offer/FlavorSelector.astro`: replace `@media (max-width: 768px)` → `@media (--below-tablet)`.
    * In `src/components/offer/CakeSizeGuide.astro`: replace `@media (max-width: 768px)` → `@media (--below-tablet)` and `@media (max-width: 360px)` → `@media (--below-mobile)` (keeping `--below-mobile` after `--below-tablet`).
    * In `src/components/section-nav/SectionDots.astro` and `src/components/stack-fade/ScrollHintArrow.astro`: replace `@media (max-width: 768px)` → `@media (--below-tablet)`.
  * [x] **Step 4 — Phase 3 Build & Typecheck Verification (No E2E Tests):** Run `npx astro check` and `npm run build` and verify 0 errors and 0 warnings. Do **not** run Playwright tests.

---

## Phase 4: Editorial & Contact Subpages, Raw-Width Build Guardrail & Design Documentation
* **DependsOn:** Phase 1, Phase 2, Phase 3
* **Objective:** Migrate the remaining About and Contact pages/components (`o-mnie.astro`, `kontakt.astro`, `ContactChannels.astro`, `ContactForm.astro`), activate and verify the compile-time raw-width `@media` rejection guardrail in `src/build/responsiveMediaPlugin.ts`, update `DESIGN.md` and `AGENTS.md`, and complete the single-source codebase audit.
* **Requirements Addressed:**
  * Spec §2.1, §2.3 & §6 (`o-mnie.astro`, `kontakt.astro`, `ContactChannels.astro`, `ContactForm.astro`): Interpolate `CUSTOM_MEDIA` into `<Image sizes={...} />` on `o-mnie.astro` and migrate all remaining width `@media` rules (`1024px`/`900px` → `--below-laptop`, `768px`/`640px` → `--below-tablet`, `480px` → `--below-mobile`).
  * Spec §4.2 (item 1) & §7.2: Enforce compile-time rejection of raw `min-width`, `max-width`, `device-width`, and `width < / <= / > / >= / :` expressions inside `@media` preludes across `src/`, while passing non-width queries (`prefers-reduced-motion`, `hover`, `pointer`, `scripting`, `print`) untouched.
  * Spec §6 (`DESIGN.md`, `AGENTS.md`) & §7.1–7.3: Document the 6 canonical tiers, single-source `src/config/responsive.ts` rule, and `@media (--...)` custom-media requirement; audit `src/` for zero remaining raw width `@media` queries or duplicate breakpoint literals.
* **Implementation Steps:**
  * [x] **Step 1 — Subagent Context Loading (Read Only These Files):** Read `docs/superpowers/specs/2026-11-15-responsive-tiers-and-breakpoint-constants-design.md` (§2, §4.2, §6, §7), `src/pages/o-mnie.astro`, `src/pages/kontakt.astro`, `src/components/contact/ContactChannels.astro`, `src/components/contact/ContactForm.astro`, `src/build/responsiveMediaPlugin.ts`, `DESIGN.md`, and `AGENTS.md`.
  * [x] **Step 2 — Migrate About & Contact Subpages/Components:**
    * In `src/pages/o-mnie.astro`: import `CUSTOM_MEDIA` from `../config/responsive`; update ``<Image sizes={`${CUSTOM_MEDIA['--below-tablet']} 100vw, ${CUSTOM_MEDIA['--below-desktop']} 36vw, 440px`} />`` (note: keep `height={1024}` image intrinsic dimension prop untouched — it is an image aspect-ratio dimension, not a viewport breakpoint); replace `@media (max-width: 1024px)` → `@media (--below-laptop)` and `@media (max-width: 768px)` → `@media (--below-tablet)`.
    * In `src/pages/kontakt.astro`: replace `@media (max-width: 900px)` → `@media (--below-laptop)`.
    * In `src/components/contact/ContactChannels.astro`: replace `@media (max-width: 480px)` → `@media (--below-mobile)`.
    * In `src/components/contact/ContactForm.astro`: replace `@media (max-width: 640px)` → `@media (--below-tablet)`.
  * [x] **Step 3 — Enable Raw-Width `@media` Guardrail in `src/build/responsiveMediaPlugin.ts` & Verify Rejection:**
    * Before custom-media token substitution in `responsiveMediaPlugin.ts`, scan every `@media <prelude> {` in `src/` CSS and call `this.error(...)` (with file and line context) if `<prelude>` matches `\b(?:min-width|max-width|device-width)\b` or `\bwidth\s*(?:<=|>=|<|>|:)`.
    * Verify the guardrail per Spec §7.2: temporarily introduce `@media (max-width: 1024px)` and `@media (--nonexistent)` in a component `<style>` block, confirm `npm run build` fails immediately with a clear error message in both cases, and revert the temporary edit cleanly.
  * [x] **Step 4 — Document Architecture in `DESIGN.md` & `AGENTS.md` and Audit `src/`:**
    * Update `DESIGN.md` and `AGENTS.md` to document the 6 canonical viewport tiers (`small-mobile` `<420px`, `mobile` `420–767px`, `tablet` `768–1023px`, `laptop` `1024–1279px`, `desktop` `1280–1535px`, `large-desktop` `≥1536px`), the single-source `TIER_MIN_WIDTH_PX` / `CUSTOM_MEDIA` contract in `src/config/responsive.ts`, and the mandatory `@media (--...)` custom-media rule enforced by `src/build/responsiveMediaPlugin.ts`.
    * Audit `src/` (via search tools) to confirm zero occurrences of width-based `@media` expressions or duplicate breakpoint literals outside `TIER_MIN_WIDTH_PX`, and run `npx astro check` + `npm run build` + `git diff --check`. Do **not** run Playwright tests.

---

> ### MANDATORY USER CONFIRMATION GATE BEFORE PHASE 5
> **STOP HERE.** Per `AGENTS.md` ("NEVER run the tests by yourself unless I ask you to") and the execution instructions for this plan, the orchestrating agent **must pause after Phase 4 completes and explicitly ask the user for confirmation** before spawning the Phase 5 subagent or running any Playwright commands. Only proceed to Phase 5 after the user confirms.

---

## Phase 5: Playwright E2E Test Verification, Fixes & Six-Tier Regression Coverage
* **DependsOn:** Phase 1, Phase 2, Phase 3, Phase 4 *(+ Explicit User Confirmation)*
* **Objective:** Run the full Playwright E2E test suite against the migrated 6-tier responsive implementation, fix any test assertions impacted by snapped canonical tier boundaries, and add focused E2E regression tests covering the 6 canonical viewport tiers across the Design System Inspector, Navigation, and Gallery.
* **Requirements Addressed:**
  * Spec §7.4: Verify existing Playwright E2E compatibility (`1280×720` default viewport → `desktop`, `375×667` mobile tests → `small-mobile` matching `--below-tablet` and `--below-mobile`, `oferta.spec.ts` multi-width checks across `1280`, `800`, `700`, `375`, `320`).
  * End-to-end verification that exact canonical tier boundaries (`419`/`420`, `767`/`768`, `1023`/`1024`, `1279`/`1280`, `1535`/`1536`) behave consistently across CSS `@media (--*)` rules and JS `getViewportTier()` / `window.matchMedia(CUSTOM_MEDIA[...])`.
* **Implementation Steps:**
  * [x] **Step 1 — Subagent Context Loading:** Read `docs/testing.md`, `.agents/skills/playwright-e2e-testing/SKILL.md`, `docs/superpowers/specs/2026-11-15-responsive-tiers-and-breakpoint-constants-design.md` (§3, §5.3, §5.4, §7.4), `src/config/responsive.ts`, `tests/e2e/playwright.config.ts`, `tests/e2e/test-config.ts`, `tests/e2e/oferta.spec.ts`, and `tests/e2e/navigation/navigation-listener.spec.ts`.
  * [x] **Step 2 — Run Existing Playwright E2E Suite & Fix Any Breakpoint-Boundary Regressions:**
    * Ensure port `4350` is free (`docs/testing.md`), then run `npm run test:e2e`.
    * Inspect any failures across `navigation`, `oferta`, `contact`, `gallery`, and `landing-page` specs; if any existing test relied on legacy intermediate cutoffs (`360px`, `480px`, `640px`, `900px`, or the legacy `768px` inclusive `max-width` off-by-one), update the test expectations cleanly while following `.agents/skills/playwright-e2e-testing/SKILL.md` (`import { test, expect } from '../fixtures/base-fixture'`, `waitForHydration`).
  * [x] **Step 3 — Add Focused Six-Tier Responsive E2E Coverage (`tests/e2e/responsive-tiers.spec.ts`):**
    * Using `fixtures/base-fixture`, `testConfig`, `waitForHydration`, and importing `TIER_MIN_WIDTH_PX` / `VIEWPORT_TIER_ORDER` from `src/config/responsive.ts` (never hardcoding duplicate pixel thresholds in tests):
      1. Verify the Design System Tooltip (`[data-ds-viewport]` and `[data-ds-tier][data-active="true"]`) resolves and highlights each of the 6 canonical tiers accurately across exact lower/upper boundary widths (`TIER_MIN_WIDTH_PX.mobile - 1`, `TIER_MIN_WIDTH_PX.mobile`, `TIER_MIN_WIDTH_PX.tablet - 1`, `TIER_MIN_WIDTH_PX.tablet`, `TIER_MIN_WIDTH_PX.laptop - 1`, `TIER_MIN_WIDTH_PX.laptop`, `TIER_MIN_WIDTH_PX.desktop - 1`, `TIER_MIN_WIDTH_PX.desktop`, `TIER_MIN_WIDTH_PX.largeDesktop - 1`, `TIER_MIN_WIDTH_PX.largeDesktop`) and hydrates `[data-ds-section-clamp]` formulas.
      2. Verify zero off-by-one mismatch at the `tablet` boundary (`TIER_MIN_WIDTH_PX.tablet - 1` vs `TIER_MIN_WIDTH_PX.tablet`) on `Navigation` (mobile hamburger toggle visible below `tablet`, hidden from `tablet` upward) and `/galeria` (`2` visible columns below `tablet`, `3` columns on `tablet`, `4` columns from `laptop` upward).
  * [ ] **Step 4 — Final Suite & Build Verification:** Re-run `npm run test:e2e`, `npx astro check`, `npm run build`, and `git diff --check` to confirm all existing and new E2E tests, static checks, and production builds pass cleanly.
