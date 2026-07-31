# Iteration 031 result: budget DELETE ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-31-budget-delete-id-boundary`
Baseline: `36e06ab`

## Outcome

`DELETE /api/budgets/[id]` now authenticates first, reuses the canonical
bounded `parseDatabaseId` parser, and returns the standard private 400 envelope
for malformed, noncanonical, non-positive, fractional, scientific-notation,
and overflow IDs. Valid IDs remain internal `bigint` values and retain the
user-scoped deletion behavior. Service failures now log only an allowlisted
Prisma code instead of raw error details.

## TDD and review evidence

RED reproduced generic 500 responses and coerced IDs. GREEN covers
authentication ordering, eight malformed forms, both valid BIGINT boundaries,
the private failure envelope, and sanitized logging. Independent review found
no blocking correctness or security issue.

## Validation

| Check | Result |
| --- | --- |
| Focused budget route tests | Pass: 12 tests |
| Full Jest suite | Pass: 67 suites, 814 tests |
| TypeScript/lint | Pass |
| Production build/OCR trace | Pass |
| Prisma generation/validation | Pass |
| Migration status | 9 migrations up to date against Test-Eki MySQL |
| Dependency audit | 2 known High transitive `sharp` findings; force-fix would downgrade Next |
| Diff whitespace | Pass |

No schema, data, ownership, or financial semantics changed. Rollback is a
code-only revert. Other route-specific ID gaps remain separate slices.
