# Iteration 013: recurring cadence integrity

Date: 2026-07-28
Branch: `feat/loop-engineering-13-recurring-cadence-integrity`
Baseline: `362076a`

## Problem

Recurring runtime values are trusted as TypeScript types at the service
boundary. A `TRANSFER` rule can therefore persist and later create a one-sided
transfer transaction. Coercive schedule checks also accept null, numeric
strings, booleans, and fractions. In particular, a weekly rule with
`day_of_week: null` is treated as due every day.

PATCH validation compounds the issue: null schedule fields are replaced by the
existing value through `??` during validation, then the original null is
persisted.

## Supported boundary

- Enforce exact recurring types `INCOME|EXPENSE` and frequencies
  `DAILY|WEEKLY|MONTHLY|YEARLY` in the service before financial side effects.
- Require integer schedule components within the established ranges:
  `day_of_week` 0..6, `day_of_month` 1..31, and `month_of_year` 1..12.
- Require the components needed by the resulting frequency.
- Preserve omitted PATCH fields; reject explicit null for fields required by
  the resulting frequency. Allow null only to clear irrelevant cadence fields.
- Require an explicitly patched `is_active` value to be boolean, preserving
  `false`.
- Make execution and `next_run` fail closed for legacy rows whose type or
  required cadence components are invalid.
- Keep validation inside `recurring.service.ts`, the final shared boundary
  before encryption/persistence and scheduler materialization.

## TDD seams

1. Create rejects `TRANSFER`, arbitrary/non-string type or frequency, and every
   null/coerced/fractional/out-of-range required cadence value before account
   lookup, encryption, or persistence.
2. Create accepts both financial types, all four frequencies, weekly 0/6,
   monthly/yearly day 1/31, yearly month 1/12, and positive fractions.
3. PATCH omission preserves existing cadence; explicit null on a required
   resulting component rejects before account lookup, encryption, or update.
4. Switching to DAILY can clear irrelevant cadence fields; switching to
   WEEKLY/MONTHLY/YEARLY requires valid resulting components.
5. `is_active: false` remains valid; null, strings, and numbers reject.
6. Legacy active rows with invalid required cadence fields produce no
   occurrence/transaction and expose `next_run: null`.
7. Existing Jakarta calendar, day-29..31 month-end clamping, atomic posting,
   unique-occurrence idempotency, ownership, account, amount/date, route
   privacy, status, DTO, and logging regressions remain green.

## Acceptance criteria

1. No newly accepted input can create a recurring `TRANSFER` or invalid active
   weekly/monthly/yearly schedule.
2. PATCH cannot validate with an old cadence value and then persist an explicit
   invalid null.
3. Legacy transfer or malformed cadence rows fail closed without a migration
   or data rewrite.
4. Existing valid financial precision, calendar/cadence, ownership, response,
   privacy, and idempotency contracts do not change.
5. Changed production statements have at least 80% focused coverage and full
   tests, TypeScript, lint, Prisma generation/validation, production build/OCR
   trace, audit classification, and diff checks pass.
6. Independent product, finance, security, QA, and release reviews report no
   unresolved finding.

## Explicit exclusions

- Amount scale, rounding, integer, or maximum policy.
- Category/description normalization or length policy, account-ID parsing,
  malformed JSON/route-ID status changes, plain-object/unknown-key rejection.
- End-before-start, backfill/catch-up, last-run reset, timezone, same-day, or
  month-end 29..31 redesign.
- A recurring transfer feature, destination accounts, or transfer balancing.
- Historical data repair, schema/migration, public IDs, UI, rate limiting,
  manual-process aggregate redesign, or delete/deactivate policy.

## Release and rollback

This is application-only. A read-only target-data audit must inspect existing
`TRANSFER` recurring rows and active weekly/monthly/yearly rows with invalid
required cadence fields. Production deployment must stop until the audit
returns zero. Any hit requires a separately approved deactivate, delete,
correct, and user-notification policy; this iteration must not guess or
auto-repair. Audit only aggregate counts/reasons and keep any row/user
identifiers as restricted operational evidence—never export ciphertext,
descriptions, or amounts.

Drain old replicas promptly because mixed versions can still accept invalid
rules. Rollback requires no database restore but reopens the corruption path.
Safe runtime smoke is signed-out only; authenticated create/update/manual
processing belongs in isolated staging fixtures.
