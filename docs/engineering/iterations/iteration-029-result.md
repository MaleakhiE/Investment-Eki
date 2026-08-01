# Iteration 029 result: goal delete ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-29-goal-delete-id-boundary`
Baseline: `876ded1`

## Outcome

`DELETE /api/goals/[id]` now reuses the existing canonical positive signed
BIGINT parser used by PATCH. Authentication still happens first; malformed,
zero, noncanonical, negative, fractional, scientific-notation, and overflow
identifiers return the private standard 400 validation envelope before the
delete service. Valid IDs are passed as internal `bigint` values with the
existing user ownership scope and idempotent response unchanged.

## TDD evidence

RED: 10 DELETE cases showed arbitrary IDs reaching `BigInt`, generic 500
handling, or a service call. GREEN: 12 new route assertions pass, including
authentication ordering, eight malformed forms, both signed-BIGINT boundaries,
and private database-failure handling.

## Validation

| Check | Result |
| --- | --- |
| Focused DELETE/PATCH route tests | Pass: 28 tests |
| Full Jest suite | Pass: 65 suites, 780 tests |
| TypeScript | Pass |
| ESLint | Pass |
| Prisma generation/validation | Pass on baseline |
| Production build/OCR trace | Pass on baseline |
| Dependency audit | 2 known High transitive `sharp` findings; force-fix would downgrade Next |
| Migration status | 9 migrations up to date against configured Test-Eki MySQL |
| Diff whitespace | Pass |

## Review and recovery

The change is application-only, preserves authenticated user scoping, and has
no migration or stored-data impact. Rollback is a code revert. The remaining
browser/staging smoke, historical recurring audits, and product-defined
notification/recommendation semantics are outside this slice.
