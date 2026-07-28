# Iteration 010 result: strict financial write inputs

Date: 2026-07-28
Branch: `feat/loop-engineering-10-strict-transaction-inputs`
Baseline: `7212e14`

## Change

- Added one shared server-side boundary for finite positive amounts and exact
  real `YYYY-MM-DD` dates within MySQL's `1000-01-01` through `9999-12-31`
  range.
- Transaction create/update and account transfer now reject impossible dates
  rather than allowing JavaScript normalization. Accepted dates persist at UTC
  midnight on the requested calendar day.
- Transaction create/update now reject `NaN` and positive/negative infinity;
  transfer retains the same rule through the shared helper.
- Recurring create/update applies the same invariant because it is a sibling
  source of future transaction writes.
- Closed the recurring partial-update `amount: null` and explicit
  `start_date: null`/empty/non-string bypasses while preserving user-scoped
  existence lookup and empty/null end-date clearing.
- Preserved finite positive fractions exactly with no rounding, truncation,
  integer rule, scale, or maximum.

No schema, migration, dependency, ciphertext format, success response,
scheduler cadence, transaction classification, account scoping, transfer
atomicity, or UI behavior changed.

## TDD evidence

The first RED run failed 27 cases because non-finite ordinary amounts and
shape-correct impossible dates reached downstream behavior, while recurring
input reached account lookup. The security rereview then supplied a focused
RED case proving explicit recurring `start_date: null` was treated as omitted.

The final focused run passes 3 suites and 75 tests. It covers:

- non-finite, zero, negative, null, and numeric-string amount rejection;
- exact lower/upper MySQL date boundaries, leap days, impossible dates,
  noncanonical strings, and runtime-invalid date types;
- fail-fast transaction create/update and transfer behavior;
- fail-fast recurring create and user-scoped recurring partial update;
- exact fractional encryption and UTC leap-date persistence;
- recurring end-date clearing, scheduler month-end behavior, occurrence
  idempotency, transfer atomicity, and response-envelope regressions.

Focused coverage plus Git diff mapping covers 29/29 changed production
statements (100%).

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused RED/GREEN | Explicit Jest paths for transaction, recurring, and transfer route | Pass: 3 suites, 75 tests |
| Changed executable statements | Focused Jest coverage plus Git diff mapping | Pass: 29/29, 100% |
| Prisma generation | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 51 suites, 391 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev` | 0 Critical, 2 known High; Next only via transitive sharp |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Diff whitespace | `git diff --check` | Pass |

The change is deterministic before persistence, so mocks prove fail-fast
ordering. An isolated MySQL leap-date and no-write smoke remains a staging
release gate because neither configured MySQL nor disposable Docker was
available.

## Independent review

- Product approved the stricter write behavior and unchanged successful UX,
  scheduler, schema, and response semantics.
- Finance approved exact finite-value preservation, UTC date persistence,
  ownership, transfer atomicity, summary exclusion, and end-date clearing.
- Security found and verified the repair for the explicit recurring
  `start_date` runtime-type bypass, then approved all covered write boundaries.
- QA independently reran the focused suite and approved boundary coverage,
  fail-fast order, and unchanged scheduler behavior.
- Release required direct non-finite transfer tests and explicit legacy-data
  wording; both were addressed before approval.

No introduced Critical, High, Medium, or Low finding remains.

## Limitations

- Historical non-finite ciphertext or normalized dates are not detected or
  repaired. In particular, the scheduler copies existing recurring ciphertext
  into a transaction; a malformed legacy recurring rule can still materialize
  until a separate reconciliation/handling policy is approved.
- The account-transfer UI derives its default date from UTC. Near a Jakarta
  day boundary it can choose a different valid calendar day; changing "today"
  requires an explicit timezone product contract.
- Amount scale, rounding, integer-only IDR, maximums, signed/refund behavior,
  date ordering, future/backdate rules, read filters, and exact retry
  idempotency remain separate decisions.

## Release and rollback

Deploy as an application-only change and drain old replicas promptly because
mixed versions retain the previous acceptance behavior. No database restore,
migration, or data rewrite is required.

Rollback is application-only but reopens invalid input acceptance. Before
release, use isolated MySQL to smoke valid create/update/transfer/recurring leap
dates and prove invalid inputs create no row; do not use production financial
writes as a smoke test.

## Quality score

Score: 94/100. Every changed production statement is covered, all local
static/full/build gates pass, and five independent reviews approve the final
boundary. Unavailable real MySQL replay and unresolved legacy malformed rows
keep it below 95.

## Next recommendation

Audit recurring scheduler result caching and raw failure logging as the next
policy-neutral, code-only candidate. Canonical IDR rounding/scale/max semantics
remain blocked on an owner decision.
