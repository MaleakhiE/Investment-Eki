# Iteration 020 result: accessible Budget form dialog

Date: 2026-07-30
Branch: `feat/loop-engineering-20-accessible-budget-dialog`

## Implemented

- Migrated the Budget create form from a hand-built overlay to the existing
  native `AccessibleDialog`.
- Added stable title and control IDs, associated labels, and Cancel initial
  focus.
- Fixed the shared dialog effect dependency so normal form re-renders do not
  close and reopen the native dialog.
- Added the minimal `CurrencyInput` `id` passthrough needed by the amount label.

## Validation

- Focused accessibility tests: 5 passed.
- Full regression: 57 suites, 701 tests passed.
- TypeScript and ESLint passed.
- Production build passed with the webpack production path and the OCR trace
  verifier. Turbopack intermittently stalled in this environment.

## Limitations

Real browser keyboard, focus, responsive, and reduced-motion verification is
still unavailable because this environment has no browser backend.
