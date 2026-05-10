# Playwright E2E Testing Infrastructure

**Date:** 2026-05-10
**Scope:** Infrastructure setup only — no animation test logic

## Goal

Set up Playwright E2E testing infrastructure for the NuloCake Astro project. The immediate target is the landing page's GSAP scroll-driven animations (defined in `.agents/architecture/sections-scroll-word-based.md`), but the setup must support any future page — with or without animations.

The infrastructure must be runnable with a single command (`npm run test:e2e`) by both humans and AI coding agents. No manual setup steps.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Server management | `webServer` auto-start in Playwright config | Single-command execution, CI-friendly |
| Dev vs production | Configurable via `TEST_MODE` env var | Dev for local iteration, preview for CI validation |
| Approach | Minimal setup (no page objects, no data-driven harness) | Avoid premature abstraction; extend after writing real tests |
| Browser | Chromium only | Sufficient for functional testing; add browsers later |
| Visual regression | None (`toHaveScreenshot` not used) | Strictly CSS state and DOM property validation |

## File Structure

```
tests/
  e2e/
    playwright.config.ts        # Playwright config (webServer, projects, timeouts)
    test-config.ts              # Central constants (timeScale, flags, routes)
    fixtures/
      base-fixture.ts           # Custom fixture with auto anti-flake injection
    helpers/
      scroll.ts                 # scrollToDeterministicPosition()
      hydration.ts              # waitForHydration()
    landing-page/
      smoke.spec.ts             # Smoke test proving infrastructure works
```

## File Specifications

### `playwright.config.ts`

Playwright configuration with environment-aware `webServer`:

- **Default** (`TEST_MODE` unset or `"dev"`): spawns `npm run dev` on port 3000
- **`TEST_MODE=preview`**: spawns `npm run build && npm run preview` on port 4321
- `reuseExistingServer: true` — reuses an already-running dev server (common during AI agent workflows)
- Single Chromium project, viewport 1280×720
- `testDir: '.'` — finds specs recursively relative to config location
- Timeouts: 30s per test, 60s for webServer startup
- Retries: 0 locally, configurable via `CI` env var
- Reporter: `list` locally, `html` in CI

### `test-config.ts`

Central constants imported by fixtures and tests:

```ts
export const testConfig = {
  animationTimeScale: 100,       // gsap.globalTimeline.timeScale() multiplier
  disableSmoothScroll: true,     // Inject CSS to force instant scrolling
  hydrationTimeout: 10_000,      // Max ms to wait for Astro hydration
  routes: {
    landing: '/',
  },
};
```

All test behavior controlled from this single file. Tests never hardcode these values.

### `fixtures/base-fixture.ts`

Extends Playwright's `test` with a custom `page` that auto-applies anti-flake measures before every test:

1. **GSAP fast-forward** via `page.addInitScript()`: injects a script that sets `gsap.globalTimeline.timeScale(testConfig.animationTimeScale)` once GSAP is available. Uses brief polling since GSAP loads as an ES module.
2. **Disable smooth scroll** via `page.addStyleTag()`: injects `html { scroll-behavior: auto !important; }` after page navigation.

All test files import `test` and `expect` from this fixture instead of from `@playwright/test` directly.

The fixture does not force navigation — each test navigates to whatever page it needs. Anti-flake measures activate automatically on every page load.

### `helpers/scroll.ts`

Single exported function:

```ts
async function scrollToDeterministicPosition(page: Page, yOffset: number): Promise<void>
```

- Calls `window.scrollTo({ top: yOffset, behavior: 'instant' })`
- Waits for a `requestAnimationFrame` tick after scrolling so GSAP ScrollTrigger processes the new position
- Deterministic: no smooth scrolling, no animation timing dependency

### `helpers/hydration.ts`

Single exported function:

```ts
async function waitForHydration(page: Page): Promise<void>
```

- Waits for the `astro:idle` event (Astro fires this when all client-side scripts have loaded and executed)
- Falls back to timeout if the event never fires (pages without client scripts)
- Ensures GSAP timelines and ScrollTrigger are fully initialized before tests start asserting

### `landing-page/smoke.spec.ts`

Minimal test validating infrastructure wiring:

1. Navigate to `/`
2. Call `waitForHydration()`
3. Assert page title contains "Nulo Cake"
4. Assert `#section-hero` exists and has the `is-active` class
5. Call `scrollToDeterministicPosition(page, 500)`
6. Assert scroll position changed

No animation assertions. Proves: server starts, page loads, hydration completes, scrolling works.

## npm Integration

Add to `package.json`:

```json
{
  "scripts": {
    "test:e2e": "playwright test --config=tests/e2e/playwright.config.ts"
  }
}
```

Playwright and `@playwright/test` added as a dev dependency.

## What This Does NOT Include

- Animation-specific test assertions (opacity, blur, transform checks)
- Page Object Model or data-driven test harness
- Visual regression / screenshot testing
- Multi-browser testing
- Mobile viewport testing

These will be designed and added when writing actual animation tests.
