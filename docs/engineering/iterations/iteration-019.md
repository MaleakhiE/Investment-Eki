# Iteration 019 plan: exact transaction retry idempotency

## Problem

Network retries after a successful transaction create can create a second
financial record because the current endpoint has no request identity.

## Scope

- Accept an optional `Idempotency-Key` request header for transaction creation.
- Persist a user-scoped key with a forward-only nullable column and unique
  composite index.
- Return the original transaction for an exact retry.
- Reject reuse with a different payload using HTTP 409.
- Reconcile a concurrent unique-key race by rereading the winning row.

## Compatibility and safety

Requests without the header retain the existing behavior. Keys are limited to
1–128 visible ASCII characters. Matching compares normalized date, type,
category, description, decrypted amount, account identity, and receipt image.
No existing rows are rewritten and recurring/investment internal writes do not
inherit an API key.

## Recovery

Deploy the migration before code that sends keys. Roll back by reverting the
application behavior first; retain the nullable column/index until no old
writers remain. Database restore is not required for validation-only rollback.

## Acceptance criteria

- Exact retries do not create another transaction.
- A changed payload with the same key returns 409.
- Invalid keys fail before database writes.
- Concurrent unique-key races return the existing transaction.
- No-key callers retain 201/create behavior.
