# Iteration 018 plan: canonical IDR amount boundary

## Decision

Preserve existing fractional monetary values for compatibility. New monetary
writes accept finite JavaScript numbers from `0` through `90,000,000,000,000`
IDR with at most two decimal places. Positive-write paths require values above
zero; balance/opening and cashflow components may be zero.

This is an application-only validation change. Existing encrypted values remain
readable and are not rewritten.

## Scope

- Reuse one shared amount predicate at transaction, transfer, recurring,
  account, budget, goal, cashflow, and investment write boundaries.
- Preserve existing response envelopes and ownership checks.
- Add boundary tests before encryption or persistence.

## Exclusions

- No database migration or historical data rewrite.
- No rounding of accepted values.
- No change to encrypted storage or public API numeric serialization.

## Acceptance criteria

- Zero is accepted only where the existing domain permits it.
- Positive amounts reject zero, negatives, non-finite values, values above the
  maximum, and more than two decimal places.
- Existing `0.25` behavior remains valid and unchanged.
- Invalid values do not decrypt, encrypt, query, or persist financial records.
- Focused and full regression tests pass.
