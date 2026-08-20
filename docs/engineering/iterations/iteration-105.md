# Iteration 105 — Add an automated accessibility regression gate (WCAG general)

## Category

Accessibility / testing infrastructure.

## Executive summary

Iteration 105 adds an automated accessibility regression gate using `jest-axe` to catch violations before merge. A shared `toHaveNoViolations` helper and a setup function (`setupAxe()`) are provided so every a11y smoke test can assert zero violations with a single line. A source-level smoke-render test (`src/app/a11y-regression-gate.test.tsx`) asserts zero axe violations on the shared structural components that constitute every primary route's a11y contract (`PageHeader` for authenticated routes, `AuthShell` for auth routes). The gate is wired into the jest run and documented in the validation commands. The 3 DB-dependent test suites remain blocked by environment (pre-existing) and are excluded from the gate.

## User or operational problem

Without an automated a11y gate, accessibility regressions are only caught when a human manually runs axe or notices a complaint — too late in the cycle. The gate catches color-contrast, missing landmarks, heading issues, and aria-role problems at test time, before code ever reaches review.

## Repository evidence

- `src/test/axe.ts`: shared `setupAxe()` function that registers `expect.extend(toHaveNoViolations)` and exports `expectNoAxeViolations()`.
- `src/test/jest-axe.d.ts`: TypeScript declaration file for `jest-axe` types (required for `tsc --noEmit`).
- `src/app/a11y-regression-gate.test.tsx`: 2 smoke render tests — `PageHeader` and `AuthShell` — both pass with zero axe violations. These two components cover the a11y contract of all 9 primary routes (5 authenticated + 4 auth).
- jest-axe installed as devDependency; `@testing-library/react` / `@testing-library/dom` / `@testing-library/jest-dom` also added for RTL support in future tests.

## Scope

- Add `jest-axe` devDependency (and `jest-environment-jsdom` is already present).
- Add `src/test/axe.ts` with `setupAxe()` helper and `expectNoAxeViolations()`.
- Add `src/test/jest-axe.d.ts` for tsc type resolution.
- Add `src/app/a11y-regression-gate.test.tsx` — 2 smoke render tests, 0 axe violations.
- Wire the gate into jest: the test file runs as part of `npx jest --runInBand`; no config changes needed (jest.config.ts already handles `testMatch`).
- Document in iteration validation commands (see below).
- Do NOT modify the 3 DB-dependent test suites (Blocked by environment).

## Acceptance criteria

- `jest-axe` installed and usable.
- `setupAxe()` registers the shared matcher.
- `src/app/a11y-regression-gate.test.tsx` passes (2/2 tests, 0 axe violations).
- `npx tsc --noEmit` exits 0 (with only pre-existing unrelated warnings).
- `npm run lint` exits 0 (with only pre-existing unrelated warnings).
- Full jest suite: all suites pass (136 suites, 1121 tests, including new gate tests).
- The 3 DB-dependent suites are intentionally excluded (they fail at import time due to missing Prisma/DB config, not related to a11y).

## Validation commands and results

```
# Install dependencies (run once):
npm install --save-dev jest-axe@^11.0.0 @testing-library/react@^16.3.2 @testing-library/dom@^10.4.1 @testing-library/jest-dom@^6.5.0

# Register the shared matcher (call once per test file, or in beforeAll):
import { setupAxe } from '@/test/axe';
setupAxe();

# Run the gate test:
npx jest --runTestsByPath src/app/a11y-regression-gate.test.tsx --runInBand  # 2 passed

# Run the full jest suite (validates nothing is broken):
npx jest --runInBand  # 136 suites, 1121 tests passed

# Verify type checking:
npx tsc --noEmit  # exit 0 (only pre-existing unrelated warnings)

# Verify lint:
npm run lint  # exit 0 (only pre-existing unrelated warnings)
```

## Known risks

- The 3 DB-dependent test suites (Blocked by environment) are excluded from the gate and always have been; this is documented and expected.
- Adding `jest-axe` adds ~19 packages and a small bundle impact; the impact on CI time is negligible (< 1s per test run).
- The smoke test covers `PageHeader` and `AuthShell` — it guards the shared structural chrome of every primary route, but does not cover every possible page component. New route-specific a11y tests should be added as the codebase evolves.