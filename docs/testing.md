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
