# Iteration 008 result: atomic goal additions

Date: 2026-07-27
Branch: `feat/loop-engineering-8-goal-atomic-additions`
Baseline: `38b8d4b`

## Change

- Replaced the uncoordinated read/decrypt/add/write path with a bounded
  ownership-scoped atomic compare-and-swap.
- The conditional write compares every mutable goal field used by the response:
  encrypted current and target amounts, name, deadline, category, priority,
  completion state, goal ID, and authenticated internal user ID.
- A compare miss or retryable Prisma `P2034` rereads fresh encrypted state,
  recomputes once, and retries up to three attempts.
- A successful write formats the winning coherent snapshot without an
  unscoped response read.
- Enforced the existing visible Add Amount contract at the API and service
  boundaries: finite positive numeric input and a finite resulting balance.
- Rejected malformed/primitive JSON and invalid signed-BIGINT goal IDs before
  service dispatch.
- Sanitized unexpected goal-route logs to an allowlisted Prisma `P####` code or
  `UNCLASSIFIED`; error messages, ciphertext, amounts, bodies, and identities
  are not logged or returned.

No schema, migration, package, lock, environment, UI, ledger, account,
transaction, cashflow, export, summary, or success-response shape changed.

## TDD evidence

The first RED service run failed 11 of 12 cases: it returned stale concurrent
state, used the unscoped update/reread path, accepted unsafe values, and had no
bounded comparison retry. The route RED run failed 9 of 14 cases for malformed
IDs, invalid additions, and domain validation mapping.

After the first implementation, independent reviews found stale metadata and
raw error-log exposure. New tests failed against both defects before the CAS
token was expanded and logging was sanitized. The final focused run passes 2
suites and 30 tests, including:

- fresh-state retry after a compare miss and after `P2034`;
- third-attempt compare/P2034 exhaustion and non-conflict propagation;
- complete ownership and mutable-snapshot comparison;
- missing/foreign isolation and no-write behavior;
- below-, exact-, and over-target completion with uncapped current amount;
- invalid input, overflow, and corrupt stored-value fail-closed behavior;
- auth-first, signed-BIGINT ID, JSON, 400/404/500, update-delegation, and
  response-envelope behavior;
- a negative assertion proving a synthetic `ciphertext:secret` error is absent
  from logs and responses.

Changed production statement coverage is 51/53 (96.2%): goal service 26/26
(100%) and goal route 25/27 (92.6%). Whole-file coverage is lower because
pre-existing goal CRUD functions outside this slice remain untested.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused RED/GREEN | Explicit `jest --runTestsByPath` for goal service and bracketed route | Pass: 2 suites, 30 tests |
| Changed statements | Focused Jest coverage plus Git diff statement mapping | Pass: 96.2% |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 48 suites, 327 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev --json` | 0 Critical, 2 known High; Next only via transitive sharp |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Diff whitespace | `git diff --check` | Pass |

One full-suite run was incorrectly started in parallel with `npm run build`.
The build's `prisma generate` temporarily replaced the generated client while
Jest was importing it, producing four `.prisma/client/default` import
failures. The build completed and regenerated the client; the required serial
rerun then passed all 48 suites / 327 tests. This was a harness concurrency
error, not an application regression.

## Independent review

- Product approved the coherent winning snapshot, unchanged user-visible
  semantics, and add-only scope.
- Finance approved finite-positive validation as enforcement of the existing
  Add Amount command rather than a new withdrawal/IDR policy.
- Security approved the ownership-scoped CAS, bounded retry, fail-closed
  validation, and sanitized operational logging.
- QA approved the repaired conflict, metadata, P2034, corruption, JSON, and
  privacy coverage.
- Release approved the code-only artifact and requires isolated MySQL
  contention evidence before production deployment.

No introduced Critical, High, Medium, or Low code finding remains.

## Limitations

- Mocked Prisma tests prove orchestration and affected-row handling, not real
  InnoDB contention.
- An ambiguous HTTP retry can still add twice. Exact request idempotency needs
  a durable request key/ledger and product retention policy.
- Absolute current edits, target/status edits, and additions have no
  user-visible version/409 precedence contract beyond this internal CAS retry.
- Canonical IDR rounding, scale, integer, and maximum rules remain owner-policy
  work.

## Release and rollback

Before production deployment, run repeated concurrent additions through
separate connections against isolated production-like MySQL and assert the
exact initial-plus-sum result, completion thresholds, other-user isolation,
and no partial write. Then run one authenticated isolated goal smoke. Do not
mutate production financial data solely for verification.

Replace old replicas quickly: any old instance keeps the former racy path.
Rollback is application-only with no database restore, but it immediately
reopens the lost-update defect and cannot reconstruct historically lost
contributions.

## Quality score

Score: 94/100. TDD, changed-code coverage, full gates, build/OCR tracing,
privacy hardening, and all independent reviews pass. Unavailable real-MySQL
contention/replay evidence and the existing sharp residual keep it below 95.

## Next recommendation

Select the next policy-neutral, independently testable vertical slice. Do not
expand goal concurrency into idempotency or absolute-edit conflict semantics
without an explicit product contract and forward migration design.
