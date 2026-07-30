# Iteration 018 result: canonical IDR amount boundary

Date: 2026-07-30
Branch: `feat/loop-engineering-18-canonical-idr-boundary`

## Implemented

- Added one shared financial-input policy for finite JavaScript numbers with at
  most two decimal places and a maximum of `90,000,000,000,000`.
- Reused the predicate across transaction, transfer, recurring, account,
  budget, goal, cashflow, and investment write validation.
- Added budget and goal service/route validation so invalid values return 400
  responses before encryption or persistence.
- Preserved existing fractional values such as `0.25`, encrypted storage,
  response serialization, ownership checks, and zero-valued non-negative
  domains.
- Added fail-closed handling for stored goal values outside the new policy and
  for additions whose resulting balance exceeds it.

## Scope exclusions

No schema migration, rounding, historical data rewrite, or dependency change.

## Validation

- Focused financial suite: 318 tests passed.
- Full regression: 56 suites, 695 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `git diff --check`: passed.
- Production build and database verification remain to be run for the final
  slice release review.

## Limitations and next recommendation

The maximum and two-decimal policy is an application boundary; existing
encrypted historical values are not audited or rewritten. MySQL-backed
contention and migration replay remain environment gates. Next, select the
highest-value independent slice from the backlog rather than extending this
validation change.
