# Iteration 004 result: notification scheduler response privacy

Date: 2026-07-27
Branch: `feat/loop-engineering-4-notification-response-privacy`
Baseline: `cf90407`

## Selected opportunity

Loop 4 completed the safe privacy half of the notification backlog. The
monthly scheduler previously returned internal user IDs and per-user activity
metadata even though operators only need aggregate run health. Preference
timing and low-balance/custom-alert semantics remain separate product work.

## Change

- `sendMonthlyNotifications()` returns only `sent`, `failed`, and `skipped`;
  the O(users) per-user result array was deleted.
- The endpoint returns those counts plus their derived total and never
  serializes user IDs, emails, notification types, delivery flags, log IDs, or
  financial data.
- Success, authorization failure, and unexpected failure responses all use
  `Cache-Control: private, no-store, max-age=0`.
- The user batch selects only internal ID and encrypted email, the two fields
  required by delivery.
- Logs retain a stable failure stage plus an allowlisted SMTP/Prisma/provider
  code. Raw messages, recipient data, user IDs, claim IDs, and unknown codes
  are not logged.
- API docs and OpenAPI now require the fail-closed cron bearer credential,
  document aggregate/skipped semantics and no-store headers, and use a
  dedicated cron security scheme.
- `.env.example` names the required `CRON_SECRET` without supplying a secret.

Removing `responseDetails.details` is an intentional response-schema break.
No repository consumer exists, but external scheduler compatibility must be
confirmed before deployment.

## TDD evidence

The first focused run failed 12 of 13 tests for missing no-store headers,
per-user results, broad user reads, and raw logging. Review follow-up added a
safe observability contract; its RED run failed three cases until the
allowlisted taxonomy was implemented. The final focused run passes 14 tests.

The changed route has 100% statements, branches, functions, and lines
coverage.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Baseline | Loop 3 final gates at `cf90407` | Pass: clean verified baseline |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint -- --max-warnings=0` | Pass |
| Focused tests | Notification route + service Jest | Pass: 2 suites, 14 tests |
| Focused coverage | Route Jest coverage | Pass: 100% all metrics |
| Full tests | `npm test -- --runInBand` | Pass: 44 suites, 284 tests |
| OpenAPI | JSON parse + contract grep | Pass |
| Production build | `npm run build` | Pass, including OCR trace verification |
| Runtime smoke | Invalid bearer `POST /api/notifications/send-monthly` | Pass: exact private/no-store 401 |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL host returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Production audit | `npm audit --omit=dev` | Pre-existing fail: 2 high Next.js/transitive sharp advisories |
| Diff whitespace | `git diff --check` | Pass |

One sandboxed build attempt failed when Turbopack could not bind its internal
localhost port (`EPERM`). The required rerun outside that sandbox passed; this
was an execution-environment restriction, not a product build failure.

A valid runtime scheduler request was deliberately not executed because it
can mutate notification claims and send real email.

## Independent review

- Product/operator: approved after safe structured error taxonomy and explicit
  no-store API/OpenAPI documentation; no unresolved medium finding.
- Finance: approved; count partition, partial-failure visibility, financial
  email behavior, idempotency, and durable notification reconciliation are
  unchanged.
- Security: approved; aggregate-only source, least-privilege select,
  fail-closed auth, response privacy, and log privacy were verified.
- QA: approved; exact aggregate/401/500 contracts, no-store headers, service
  regressions, documentation, and OpenAPI parsing pass.
- Release: approved locally; external scheduler parser confirmation remains a
  pre-deployment gate rather than a code blocker.

## Remaining risks

- Explicit `monthly_reminder=false` and `monthly_summary=false` settings are
  persisted but still ignored by delivery. Honoring explicit opt-outs is the
  next safe privacy/correctness slice; timing semantics can remain deferred.
- SMTP send and marking the durable claim `SENT` cannot be atomic. A successful
  SMTP send followed by a database failure can be retried and duplicated;
  resolving this requires an outbox/provider-idempotency design.
- External scheduler consumers are unknown. Deployment must confirm they use
  HTTP status/aggregate counts and do not parse removed per-user details.
- Next.js/transitive sharp retain two pre-existing high audit advisories with
  no reviewed stable fully remediated Next.js release.

## Release and rollback

There is no schema, migration, dependency, lockfile, credential, or runtime
secret-value change. The only environment-file change documents an existing
required key. Deploy the app only after scheduler parser confirmation.
Rollback is the previous application artifact; no database restore is
appropriate.

## Quality score

Score: 94/100. The slice meets its privacy, security, operator, coverage,
documentation, and release-code acceptance criteria. External scheduler
compatibility, unavailable database replay, and inherited upstream/outbox
risks keep it below 95.

## Next recommendation

Honor the two explicit monthly notification opt-out booleans without inventing
timing, low-balance, or custom-alert behavior.
