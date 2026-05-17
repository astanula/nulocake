# Testing

## Running tests

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

The application can safely check `if (window.__E2E_TEST__)` to expose internals. For example, in `index.astro`, we expose `ScrollTrigger` to `window` only if this flag is present, allowing tests to count active instances and ensure they are properly destroyed on View Transition navigations.
