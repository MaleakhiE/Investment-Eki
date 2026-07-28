# Iteration 014: recurring route input structure

Date: 2026-07-28
Branch: `feat/loop-engineering-14-recurring-route-inputs`
Baseline: `87e4d96`

## Problem

Authenticated recurring POST/PATCH routes treat malformed or non-object JSON as
unexpected server failures or inconsistent missing-field/no-op requests. Item
routes also pass raw route text to `BigInt`, which accepts noncanonical aliases
and values outside MySQL signed BIGINT range or throws into generic 500 handling.

These are transport/client faults, not financial or operational failures.

## Supported boundary

- Authenticate before awaiting item params, parsing IDs, or reading JSON.
- Accept POST/PATCH bodies only when parsed JSON is a non-null, non-array object.
- Return the standard private validation envelope for malformed/non-object JSON:
  `Validation failed` with `errors: ['Invalid JSON body']`.
- Accept item IDs only as canonical positive decimal strings from `1` through
  `9223372036854775807`.
- Return the standard private validation envelope for invalid IDs:
  `Validation failed` with `errors: ['Invalid recurring ID']`.
- Validate PATCH IDs before reading the body.
- Keep expected structural 400s unlogged.

## TDD seams

1. Signed-out POST/PATCH/DELETE with malformed bodies, rejecting params, or
   invalid IDs returns the exact private 401 without parsing or service calls.
2. Authenticated malformed JSON plus null, arrays, strings, numbers, and
   booleans returns exact private unlogged 400 and invokes no recurring service.
3. Empty and populated JSON objects remain structurally accepted; POST
   missing-fields, create, and manual-process behavior remains exact.
4. Empty, zero, signs, whitespace, leading zeros, decimals, exponents, hex,
   Unicode digits, text, over-range, and oversized IDs return exact private
   unlogged 400 before PATCH body parsing or service calls.
5. IDs `1` and `9223372036854775807` reach the service as exact bigint values.
6. Valid missing/foreign PATCH remains private 404; valid missing DELETE remains
   the existing private idempotent 200.
7. Domain validation 400s, unexpected safe-code 500s, Loop 11/12 privacy, and
   Loop 13 cadence/transfer integrity regressions remain green.

## Acceptance criteria

1. Expected structural/identity client faults never enter unexpected error
   logging or service/database paths.
2. Authentication-first and invalid-ID-before-PATCH-body precedence are exact.
3. Only invalid authenticated request behavior changes from generic
   500/inconsistent handling to deterministic terminal 400.
4. No valid financial, cadence, ownership, DTO, status/body, scheduler, schema,
   migration, dependency, UI, or environment contract changes.
5. Changed production statements have at least 80% focused coverage and full
   tests, TypeScript, lint, Prisma generation/validation, production build/OCR
   trace, audit classification, and diff checks pass.
6. Independent product, finance, security, QA, and release reviews report no
   unresolved finding.

## Explicit exclusions

- Field-level type/frequency/cadence/text/account-ID schemas or coercion.
- Unknown-key rejection, empty PATCH/no-op changes, content-type or body-size
  policy, manual-process redesign, or DELETE not-found redesign.
- CSRF/rate limiting/CORS, public recurring UUIDs, route-ID refactors
  elsewhere, service/scheduler/financial changes, UI, schema/migration, or data
  repair.
- Weakening or bypassing Loop 13's mandatory zero-result target audit gate.

## Release and rollback

This is application-only. External clients that retried invalid requests after
500 must treat the new 400 as terminal. Mixed replicas can classify the same
invalid request differently, so drain promptly.

Rollback needs no database restore and only restores malformed-input
500/inconsistent behavior. Production deployment of the cumulative artifact
remains blocked until Loop 13's target read-only audit returns zero; any hit
requires owner-approved remediation. Safe runtime smoke remains signed-out
only; authenticated checks belong in isolated staging.
