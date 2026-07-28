# Iteration 012: session recurring API privacy

Date: 2026-07-28
Branch: `feat/loop-engineering-12-recurring-api-privacy`
Baseline: `a08c3f1`

## Problem

Every session-authenticated recurring-management response lacks an explicit
private/no-store policy. `GET` returns decrypted amount, category, description,
account and schedule details; manual processing returns created category names.
Unexpected GET/POST/PATCH/DELETE catches also log raw errors that can contain
submitted values, Prisma metadata, internal identifiers, or connection details.

Loop 11 already established the recurring safe-code taxonomy. This slice
applies that existing contract to the owner-facing route surface.

## Supported boundary

- Add `Cache-Control: private, no-store, max-age=0` to every explicit and caught
  response from `/api/recurring` and `/api/recurring/[id]`: 200, 201, 400, 401,
  404, and 500.
- Preserve exact statuses, response envelopes, messages, and response details
  for list, create, manual processing, update, delete, missing fields,
  validation, unauthorized, not found, and unexpected failures.
- Preserve the signed-in user's recurring records and manual created-category
  list; these are authorized owner data whose storage is being constrained,
  not removed.
- Reuse `getSafeRecurringErrorCode` and log unexpected failures as fixed
  operation events plus `{ code }` only.
- Keep expected `RecurringInputError` validation failures unlogged.
- Never log request bodies, route IDs, user/account/rule IDs, category,
  description, amount/ciphertext, dates, raw messages/stacks/metadata, session
  material, cookies, or credentials.

## TDD seams

1. Unauthenticated GET/POST/PATCH/DELETE returns the exact private 401 and
   invokes no recurring service; auth remains before mutation processing.
2. GET preserves the current owner-facing DTO while adding private/no-store.
3. POST preserves exact manual-process 200, create 201, missing-field 400, and
   fixed domain-validation 400 behavior.
4. PATCH preserves exact success 200, missing/foreign 404, and validation 400.
5. DELETE preserves exact ownership-scoped idempotent 200 behavior.
6. Unexpected failures in all four operations return exact generic private 500
   responses and log only the operation label plus safe code.
7. Malformed JSON/route IDs retain their current generic 500 classification,
   but raw submitted values do not enter application logs.
8. Loop 11 scheduler privacy plus recurring validation, scheduling, atomicity,
   and idempotency regressions remain green.

## Acceptance criteria

1. Every owner-facing recurring API response has an exact explicit
   private/no-store policy.
2. The four application catch logs expose no raw or per-user/per-rule data.
3. No ownership, DTO, validation, financial, scheduling, idempotency, response
   status/body/envelope/message, UI, schema, migration, dependency, or
   environment contract changes.
4. Changed production statements have at least 80% focused coverage and full
   tests, TypeScript, lint, Prisma generation/validation, production build/OCR
   trace, audit classification, and diff checks pass.
5. Independent product, finance, security, QA, and release reviews report no
   unresolved finding.

## Explicit exclusions

- Runtime body schemas, malformed JSON/BigInt status changes, type/frequency or
  string-length validation, and account-ID parsing.
- Manual process failed/skipped observability, aggregate redesign, retry/status
  policy, cadence/timezone, financial/service behavior, or historical repair.
- CSRF/rate limiting/CORS, public rule IDs, UI changes, schema/migration,
  dependency changes, or external observability.
- Proxy/CDN/access-log behavior, URL/cookie/header redaction, response-body
  retention, log retention/access/deletion, or previously ingested data.

## Release and rollback

This is application-only and order-independent. Drain old replicas promptly
because mixed versions can still return responses without the explicit
private/no-store contract or emit raw application errors.

Rollback needs no database restore but reopens the cache-policy/logging gap and
cannot remove already-ingested logs. Safe runtime smoke is signed-out only;
authenticated mutations/manual processing belong in isolated staging fixtures.
