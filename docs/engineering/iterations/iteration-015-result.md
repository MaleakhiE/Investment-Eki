# Iteration 015 result: recurring linked-account identity

Date: 2026-07-28
Branch: `feat/loop-engineering-15-recurring-account-id`
Baseline: `7e1506b`

## Change

- Parse optional recurring `account_id` once at the shared service boundary.
- Accept only canonical positive decimal strings through signed MySQL BIGINT.
- Preserve create omission/null/empty as no account.
- Preserve PATCH omission as unchanged and null/empty as clear.
- Reuse the parsed bigint for owned-active lookup and persistence.
- Preserve one fixed `Account not found` result for missing, foreign, or
  archived canonical accounts.

Only invalid account values change: numeric/coerced/aliased/out-of-range values
now return the existing private validation response instead of silently
unlinking, aliasing, precision-misrouting, or reaching a generic 500.

## TDD evidence

The RED service run had 44 failures. Runtime numbers, booleans, aliases, unsafe
integers, and malformed values reached coercion, lookup, or persistence; false
and zero silently cleared the account.

The final service suite passes 148 tests. The focused recurring matrix passes 5
suites and 225 tests. All 18 changed production statements execute.

The matrix covers invalid runtime types and numeric forms, signed-BIGINT
boundaries, create omission/null/empty, PATCH omission/clear, exact lookup and
persistence, owner-lookup-first 404 precedence, and missing/foreign/archived
accounts.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused recurring matrix | Service, collection/item routes, scheduler, helper | Pass: 5 suites, 225 tests |
| Service coverage | Focused Jest coverage | Pass: 90.67% statements; changed statements 18/18 |
| Prisma generation | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 54 suites, 588 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev` | 0 Critical, 2 known High from transitive sharp; force-fix downgrade rejected |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `docker info` prerequisite | Environment-blocked: Docker daemon unavailable |
| Loop 13 target audit | Read-only aggregate query | Not run; mandatory zero-result deployment gate remains open |
| Diff whitespace | `git diff --check` | Pass |

## Independent review

- Product approved the omission, clearing, canonical-ID, ownership, and
  compatibility contracts.
- Finance approved exact bigint identity and confirmed encryption, cadence,
  atomic posting, and idempotency are unchanged.
- Security approved the bounded parser, privacy, ownership, and
  non-enumeration behavior.
- QA independently passed 5 suites/225 tests and verified the complete matrix.
- Release approved the code and required the cumulative deployment and rollback
  evidence recorded below.

No introduced Critical, High, Medium, or Low code finding remains.

## Limitations and cumulative deployment stop

Category/description type, whitespace, Unicode, and length policy remain
separate work. In particular, recurring descriptions of 506 through 512
characters fit their source column but can exceed the transaction column after
the seven-character `[Auto] ` prefix. Loop 15 does not truncate or repair them.

Production deployment of the cumulative Loop 13–15 artifact is blocked until
Loop 13's target read-only aggregate audit returns zero malformed recurring
transfer/cadence rows. `P1001` and unavailable Docker do not satisfy that gate.
Any hit requires owner-approved remediation.

## Release and rollback

This is application-only: no schema, stored-data, environment, or dependency
change. Drain old replicas promptly because mixed Loop 15 replicas can return
400 versus prior alias, silent-clear, or 500 behavior for the same invalid
account input. Cumulative pre-Loop-13 replicas can additionally accept or
materialize corrupt cadence/one-sided-transfer rules until drained.

A Loop-15-only rollback needs no database restore and restores account alias,
silent-unlink, and generic-500 behavior. Rolling back the combined Loop 13–15
artifact also reopens malformed-cadence and one-sided-transfer materialization;
it neither repairs stored rows nor waives the mandatory target audit.

## Quality score

Score: 94/100. The boundary has complete changed-statement coverage, full
regression/build evidence, and five independent approvals. The open target
audit and unavailable isolated MySQL evidence block production, not the local
artifact.

## Next recommendation

Define the smallest lossless recurring text-capacity contract, beginning with
the `[Auto] ` description expansion hazard and a read-only historical audit.
