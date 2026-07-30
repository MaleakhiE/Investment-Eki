# Iteration 017: recurring category and aggregation integrity

Date: 2026-07-28
Branch: `feat/loop-engineering-17-recurring-category-integrity`
Baseline: `83f10a3`

## Problem

Recurring category input has no runtime service boundary. Invalid values can
reach Prisma, PATCH falsy values silently no-op, and whitespace-only legacy
rules remain schedulable. Categories also index two ordinary JavaScript
objects, where valid names such as `__proto__`, `constructor`, and `toString`
silently corrupt financial category breakdowns.

## Supported boundary

- Require recurring categories to be strings containing a non-whitespace
  character and no more than 50 Unicode code points.
- Preserve accepted text exactly; do not trim, normalize, case-fold, map,
  blacklist, or truncate it.
- Create validates before schedule/account/encryption/persistence.
- POST lets category-only faults reach the service; another missing required
  field retains the established generic missing-fields response.
- PATCH omission remains unchanged; every explicit invalid value rejects after
  owner lookup and before other side effects.
- Legacy invalid categories remain readable but have no `next_run`, fail due
  processing before a transaction, and must be corrected before activation.
  Deactivation and same-update correction remain available.
- Replace both category-breakdown plain-object accumulators with `Map` and
  `Object.fromEntries`, preserving the normal JSON object contract and every
  exact category key.

## TDD seams

1. Create/PATCH reject missing/null/non-string/empty/ASCII or Unicode
   whitespace-only values and 51 ASCII/astral code points.
2. One and 50 ASCII/astral code points, boundary whitespace, markup,
   formula-like text, and prototype-reserved names persist exactly.
3. PATCH preserves owner-first 404, omission, exact update, deactivation, and
   correction-plus-activation semantics.
4. A valid 50-code-point category posts unchanged inside the existing atomic
   transaction.
5. Invalid legacy categories preserve raw reads but have no next run, count as
   failed before `$transaction`, and produce no raw log.
6. Monthly and range summaries return exact numeric own enumerable properties
   for repeated `__proto__`, `constructor`, `toString`, and ordinary keys; JSON
   serialization preserves them.
7. Savings, export, privacy, cadence, description, account, amount/date,
   atomicity, and P2002 regressions remain green.

## Acceptance criteria

1. Every newly accepted recurring category fits both utf8mb4 `VARCHAR(50)`
   columns and groups safely without changing its text.
2. Invalid legacy categories cannot create transactions or misleading schedule
   dates until corrected.
3. Changed production statements have at least 80% focused coverage; full
   tests, TypeScript, lint, Prisma generation/validation, production build/OCR
   trace, audit classification, and diff checks pass.
4. Product, finance, security, QA, and release reviews leave no unresolved
   finding.

## Explicit exclusions

- Taxonomy/allowlists, trimming, normalization, case folding, alias merging,
  control-character policy, historical transaction/budget/report regrouping,
  request body limits, rate limiting, UI, schema changes, or automatic repair.
- Direct transaction field-width changes; its existing trimming contract is
  separate.
- Description, cadence, amount/date, account, or occurrence behavior.

## Deployment gate and rollback

This is application-only. Verify both category columns are utf8mb4
`VARCHAR(50) NOT NULL`, then aggregate all recurring rows for over-50 and
ECMAScript whitespace-only categories (`U+0009..U+000D`, `U+0020`, `U+00A0`,
`U+1680`, `U+2000..U+200A`, `U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000`,
and `U+FEFF`), split into reason and total/active/inactive counts. Validate the
target MySQL ICU predicate against every listed value before use. Counts only
may leave the target. Every invalid count must be zero; any hit requires
owner-approved correction/deactivation/deletion, notification, and
reporting-history policy.

Pause the scheduler; confirm Loop 13, 16, and 17 predeploy audits; deploy and
drain old writers; rerun all three audits; resume only when all post-drain
results remain zero. `P1001` and unavailable Docker satisfy none.

A validation-only rollback needs no database restore but restores invalid
acceptance and falsy PATCH no-op; old-writer rows persist. Retain the Map
aggregation hardening unless incorrect reserved-name summaries are explicitly
accepted and counted. Combined rollback reopens earlier recurring failures and
waives no audit.
