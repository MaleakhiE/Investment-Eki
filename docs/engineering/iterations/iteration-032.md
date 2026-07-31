# Iteration 032: investment snapshot DELETE ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-32-investment-snapshot-id-boundary`
Baseline: `3ea4e52`

## Problem and evidence

`DELETE /api/investments/snapshot/[id]` directly coerces its route ID with
`BigInt`, allowing noncanonical values, overflow, and generic 500 failures.
Its catch also logs raw errors, unlike the privacy-hardened adjacent routes.

## Scope and acceptance

- Authenticate first and reuse `parseDatabaseId` for the snapshot ID.
- Return the standard private 400 validation envelope before service access for
  malformed IDs; preserve valid not-found 404, success 200, and service-error
  500 contracts.
- Log only an allowlisted database error code; do not expose raw messages.
- Add route tests for ordering, malformed forms, both BIGINT boundaries,
  not-found, success, and private failure behavior. No schema/data changes.
- Full Jest, typecheck, lint, build/OCR, Prisma checks, audit classification,
  migration status, and diff checks must pass.
