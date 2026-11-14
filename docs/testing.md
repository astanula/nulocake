# Testing

## Browser setup

After installing or updating Playwright, install its matching Chromium browser:

```powershell
npx playwright install chromium
```

If the download fails with `SELF_SIGNED_CERT_IN_CHAIN` on Windows, let Node use
the system's trusted certificate store and retry:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npx playwright install chromium
```

This keeps certificate verification enabled. The setting applies to the current
terminal session; it does not change the project or system configuration.

## Running tests

Playwright starts its own server on port 4322, separate from the usual
development server on port 4321. Stop any process already using port 4322
before running the suite; tests do not reuse an existing server.

### Run single test by exact name
`npx playwright test -g "^exact test name$" --config=tests/e2e/playwright.config.ts`

### Run a specific set of tests matching multiple names using regex
`npx playwright test tests/e2e -g "Test name one|Test name two" --config=tests/e2e/playwright.config.ts`

### Run all tests in a feature folder
`npx playwright test tests/e2e/landing-page/ --config=tests/e2e/playwright.config.ts`

### Run specific test file
`npx playwright test tests/e2e/landing-page/smoke.spec.ts --config=tests/e2e/playwright.config.ts`

### Run all tests
`npm run test:e2e`

## Checking test results

Test output can be checked in standard terminal stdout or outputed (as json)

`npx playwright test tests/e2e --config=tests/e2e/playwright.config.ts --reporter=json > test-results.json`

## Testing Internal Hooks

To allow Playwright to test memory leaks and cleanup of deeply internal libraries (like GSAP ScrollTrigger) without shipping test-only variables to production users, the test suite injects a special global flag: `window.__E2E_TEST__ = true` before the application loads. 

The application can safely check `if (window.__E2E_TEST__)` to expose internals. For example, in `Navigation.astro`, we expose `gsap` to `window` only if this flag is present, allowing tests to deterministically fast-forward, pause, and inspect GSAP tweens and timelines during navigations and section transitions.
