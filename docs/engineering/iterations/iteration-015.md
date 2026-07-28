# Iteration 015: recurring linked-account identity

Date: 2026-07-28
Branch: `feat/loop-engineering-15-recurring-account-id`
Baseline: `7e1506b`

## Problem

Recurring create/update trusts the TypeScript `account_id` type and calls
`BigInt` repeatedly on runtime input. Numbers, booleans, aliases, and unsafe
JSON integers can silently clear, alias, or misroute a rule to the wrong owned
account; malformed/out-of-range values become generic 500s.

## Supported boundary

- Parse optional recurring account IDs once at the service boundary.
- Preserve create omission/null/empty as no linked account.
- Preserve PATCH omission as unchanged and explicit null/empty as clear.
- Accept only canonical positive decimal strings from `1` through
  `9223372036854775807`.
- Reject every other explicit runtime value with fixed
  `RecurringInputError('Invalid account ID')` before account lookup,
  encryption, or persistence.
- Reuse the parsed bigint for both owned-active lookup and persistence.
- Preserve `Account not found` for canonical missing, foreign, or archived
  accounts.

## TDD seams

1. Numeric/unsafe integers, bigint, booleans, arrays/objects, zero, signs,
   whitespace, leading zeros, decimal/exponent/hex, Unicode, overflow,
   oversized, and text IDs reject without downstream side effects.
2. Create omission/null/empty persists null without account lookup.
3. Canonical `1` and signed-BIGINT max query and persist the exact bigint.
4. PATCH preserves owner lookup/404 precedence before account validation.
5. PATCH omission excludes `account_id` from update data; null/empty clears;
   canonical owned-active IDs persist exact bigint.
6. Canonical missing/foreign/archived IDs remain indistinguishable as
   `Account not found`.
7. Amount/date/cadence/encryption, manual processing, atomic posting,
   idempotency, route privacy, and Loop 13/14 regressions remain green.

## Acceptance criteria

1. Runtime account values cannot silently unlink or alias a recurring rule.
2. Every accepted ID is representable by signed MySQL BIGINT and parsed once.
3. Existing optional/clear/ownership/404 and valid financial contracts remain
   unchanged.
4. Changed production statements have at least 80% focused coverage and full
   tests, TypeScript, lint, Prisma generation/validation, production build/OCR
   trace, audit classification, and diff checks pass.
5. Independent product, finance, security, QA, and release reviews report no
   unresolved finding.

## Explicit exclusions

- Making linked accounts mandatory, default-account selection, archived-account
  lifecycle, public account IDs, or account schema/migration changes.
- Category/description type, whitespace, Unicode, or length policy.
- The separate 506..512-character recurring-description posting-capacity
  hazard caused by the `[Auto] ` prefix.
- Amount policy, date ordering, unknown keys, empty PATCH, cadence/timezone,
  manual-process redesign, UI, data repair, or weakening Loop 13's audit gate.

## Release and rollback

This is application-only. Noncanonical/numeric account-ID clients intentionally
move to terminal private 400 and must send canonical strings. Mixed replicas can
return 400 versus old alias/clear/500 behavior, so drain promptly.

Rollback needs no database restore and restores the silent alias/unlink path.
Production deployment of the cumulative artifact remains blocked until Loop
13's target audit returns zero; any hit requires owner-approved remediation.
