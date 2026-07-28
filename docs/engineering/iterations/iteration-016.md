# Iteration 016: recurring description materialization capacity

Date: 2026-07-28
Branch: `feat/loop-engineering-16-recurring-description-capacity`
Baseline: `0f265cf`

## Problem

Recurring and posted transaction descriptions are both utf8mb4 `VARCHAR(512)`,
but automatic posting prepends `[Auto] ` (seven characters). A recurring
description of 506 through 512 characters can persist and then fail every due
posting transaction.

## Supported boundary

- Derive a 505-code-point recurring-description maximum from the exact posting
  prefix and 512-character destination capacity.
- Count Unicode code points, matching utf8mb4 `CHAR_LENGTH` more closely than
  JavaScript UTF-16 code units.
- Preserve accepted text exactly: no trimming, normalization, sanitization, or
  truncation.
- Create omission/null/empty remains stored empty text; explicit non-string
  values reject.
- PATCH omission remains unchanged; null/empty clears; explicit non-string or
  over-capacity values reject after owner lookup.
- Reject activation of a legacy oversized rule unless the same update corrects
  its description.
- Fail closed on legacy oversized due rows before opening a database
  transaction, count them as failed without raw logging, and expose
  `next_run: null`.
- Reuse one prefix constant for validation and materialization.

## TDD seams

1. Create accepts exact 505 ASCII/astral-code-point descriptions and preserves
   empty, whitespace, and Unicode text exactly.
2. Create rejects explicit non-strings and 506 code points before account
   lookup, encryption, or persistence.
3. PATCH preserves owner-lookup/404 precedence, omission, null/empty clearing,
   exact accepted text, and side-effect ordering.
4. An oversized legacy rule can be deactivated or corrected, but cannot be
   activated unchanged.
5. A due 505-code-point rule posts the exact 512-code-point prefixed
   description inside the existing atomic transaction.
6. A due legacy oversized rule opens no transaction, is counted as failed, and
   logs no raw value; reads preserve its text with no `next_run`.
7. Cadence, account identity, amount/date, encryption, ownership, P2002
   idempotency, route privacy, and scheduler aggregate contracts remain green.

## Acceptance criteria

1. Every newly accepted recurring description can materialize losslessly into
   the current transaction schema.
2. Existing oversized rows cannot create partial writes, repeated database
   rollback work, or a misleading next run.
3. Changed production statements have at least 80% focused coverage; full
   tests, TypeScript, lint, Prisma generation/validation, production build/OCR
   trace, audit classification, and diff checks pass.
4. Product, finance, security, QA, and release reviews leave no unresolved
   finding.

## Explicit exclusions

- Category type/empty/50-character policy, aggregation-key hardening, request
  body limits, rate limiting, control-character policy, Unicode normalization,
  grapheme limits, prefix wording, schema expansion, or recurring mutation UI.
- Automatic truncation, deactivation, deletion, correction, catch-up posting,
  or user notification for historical rows.
- Weakening Loop 13 or Loop 15 contracts.

## Deployment gate and rollback

This is application-only. Production remains blocked until both Loop 13's
malformed cadence/transfer audit and an aggregate-only Loop 16 audit confirm
zero recurring descriptions above 505 `CHAR_LENGTH` characters after verifying
both target columns are utf8mb4 `VARCHAR(512)`. `P1001` and unavailable Docker
satisfy neither gate. Any hit requires owner-approved remediation.

Pause the scheduler, deploy and drain old writers, rerun both Loop 13 and Loop
16 audits, and resume only after both post-drain results are zero. A
Loop-16-only rollback needs no database restore but reopens acceptance and
database retries for unpostable descriptions; cumulative rollback also reopens
earlier recurring integrity failures and waives neither audit.
