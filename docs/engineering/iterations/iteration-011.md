# Iteration 011: recurring scheduler privacy

Date: 2026-07-28
Branch: `feat/loop-engineering-11-recurring-scheduler-privacy`
Baseline: `5b07fe5`

## Problem

The deployment recurring scheduler returns operational financial counts without
an explicit cache policy. Its top-level catch logs the raw error object, while
per-rule failures log both an internal recurring-rule ID and the raw error.
Prisma/runtime errors can carry query context, internal identifiers, private
financial fields, or connection details.

The existing monthly-notification scheduler establishes the local contract:
private no-store responses, aggregate-only output, generic failures, and
strictly classified operational error codes.

## Supported boundary

- Preserve fail-closed bearer authentication and the exact public
  `{ created, skipped, failed }` aggregate response.
- Explicitly reconstruct those three response fields so later internal service
  metadata cannot cross the cron boundary.
- Add `Cache-Control: private, no-store, max-age=0` to every scheduler 200, 401,
  and 500 response.
- Log only fixed event names and strictly allowlisted operational codes:
  `P1001`, `P2002`, `P2025`, `P2034`, `TYPE_ERROR`, or `UNCLASSIFIED`.
- Remove internal user/rule/account IDs, categories, descriptions,
  amount/ciphertext, dates, raw messages, stacks, Prisma metadata, and
  credentials from failure logs.
- Keep a completed batch with per-rule failures as HTTP 200; operators must
  alert on the `failed` aggregate rather than HTTP status alone.

## TDD seams

1. Missing, malformed, wrong, and unconfigured cron credentials return the
   exact private 401 envelope without processing.
2. Mixed and empty successful runs return only the three aggregate counters,
   even if a mocked service object contains sensitive extra fields.
3. Top-level failure returns the exact private generic 500 and logs only a
   fixed label plus safe code.
4. Known safe codes pass; arbitrary codes/messages/primitives become
   `UNCLASSIFIED`; `TypeError` becomes `TYPE_ERROR`.
5. A per-rule non-`P2002` failure increments `failed`, continues processing,
   and emits no raw error, internal ID, or financial context.
6. A same-date retry proves the first occurrence creates one ledger
   transaction and the duplicate `P2002` claim is skipped without an error log.
7. Existing Jakarta date, month-end clamping, yearly cadence, atomic occurrence
   posting, encrypted amount copying, and owner aggregation remain green.

## Acceptance criteria

1. The deployment scheduler response, its top-level failure log, and shared
   per-rule posting failure log expose no per-user or per-rule recurring data.
2. Cache, status, response-envelope, and safe-log contracts are exact and
   testable across every scheduler outcome.
3. No scheduling, financial, retry, idempotency, authentication, schema,
   migration, dependency, or manual per-user process semantics change.
4. Changed production statements have at least 80% focused coverage and full
   tests, TypeScript, lint, Prisma generation/validation, production build/OCR
   trace, audit classification, and diff checks pass.
5. Independent product, finance, security, QA, and release reviews report no
   unresolved finding.

## Explicit exclusions

- Session-authenticated `/api/recurring` cache headers and its signed-in user's
  manual created-category response; review that private financial surface as a
  separate bounded slice.
- Scheduler retry/status policy, alerts/metrics, per-rule failure persistence,
  catch-up/concurrency/throughput, cadence/timezone, amount/date policy, or
  historical reconciliation.
- Proxy/CDN/access-log configuration, authorization-header redaction, log
  retention/deletion, or external observability integration.

## Release and rollback

This is application-only. Drain old replicas promptly because mixed versions
can still emit responses without the explicit private/no-store contract or raw
logs. Rollback needs no database restore but reopens leakage and cannot remove
logs already ingested.

Do not live-smoke an authenticated scheduler against production because it can
write financial rows. Use wrong-credential HTTP smoke locally and retain an
isolated MySQL two-run idempotency/log inspection as a staging gate.
