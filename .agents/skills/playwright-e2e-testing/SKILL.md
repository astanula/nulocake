---
name: playwright-e2e-testing
description: Guide for writing Playwright E2E tests in the Astro + GSAP project. Use this skill when the user asks to write, modify, or debug a Playwright test. It explains the custom testing infrastructure, required imports, and anti-flakiness helpers (GSAP fast-forward, deterministic scrolling).
---

# Playwright E2E Testing Infrastructure

This project uses a custom Playwright setup designed to prevent flakiness in Astro + GSAP scroll-driven animations. When writing or modifying tests, you **MUST** follow these rules.

## 1. Imports

**NEVER** import `test` and `expect` directly from `@playwright/test`. 
**ALWAYS** import them from the custom base fixture, which automatically fast-forwards GSAP animations (`timeScale(100)`) and disables smooth scrolling.

```typescript
// ❌ WRONG
import { test, expect } from '@playwright/test';

// ✅ CORRECT
import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
```

## 2. Core Helpers

To interact with the page reliably, use these provided helpers instead of standard Playwright/browser methods.

### Hydration
Always wait for Astro to hydrate and scripts (like GSAP) to initialize before asserting anything.
```typescript
import { waitForHydration } from '../helpers/hydration';

// Call this immediately after page.goto()
await waitForHydration(page); 
```

### Deterministic Scrolling
Never use `page.mouse.wheel` or standard `window.scrollTo` without awaiting animation frames. Our helper forces instant scrolling and waits one `requestAnimationFrame` to ensure GSAP ScrollTrigger processes the new position before assertions run.
```typescript
import { scrollToDeterministicPosition } from '../helpers/scroll';

await scrollToDeterministicPosition(page, 500); // Scrolls 500px down
```

## 3. Dealing with Scroll Blockers
Some pages (like the landing page) have a time-based intro that temporarily sets `document.body.style.overflow = 'hidden'`, blocking scroll. Even with GSAP fast-forwarded, you must wait for this to clear before attempting to scroll:

```typescript
// Wait for the time-based intro to finish (body overflow is restored)
await expect(page.locator('body')).toHaveCSS('overflow', 'visible');
```

## Example Test Structure

```typescript
import { test, expect } from '../fixtures/base-fixture';
import { testConfig } from '../test-config';
import { waitForHydration } from '../helpers/hydration';
import { scrollToDeterministicPosition } from '../helpers/scroll';

test.describe('Feature Name', () => {
  test('does the expected behavior', async ({ page }) => {
    // 1. Navigate using configured routes
    await page.goto(testConfig.routes.landing);

    // 2. Wait for hydration (astro:idle)
    await waitForHydration(page);

    // 3. Initial assertions
    await expect(page).toHaveTitle(/Nulo Cake/);

    // 4. Wait for any scroll-blocking intros to finish
    await expect(page.locator('body')).toHaveCSS('overflow', 'visible');

    // 5. Scroll deterministically
    await scrollToDeterministicPosition(page, 500);

    // 6. Assert new state based on scroll position
    const section = page.locator('#some-section');
    await expect(section).toHaveClass(/is-active/);
  });
});
```

## Commands

To run the tests:
```bash
npm run test:e2e
```
