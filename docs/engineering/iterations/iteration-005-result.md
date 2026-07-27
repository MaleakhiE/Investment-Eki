# Iteration 005 result: explicit monthly notification opt-outs

Date: 2026-07-27
Branch: `feat/loop-engineering-5-notification-opt-outs`
Baseline: `98b4d71`

## Change

- The scheduler reads only the two monthly preference booleans with each
  user's existing delivery fields.
- Explicit false suppresses only the cashflow-derived notification type.
  Missing settings preserve enabled behavior and no alternate type is sent.
- Opted-out users exit before claims, email decryption, financial-summary
  reads, SMTP, or notification-log mutation. Both false exits before cashflow.
- Settings copy no longer promises unenforced timing. The reminder-day control
  is disabled and identifies scheduling as inactive.
- API and OpenAPI documentation define preference and idempotency skips,
  missing-row defaults, no-log behavior, and same-month re-enable behavior.

## TDD evidence

The initial focused RED run failed five preference cases because the scheduler
ignored both flags and did not load the exact preference projection. The final
focused run passes 3 suites and 27 tests, including missing-setting REMINDER
and SUMMARY defaults, matching and irrelevant false flags, both-false
short-circuiting, projection failure, retries, response privacy, and cron auth.

Focused service/route coverage is 87.23% statements, 80.61% branches, 95.83%
functions, and 87.31% lines. The route remains at 100% for all metrics.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Focused tests | Notification service, route, and cron-auth Jest | Pass: 3 suites, 27 tests |
| Focused coverage | Notification service + route Jest coverage | Pass: 87.23/80.61/95.83/87.31 aggregate |
| Full tests | `npm test -- --runInBand` | Pass: 44 suites, 290 tests |
| OpenAPI | JSON parse | Pass |
| Production build | `npm run build` | Pass, including OCR trace verification |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL host returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Production audit | `npm audit --omit=dev` | Pre-existing fail: 2 high Next.js/transitive sharp advisories |
| Diff whitespace | `git diff --check` | Pass |

A valid scheduler smoke was deliberately skipped because it can create claims
and send real email. The route is unchanged from Loop 4, whose invalid-bearer
runtime smoke returned the exact private, non-cacheable 401.

## Independent review

- Product approved the type-specific opt-out contract and truthful settings
  copy.
- Finance approved the unchanged type selection, count partition, money
  behavior, and retry/idempotency boundaries.
- Security approved consent ordering, least-privilege projection, fail-closed
  preference loading, and preserved private aggregate response.
- QA approved after timing-neutral summary copy and direct missing-settings
  SUMMARY regression coverage.
- Release approved the code and requires the operational gates below.

No Critical, High, or unresolved Medium finding remains.

## Remaining risks

- Preferences are a batch snapshot. A change after the read affects the next
  run and does not cancel an in-flight send.
- SMTP success and durable `SENT` persistence are not atomic; a database
  failure after SMTP can cause a retry and duplicate email.
- `skipped` intentionally combines opt-out and idempotency cases. Disabled
  runs create no historical consent record.
- Timing, low-balance, and custom-alert delivery remain undefined and inactive.
- Database connectivity/replay and two upstream audit findings remain
  environment or dependency blockers outside this slice.

## Release and rollback

There is no schema, migration, dependency, lockfile, or secret change. Before
deployment, confirm the external scheduler accepts the unchanged aggregate
shape while treating `skipped` as opt-out or idempotency. Use isolated users
and an SMTP sink for a valid staging smoke.

Rollback is asymmetric: the previous artifact ignores opt-outs. Pause the
scheduler before rollback and keep it paused until a forward fix or explicit
owner approval. No database restore is required.

## Quality score

Score: 95/100. The slice meets its consent, privacy, TDD, coverage,
documentation, and independent-review criteria. Unavailable database replay,
the accepted batch race, and inherited SMTP/upstream risks keep it below 100.

## Next recommendation

Do not invent notification timing or alert behavior. Select the next
independent backlog item that has a complete product and financial contract.
