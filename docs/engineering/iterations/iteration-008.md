# Iteration 008: atomic goal additions

Date: 2026-07-27
Branch: `feat/loop-engineering-8-goal-atomic-additions`
Baseline: `38b8d4b`

## Problem

`addToGoal` currently reads an encrypted amount, decrypts and adds in
JavaScript, then writes outside a transaction. Two concurrent accepted
contributions can read the same balance and overwrite one another. Its update
and response read are also scoped only by goal ID after the initial ownership
check.

## Supported boundary

- Protect only concurrent additive `add_amount` commands.
- Use the stored encrypted amounts plus every mutable goal field returned to
  the caller as an atomic compare-and-swap token with at most three attempts.
- Read, decrypt, calculate, encrypt, and conditionally write inside every
  attempt. A failed comparison rereads fresh state before recomputing.
- Scope every goal operation by both goal ID and authenticated internal
  `user_id`.
- Preserve uncapped over-target amounts and derive completion as
  `new current >= current target`.
- Enforce the existing visible add-form contract at the server boundary:
  additions must be finite positive numbers and the resulting amount must stay
  finite.

## TDD seams

1. The conditional write compares ownership plus the complete original
   mutable goal snapshot.
2. A compare miss rereads and recomputes from the latest encrypted balance and
   target.
3. Retry stops after three comparison misses and propagates database failures.
4. Missing or foreign goals return `null` without a write.
5. Every read and write remains ownership-scoped.
6. Below-target, exact-target, and over-target completion behavior remains
   unchanged.
7. The route rejects malformed IDs and invalid additions with the shared 400
   envelope without invoking the service.

## Acceptance criteria

1. Concurrent accepted additions cannot silently replace one another under
   the supported atomic compare-and-swap contract.
2. The API retains its existing success, missing, unauthorized, and private
   error envelopes; invalid add input is rejected before persistence.
3. Goal response fields, encrypted storage, UI behavior, summary behavior, and
   the absence of account/cashflow/transaction side effects remain unchanged.
4. Focused and full tests, Prisma validation, TypeScript, lint, build/OCR
   tracing, audit classification, and diff checks pass.
5. Independent product, finance, security, QA, and release reviews report no
   unresolved High or Critical finding in the slice.

## Explicit exclusions

- Absolute edit versus add and manual completion versus add precedence.
- HTTP request idempotency after an ambiguous response.
- Canonical IDR rounding, scale, integer, and maximum policy.
- Contribution ledger, version column, raw SQL lock, schema, migration,
  package, UI, or API response-shape changes.

## Verification limitation

Mocked Prisma tests can prove conditional-write orchestration, fresh-state
retry, ownership scope, and failure behavior. They cannot prove real InnoDB
contention. Production release requires an isolated disposable-MySQL
contention test that asserts the final sum.

## Release and rollback

Deploy the application artifact with a rapid replica replacement so old racy
instances do not remain in the mixed-version window. Rollback is
application-only and needs no database restore, but immediately reopens the
lost-update race and cannot reconstruct historical lost contributions.
