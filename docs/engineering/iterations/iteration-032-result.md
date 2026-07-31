# Iteration 032 result: investment snapshot DELETE ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-32-investment-snapshot-id-boundary`
Baseline: `3ea4e52`

## Outcome

Investment snapshot DELETE now authenticates before using the shared bounded
`parseDatabaseId` parser. Malformed, noncanonical, non-positive, fractional,
scientific-notation, and overflow IDs return a private standard 400 response;
valid IDs remain internal `bigint` values. Existing success and not-found
contracts remain unchanged, and unexpected errors log only allowlisted Prisma
codes rather than raw messages.

## TDD and review evidence

The focused route matrix has 13 passing tests for authentication ordering,
eight malformed forms, both BIGINT boundaries, 404 behavior, and sanitized
500 behavior. Independent QA review found no blocker. The full suite passes 68
suites and 827 tests.

## Validation

| Check | Result |
| --- | --- |
| Focused snapshot route tests | Pass: 13 tests |
| Full Jest suite | Pass: 68 suites, 827 tests |
| TypeScript/lint | Pass |
| Production build/OCR trace | Pass |
| Prisma generation/validation | Pass |
| Migration status | 9 migrations up to date against Test-Eki MySQL |
| Dependency audit | 2 known High transitive `sharp` findings; force-fix would downgrade Next |
| Diff whitespace | Pass |

No schema, data, ownership, or financial semantics changed. Rollback is a
code-only revert. Service-level concurrency behavior remains a separate
follow-up and was not changed here.
