# Iteration 030: account route ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-30-account-id-boundary`
Baseline: `d5373bd`

## Problem and evidence

`PUT` and `DELETE /api/accounts/[id]` used a local `BigInt` conversion that
accepted noncanonical values such as `01`, omitted the signed BIGINT upper
bound, and could turn values such as `1.0` into a generic 500. The repository
already has `parseDatabaseId` for this exact boundary.

## Scope

- Replace the local parser with `parseDatabaseId` for both account mutations.
- Add route tests for authentication ordering, malformed/noncanonical/overflow
  IDs, valid lower/upper boundaries, and unchanged private service failures.
- Preserve user-scoped `updateAccount`/`archiveAccount` calls, response envelopes,
  and archive semantics. No schema or data migration.

## Acceptance

Malformed IDs return the standard private 400 before JSON/service work; valid
IDs become internal `bigint` values after authentication. Focused and full test
suites, typecheck, lint, build, Prisma checks, audit classification, and diff
checks pass. Rollback is a code-only revert.
