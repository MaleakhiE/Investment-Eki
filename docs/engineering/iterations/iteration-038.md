# Iteration 038: analytics API error privacy

Date: 2026-08-01
Branch: `feat/loop-engineering-38-analytics-error-privacy`
Baseline: `245a618`

## Problem and evidence

Analytics routes for portfolio, comparisons, cashflow trends, savings
suggestions, and recommendations still pass raw caught errors to logs. Their
responses are derived from private financial records and investment insights;
the underlying account, cashflow, and investment routes now use safe logging.

## Scope and acceptance

- Reuse `safeDatabaseErrorCode` in all five analytics route catches.
- Add focused tests proving 500 responses and raw-message exclusion while
  preserving allowlisted codes.
- Preserve authentication, service calls, response envelopes, and descriptive
  (not prescriptive) analytics behavior.

## Exclusions and limits

No analytics semantics, financial calculations, product recommendation policy,
schema, migration, dependency, or browser changes.
