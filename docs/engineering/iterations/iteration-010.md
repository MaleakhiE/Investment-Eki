# Iteration 010: strict financial write inputs

Date: 2026-07-28
Branch: `feat/loop-engineering-10-strict-transaction-inputs`
Baseline: `7212e14`

## Problem

Direct transaction create/update accepts `NaN` and infinite amounts because it
checks only the runtime type and sign. Direct transaction and account-transfer
dates are shape-checked but not calendar-checked, so JavaScript can normalize
an impossible requested date before persistence.

Recurring rule create/update is a sibling write boundary: it encrypts amounts
directly and later posts that ciphertext to the ledger. Leaving it unchanged
would preserve the same invalid-amount and normalized-date path.

## Supported boundary

- Amounts supplied to transaction create/update/transfer and recurring
  create/update must be runtime numbers, finite, and strictly positive.
- Preserve every finite positive value exactly; do not round, truncate, cap, or
  require an integer.
- User-supplied dates must be exact `YYYY-MM-DD` strings, real Gregorian
  calendar dates, and within MySQL `DATE` range `1000-01-01` through
  `9999-12-31`.
- Persist accepted calendar dates as UTC midnight so the requested day is not
  reinterpreted through the server timezone.
- Recurring update continues to treat an omitted end date as unchanged and an
  empty or null end date as clearing the boundary.
- Reject invalid input before encryption, linked-account lookup, transaction
  opening, or persistence. Recurring update still performs its user-scoped rule
  lookup before validating a partial update so ownership is not disclosed.

Sources:

- <https://dev.mysql.com/doc/refman/8.4/en/date-and-time-type-syntax.html>
- Prisma ORM 6.19 adapter documentation confirms date normalization uses UTC.

## TDD seams

1. Reject `NaN`, positive/negative infinity, zero, negatives, null, and numeric
   strings; accept a finite positive fraction unchanged.
2. Reject impossible, non-leap, noncanonical, non-string, and out-of-range
   dates; accept normal dates, leap days, and both database boundaries.
3. Transaction create/update rejects before encryption, account lookup, or
   write; transfer rejects before opening its database transaction.
4. Recurring create rejects before encryption, account lookup, or create.
5. Recurring update rejects an explicitly supplied invalid value before linked
   account lookup, encryption, or update, including the existing `amount: null`
   bypass.
6. Valid leap dates are written as the same UTC calendar day.
7. Existing transaction, transfer, recurring scheduler, investment-generated
   expense, response-envelope, ownership, and atomicity behavior remains green.

## Acceptance criteria

1. No covered write path can encrypt or persist a non-finite amount or silently
   normalized user-supplied calendar date.
2. Validation failures retain the established service errors and HTTP 400
   envelopes without logging or echoing submitted financial values.
3. No Prisma schema, migration, dependency, ciphertext format, stored row, or
   success response changes.
4. Changed production statements have at least 80% focused coverage and full
   tests, TypeScript, lint, Prisma generation/validation, build/OCR tracing,
   audit classification, and diff checks pass.
5. Independent product, finance, security, QA, and release reviews report no
   unresolved finding.

## Explicit exclusions

- Amount rounding, precision/scale, integer-only currency, maximums, refunds, or
  historical ciphertext/date repair.
- Start/end ordering, future/backdate/business-day policy, transfer "today"
  timezone choice, recurring cadence, or scheduler-derived occurrence dates.
- GET/export/summary date-filter refactors, other domain dates, idempotency,
  schema/migration, dependency, or UI changes.
- Broader runtime-body validation and structured log redaction.

## Release and rollback

This is an application-only validation change. Mixed replicas can temporarily
retain the old acceptance behavior, so drain old instances when strict
enforcement matters. Rollback needs no database restore but reopens invalid
input acceptance. Existing malformed rows are not repaired by this slice.
