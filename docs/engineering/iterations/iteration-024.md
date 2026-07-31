# Iteration 024 plan: strict transaction read-date boundaries

## Problem

Transaction read endpoints accepted malformed and impossible dates, and summary
ranges accepted reversed boundaries. JavaScript date normalization could return
plausible but incorrect data.

## Scope

- Validate summary-range and transaction-list date filters with
  `parseCalendarDate`.
- Reject reversed ranges before database access.
- Reject monthly summary values outside months 01 through 12.

## Exclusions

No transaction data, schema, filtering semantics, or timezone change.
