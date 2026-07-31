# Iteration 030 result: account route ID boundary

Date: 2026-07-31
Branch: `feat/loop-engineering-30-account-id-boundary`
Baseline: `d5373bd`

## Outcome

Account PUT and DELETE routes now reuse `parseDatabaseId`, the repository's
canonical positive signed-BIGINT parser. Authentication remains first;
noncanonical, negative, zero, fractional, scientific-notation, and overflow
IDs return private 400 validation responses before JSON/service work. Valid
lower and upper signed-BIGINT values remain user-scoped and preserve all
response and archive semantics.

## TDD evidence

The new route matrix covers 16 malformed PUT/DELETE IDs, four valid boundary
calls, authentication ordering, and existing collection-route regressions.
The local parser was removed rather than duplicated.

## Validation

| Check | Result |
| --- | --- |
| Focused account route tests | Pass: 26 tests |
| Full Jest suite | Pass: 66 suites, 802 tests |
| TypeScript/lint | Pass |
| Prisma/build/OCR | Pass |
| Audit | Known 2 High transitive `sharp`; force-fix would downgrade Next |
| Migration status | 9 migrations up to date against Test-Eki MySQL |
| Diff whitespace | Pass |

No schema, data, ownership, or financial semantics changed. Rollback is a
code-only revert.
