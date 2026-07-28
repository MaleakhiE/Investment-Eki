# Iteration 013 result: recurring cadence integrity

Date: 2026-07-28
Branch: `feat/loop-engineering-13-recurring-cadence-integrity`
Baseline: `362076a`

## Change

- Reject recurring types other than exact `INCOME|EXPENSE`, preventing
  DB-supported `TRANSFER` rules from creating one-sided ledger transfers.
- Reject unknown frequencies and null, coerced, fractional, or out-of-range
  cadence values required by the resulting frequency.
- Preserve omitted PATCH cadence values while keeping explicit null visible to
  validation; irrelevant cadence can still be cleared on a DAILY transition.
- Require explicitly patched `is_active` to be boolean, preserving `false`.
- Make scheduler execution and `next_run` share one fail-closed predicate for
  legacy transfer, unknown-frequency, or malformed-cadence rows.

No amount precision, date, encryption, account ownership, Jakarta calendar,
month-end clamping, atomic posting, occurrence idempotency, response, privacy,
schema, migration, dependency, UI, or environment contract changed.

## TDD evidence

The RED run failed 22 cases. Invalid new rules reached account lookup/write
paths, malformed legacy transfer/weekly/monthly rules materialized financial
transactions, and malformed legacy rules exposed misleading next-run dates.

The final focused run passes 4 suites and 118 tests. It covers:

- both financial types and all four supported frequencies;
- weekly 0/6, monthly/yearly day 1/31, and yearly month 1/12;
- null, non-string, coerced, fractional, and below/above-range failures before
  account lookup, encryption, or persistence;
- omitted-versus-explicit-null PATCH behavior and valid transitions to every
  cadence;
- exact boolean `is_active`, positive fractional amounts, and null/empty
  end-date clearing;
- valid DAILY/WEEKLY/MONTHLY/YEARLY next-run behavior;
- fail-closed legacy transfer, unknown-frequency, and missing-cadence rows;
- valid weekly posting, Jakarta/month-end behavior, atomicity, P2002
  idempotency, owner/account scoping, private routes, and safe logs.

Focused service coverage is 87.36% statements, 84.73% branches, 85% functions,
and 91.02% lines. Focused coverage plus Git diff mapping covers 38/40 changed
production statements (95%).

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused RED/GREEN | Recurring service, collection/item routes, and scheduler route | Pass: 4 suites, 118 tests |
| Changed executable statements | Focused Jest coverage plus Git diff mapping | Pass: 38/40, 95% |
| Prisma generation | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 53 suites, 481 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev` | 0 Critical, 2 known High; Next only via transitive sharp |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Target historical-data audit | Read-only aggregate query | Not run: target MySQL is unreachable; mandatory predeploy gate remains open |
| Diff whitespace | `git diff --check` | Pass |

## Independent review

- Product approved exact discriminator/cadence behavior, established bounds,
  month-end clamping, fractional amounts, false/null/omission semantics, and
  unchanged user-visible contracts.
- Finance verified the one-sided transfer path is closed while encryption,
  account scoping, amount/date behavior, atomicity, and idempotency remain
  unchanged.
- Security verified both the weekly-null daily-posting exploit and new/legacy
  recurring-transfer materialization are closed before side effects.
- QA required explicit success, range, transition, clearing, and next-run
  boundary evidence; all requested cases were added and rerun.
- Release required the same missing create cases and made a zero-result target
  historical audit a mandatory deployment prerequisite; both code evidence and
  release documentation were corrected.

No introduced Critical, High, Medium, or Low code finding remains.

## Limitations and deployment stop gate

The configured target MySQL returned `P1001`, and Docker migration replay is
unavailable. Existing malformed rows therefore could not be counted.

Production deployment must stop until a read-only aggregate audit returns zero
for:

- every recurring `type='TRANSFER'` row;
- active WEEKLY rows with null/out-of-range `day_of_week`;
- active MONTHLY rows with null/out-of-range `day_of_month`;
- active YEARLY rows with null/out-of-range day or month;
- unexpected frequency values if schema history permits them.

Only aggregate counts and reasons should leave the target environment. Treat
row/user IDs as restricted operational evidence and never export ciphertext,
descriptions, or amounts. Any hit stops deployment and requires owner-approved
deactivate/delete/correct/user-notification policy; do not auto-repair.

Malformed JSON/route IDs, text/account-ID normalization, amount
scale/rounding/max policy, end-before-start, historical repair, and cadence
redesign remain separate work.

## Release and rollback

The artifact is application-only, with no schema, migration, dependency, data
rewrite, or environment change. After the audit gate returns zero, drain old
replicas promptly because mixed versions can still accept or materialize
invalid rules. Validate valid-cadence create/update/scheduler behavior against
isolated staging MySQL; production smoke remains signed-out only.

Rollback needs no database restore but reopens one-sided recurring transfers
and weekly-null daily postings. It does not repair stored rows or remove the
historical-audit requirement.

## Quality score

Score: 94/100. Financial corruption paths are closed with 95% changed-statement
coverage, a green full build, and five independent reviews. The unavailable
target audit and isolated-MySQL evidence keep it below 95 and block deployment,
not the local code artifact.

## Next recommendation

After the mandatory target audit is resolved, return to the policy-neutral
recurring route boundary: malformed JSON/non-object bodies and noncanonical
signed-BIGINT rule IDs.
