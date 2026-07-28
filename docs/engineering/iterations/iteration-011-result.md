# Iteration 011 result: recurring scheduler privacy

Date: 2026-07-28
Branch: `feat/loop-engineering-11-recurring-scheduler-privacy`
Baseline: `5b07fe5`

## Change

- Added `Cache-Control: private, no-store, max-age=0` to every deployment
  recurring-scheduler 200, 401, and 500 response.
- Preserved the exact `{ created, skipped, failed }` response contract while
  explicitly reconstructing those fields so future internal service metadata
  cannot be serialized accidentally.
- Added a closed recurring error taxonomy: `P1001`, `P2002`, `P2025`, `P2034`,
  `TYPE_ERROR`, and `UNCLASSIFIED`.
- Replaced raw top-level scheduler errors with a fixed event and safe code.
- Replaced raw per-rule posting errors and internal recurring IDs with a fixed
  event and safe code.
- Preserved silent `P2002` idempotent skips and completed HTTP 200 responses
  when individual rules fail.

No authentication, scheduler date/cadence, financial row, ciphertext, account,
transaction atomicity, retry, schema, migration, dependency, status, message,
or manual per-user response changed.

## TDD evidence

The RED run failed 19 cases:

- every scheduler outcome omitted the private/no-store header;
- a mocked result with internal BigInt metadata caused serialization failure
  because the route passed the whole object through;
- raw top-level and per-rule errors plus the internal rule ID were logged;
- no safe recurring error classifier existed.

The final focused run passes 3 suites and 52 tests. It covers:

- missing, malformed, wrong, and unconfigured cron credentials;
- exact private 401, aggregate 200, empty 200, and generic 500 envelopes;
- response allowlisting against injected internal IDs/categories/results;
- safe-code allowlist, arbitrary-code rejection, and `TYPE_ERROR`;
- raw message/metadata/internal/financial context exclusion from logs;
- per-rule failure counting without batch abort;
- first same-date create followed by silent `P2002` skip with exactly one
  ledger transaction;
- migration-chain uniqueness, Jakarta/month-end/yearly behavior, atomic
  posting, and encrypted amount/account compatibility.

Focused coverage plus Git diff mapping covers 15/15 changed production
statements (100%).

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused RED/GREEN | Scheduler route, recurring service, and migration-chain Jest paths | Pass: 3 suites, 52 tests |
| Changed executable statements | Focused Jest coverage plus Git diff mapping | Pass: 15/15, 100% |
| Prisma generation | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 51 suites, 409 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev` | 0 Critical, 2 known High; Next only via transitive sharp |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Diff whitespace | `git diff --check` | Pass |

An authenticated scheduler smoke was deliberately not run because it can post
financial transactions. Isolated MySQL two-run idempotency plus platform log
inspection remains a staging gate.

## Independent review

- Product approved exact response/status compatibility and private aggregate
  operator behavior.
- Finance verified unchanged ciphertext, account, category/description, date,
  atomic occurrence, failure-count, and idempotency semantics.
- Security verified fail-closed auth, all response headers, explicit result
  allowlisting, closed error taxonomy, and absence of raw/internal log data.
- QA independently reran the 3-suite/52-test matrix and approved the unique
  occurrence and no-log duplicate regression.
- Release independently reran all 51 suites/409 tests and required documentation
  wording to remain scoped to the scheduler/shared posting logs; it was fixed.

No introduced Critical, High, Medium, or Low finding remains.

## Limitations

- Session-authenticated `/api/recurring` responses still lack an explicit
  private/no-store contract, and their route catches still log raw error
  objects. This private financial surface is the next bounded candidate.
- Completed batches with per-rule failures remain HTTP 200. Operators must
  monitor `failed`; retry/status/backoff policy needs explicit operational
  acceptance.
- Application tests do not prove proxy/CDN behavior, access-log authorization
  redaction, external alerting, or log retention/access/deletion controls.
- Previously ingested raw logs are not removed by this change.

## Release and rollback

Deploy as an application-only change and drain old replicas promptly because
mixed versions can still return responses without the explicit
private/no-store contract or emit raw logs. No database restore, migration,
environment-variable, or scheduler reconfiguration is required.

Rollback is application-only but reopens the log/cache-policy gap and cannot
remove already-ingested logs. Before release, use isolated MySQL to run the
same due date twice, confirm create then skip, inspect sanitized application
logs, and verify the ingress does not persist credentials or response bodies.

## Quality score

Score: 94/100. All changed production statements and every scheduler outcome
are covered, the full build and five independent reviews pass, and financial
behavior is unchanged. Missing isolated MySQL/platform-log evidence keeps it
below 95.

## Next recommendation

Apply the same private/no-store and sanitized-error contract to the
session-authenticated recurring API without changing the signed-in user's
manual processing response.
