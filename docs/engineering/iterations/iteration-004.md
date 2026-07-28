# Iteration 004: notification scheduler response privacy

Date: 2026-07-27
Branch: `feat/loop-engineering-4-notification-response-privacy`
Baseline: `cf90407`

## Selection

The notification backlog combines a safe privacy defect with unresolved
product semantics. This iteration fixes the safe boundary only: the monthly
scheduler does not need per-user identifiers or activity metadata in its HTTP
response. Preference enforcement remains deferred because reminder timing,
summary timing, low-balance, and custom-alert behavior require an explicit
product contract.

## Problem

The cron-authenticated monthly scheduler response serializes internal user IDs,
notification type, and per-user success. Notification type reveals whether a
user has current-month cashflow, and automation responses commonly enter
long-lived scheduler/proxy logs. The route also lacks an explicit no-store
policy. The service loads unused user columns, retains an O(users) result
array, and logs raw errors with internal identifiers.

## Contract

- The service returns exactly `{ sent, failed, skipped }`.
- The successful endpoint returns exactly those counts plus
  `total = sent + failed + skipped`.
- The endpoint never returns per-user IDs, emails, notification types, success
  flags, log IDs, or financial data.
- Partial delivery remains HTTP 200 with a nonzero `failed` count. Scheduler
  retry/status semantics do not change.
- Missing, wrong, malformed, or unconfigured cron credentials remain the same
  generic 401 and never invoke the service.
- Unexpected failures remain a generic 500.
- Every 200, 401, and 500 response is `private, no-store, max-age=0`.
- Durable per-user reconciliation remains in `notification_logs`; server logs
  use stable messages without raw errors, emails, user IDs, or claim IDs.
- The user batch selects only `id` and encrypted `email`.

## Compatibility

Removing `responseDetails.details` is an intentional breaking response-schema
change for any external scheduler parser. No repository consumer exists.
Operators retain aggregate counts and durable notification logs. Deployment
must verify that external automation uses HTTP status and aggregate counts,
not per-user response rows.

## TDD seams

1. Route tests prove exact aggregate-only success/partial-failure/empty
   envelopes and absence of per-user metadata.
2. Route tests prove exact private/no-store 200, 401, and generic 500 results.
3. Service tests prove the sent/failed/skipped partition and idempotent claim
   behavior after result-array deletion.
4. Service tests prove the explicit user select and sanitized failure logging.
5. Documentation/OpenAPI tests or contract inspection prove mandatory
   `CRON_SECRET`, aggregate schema, and no per-user example.

## Scope exclusions

- No notification preference reads, reminder-day scheduling, summary timing,
  low-balance/custom-alert delivery, public-ID substitution, notification-log
  API, concurrency redesign, schema migration, or dependency change.
- Do not valid-path smoke the live scheduler: it mutates claims and can send
  real email. Runtime smoke is limited to an invalid credential.

## Acceptance criteria

1. All response and logging privacy requirements above are test-backed.
2. Sent, failed, skipped, idempotency, and retry claim behavior do not regress.
3. API docs, OpenAPI, and `.env.example` match fail-closed cron authentication.
4. Focused coverage and full Prisma, TypeScript, lint, Jest, build, audit,
   runtime, and diff gates are recorded.
5. Independent product, finance, security, QA, and release reviews have no
   unresolved high-severity finding.
