# Iteration 079 — Retry-safe account transfers

## Category

Data integrity and reliability.

## Problem and evidence

The `Transaction` schema already enforces a per-user idempotency key, and regular transaction creation uses it. Account transfers did not accept that key, so a client retry after an ambiguous network failure could create a second transfer.

## Scope

- Accept and validate `Idempotency-Key` on the transfer route.
- Replay an exact transfer without creating another row.
- Reject reuse of a key with a different transfer payload.
- Generate a request key in the account-transfer form.

No migration is required; the existing unique constraint is reused.

## Validation

- `npx jest --runTestsByPath src/services/transaction.service.test.ts --runInBand` — Passed (53 tests).
- `npm test -- --runInBand` — Passed (115 suites, 1053 tests).
- `npx tsc --noEmit` — Passed.
- `npm run lint` — Passed with one pre-existing unused-variable warning.
- `npm run build` — Passed, including OCR trace verification.
- `git diff --check` — Passed.

## Review and risk

Fallback architecture, security, financial-integrity, reliability, UX, and adversarial reviews completed. No migration or new dependency. Independent review unavailable; owner review required. Autonomous merge disabled.

## Rollback

Revert this iteration commit. Existing transactions and the existing schema constraint remain compatible.
