# Iteration 019 result: exact transaction retry idempotency

Date: 2026-07-30
Branch: `feat/loop-engineering-19-transaction-idempotency`

## Implemented

- Added optional `Idempotency-Key` support to `POST /api/transactions`.
- Added a nullable `transactions.idempotency_key` column and user-scoped
  unique index through a forward-only Prisma migration.
- Replayed exact requests with HTTP 200 and rejected payload reuse with HTTP
  409; requests without a key remain HTTP 201.
- Reconciled `P2002` unique-key races by rereading and comparing the winning
  transaction.

## Validation

- Transaction service: 50 tests passed, including all idempotency cases.
- Prisma client generation and TypeScript validation passed.
- Full regression, production build, migration replay, and database deployment
  remain final release gates for this slice.

## Limitations

The migration was not applied to a live or disposable MySQL database because
the configured database is unreachable and Docker is unavailable. Existing
clients do not gain idempotency until they send the header.
