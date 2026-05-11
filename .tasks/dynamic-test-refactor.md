# Dynamic Config-Driven Animation Tests Refactor

This plan outlines a refactoring of the Playwright E2E tests for the scroll animations. The goal is to make the tests dynamically calculate expected element states and scroll positions based on a single configuration file. This ensures that if you change any animation constant in your production code, you will only ever need to update that constant in **one place** in the test code, and the entire test suite will adapt automatically without requiring manual step rewrites.

## Architecture Decision

- **Shared Configuration**: We will extract the animation constants into a shared `src/config/animation.ts` file. Both `index.astro` (production) and the Playwright tests will import this exact same file. This means changing a constant reduces the update burden to **0 places in the tests**.

## Proposed Changes

### 1. Centralized Shared Configuration
We will create a single configuration file that houses the production animation constants.

#### [NEW] `src/config/animation.ts`
Contains all constants exported for use in production and test logic.

#### [MODIFY] `src/pages/index.astro`
- Remove the hardcoded constants and import them from `src/config/animation.ts`.

### 2. Timeline Math Engine
We will create a helper to mathematically reconstruct the GSAP timeline logic inside the test environment.

#### [NEW] `tests/e2e/helpers/timeline-math.ts`
- Will contain a function to calculate the `start`, `duration`, and `end` (in WU) for every element in a section based on `DURGAP` and element weights.
- Will contain a `getExpectedStateAtWU(wu)` function that returns whether each element should be `visible`, `partially`, or `invisible` at a specific WU checkpoint.

### 3. Page Object Model Updates
Update the POM to handle exact CSS calculations based on `FDUR_RATIO`.

#### [MODIFY] `tests/e2e/landing-page/section-0-simulation.ts`
- Import `PX_PER_WU` from the new config file.
- Update `assertStates` to calculate intermediate filter/blur values dynamically if `FDUR_RATIO` changes the relationship between opacity and blur.

### 4. Dynamic Test Step Generation
We will rewrite the spec files to loop over dynamically generated checkpoints instead of hardcoded steps.

#### [MODIFY] `tests/e2e/landing-page/section-0-scroll-half-wu.spec.ts`
- Generate a list of "Key WU Checkpoints" by finding the `start`, `start + duration / 2`, and `end` of all elements.
- Sort and deduplicate these checkpoints.
- Use a `for (const wu of keyCheckpoints)` loop to automatically generate the `test(...)` blocks for both the downward and upward scroll phases.

---

## Todo Items per Constant (Refactoring Tasks)

1. **`PX_PER_WU`**: Extract from `section-0-simulation.ts` and `index.astro` into `src/config/animation.ts`.
2. **`DURGAP`**: Implement cascading start time calculation in `timeline-math.ts` so stagger is dynamically calculated.
3. **`WU_WORD`**: Extract to `src/config/animation.ts` and map to `w1`-`w6` duration calculations in `timeline-math.ts`.
4. **`WU_BODY`**: Extract to `src/config/animation.ts` and map to `p1` duration calculation in `timeline-math.ts`.
5. **`WU_CTA`**: Extract to `src/config/animation.ts` and map to `cta1` duration calculation in `timeline-math.ts`.
6. **`WU_GALLERY`**: Extract to `src/config/animation.ts` (for future-proofing Section 3 tests).
7. **`WU_TESTIMONIALS`**: Extract to `src/config/animation.ts` (for future-proofing Section 4 tests).
8. **`FDUR_RATIO`**: Integrate into `Section0Simulation.assertStates()` so that if filter duration differs from opacity duration, the `'partially'` state asserts the correct blur amount at the 50% opacity mark.
9. **`HOLD`**: Extract to `src/config/animation.ts` (for future-proofing section transition timing).
10. **`MS_PER_WU`**: Extract to `src/config/animation.ts`.

---

## Execution Tasks

- [x] Centralize configuration: Create `src/config/animation.ts` and extract all constants (`PX_PER_WU`, `HOLD`, `MS_PER_WU`, `DURGAP`, `FDUR_RATIO`).
- [x] Implement weight tracking: Extract `WU_WORD`, `WU_BODY`, `WU_CTA`, `WU_GALLERY`, `WU_TESTIMONIALS` to `src/config/animation.ts`.
- [x] Refactor production: Update `src/pages/index.astro` to import all constants from `src/config/animation.ts` instead of defining them locally.
- [ ] Build math engine: Create `timeline-math.ts` and implement element start, duration, and end calculations.
- [ ] Implement dynamic stagger: Map `DURGAP` into the cascading start time calculation in `timeline-math.ts`.
- [ ] Build state assertion helper: Implement `getExpectedStateAtWU(wu)` function in `timeline-math.ts`.
- [ ] Refactor POM: Integrate `FDUR_RATIO` into `Section0Simulation.assertStates()` so the `'partially'` state calculates correct intermediate blur values.
- [ ] Refactor tests: Rewrite `section-0-scroll-half-wu.spec.ts` to dynamically generate test steps based on `start`, `start + duration/2`, and `end` checkpoints.
- [ ] Verify test stability: Run `npx playwright test section-0-scroll-half-wu.spec.ts` and ensure it passes against current implementation.
- [ ] Test edge cases: Temporarily change `DURGAP` to `0.25` in both production and test config to verify the tests automatically adapt and pass.
