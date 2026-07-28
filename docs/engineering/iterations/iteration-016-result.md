# Iteration 016 result: recurring description materialization capacity

Date: 2026-07-28
Branch: `feat/loop-engineering-16-recurring-description-capacity`
Baseline: `0f265cf`

## Change

- Derive a 505-code-point recurring-description maximum from the shared
  seven-code-point `[Auto] ` prefix and 512-character destination capacity.
- Validate create/PATCH descriptions before downstream side effects while
  preserving exact text, omission, null/empty clearing, and owner-first 404.
- Reject activation of an unchanged oversized legacy rule.
- Count due legacy oversized rules as failed before opening a database
  transaction and expose no misleading `next_run`.
- Pass explicit POST false/zero values to service validation instead of
  silently converting them to empty text.

No text is trimmed, normalized, sanitized, or truncated.

## TDD evidence

The RED run had 22 failures across service and route seams. Over-capacity and
non-string values reached persistence/coercion, legacy rows opened posting
transactions, and POST disguised explicit false/zero as empty text.

The final service suite passes 179 tests. The focused recurring matrix passes 5
suites and 258 tests. All 24 changed production statements execute.

The matrix covers 505/506 ASCII and astral-code-point boundaries, exact text
preservation, omission/null/empty behavior, owner-first PATCH validation,
activation/deactivation/correction of legacy rows, exact 512-character posting,
pre-transaction legacy failure, scheduler counts, and `next_run`.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused recurring matrix | Service, collection/item routes, scheduler, helper | Pass: 5 suites, 258 tests |
| Service coverage | Focused Jest coverage | Pass: 92.01% statements; changed statements 24/24 |
| Prisma generation | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 54 suites, 621 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev` | 0 Critical, 2 known High from transitive sharp; force-fix downgrade rejected |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `docker info` prerequisite | Environment-blocked: Docker daemon unavailable |
| Loop 13 target audit | Aggregate-only query | Not run; zero-result deployment gate remains open |
| Loop 16 target audit | Schema verification plus aggregate-only query | Not run; zero-result deployment gate remains open |
| Diff whitespace | `git diff --check` | Pass |

## Independent review

- Product approved the exact text, optional/clear, activation, scheduler, and
  compatibility contracts.
- Finance approved exact capacity, fail-closed legacy behavior, atomic posting,
  and unchanged idempotency.
- Security approved bounded allocation, private errors/logs, ownership, and
  downstream injection controls.
- QA independently verified the 179-test service and full focused matrix.
- Release approved the code and required the deployment/audit/rollback record
  below.

No introduced Critical, High, Medium, or Low code finding remains.

## Exact target audit and deployment stop

First verify through `information_schema.columns` that
`recurring_transactions.description` and `transactions.description` are both
utf8mb4-compatible `VARCHAR(512) NOT NULL`.

Then aggregate all recurring rows with `CHAR_LENGTH(description) > 505`,
returning only total, active, and inactive over-capacity counts. Every count
must be zero. Do not export descriptions, row/user IDs, amounts, or ciphertext.
Any hit stops deployment for owner-approved correction, deactivation, deletion,
notification, and missed-occurrence policy; never auto-truncate or auto-post.

Production remains blocked until both this Loop 16 audit and Loop 13's malformed
cadence/transfer audit pass. `P1001` and unavailable Docker satisfy neither.

## Release and rollback

This is application-only: no schema, stored-data, dependency, environment, or
secret change. Old writers accept 506..512-character descriptions while new
writers return 400; valid descriptions through 505 are mixed-version safe.

Release sequence: pause the scheduler, run and confirm both predeploy audits,
deploy and drain old writers, rerun both Loop 13 and Loop 16 aggregate audits
after drain, then resume the scheduler only when both results remain zero.

A Loop-16-only rollback needs no database restore but restores acceptance and
repeated-posting hazards; rows created by old or rolled-back writers persist
and still require audit/remediation. Combined Loop 13–16 rollback additionally
reopens malformed-cadence and one-sided-transfer paths and waives neither audit.

## Quality score

Score: 94/100. The capacity invariant has complete changed-statement coverage,
full regression/build evidence, and five independent approvals. Unavailable
target-data and isolated-MySQL evidence block production, not the local
artifact.

## Next recommendation

Assess recurring category integrity as a separate compatibility slice; it has
no prefix expansion but lacks runtime type, non-whitespace, and 50-character
storage validation.
