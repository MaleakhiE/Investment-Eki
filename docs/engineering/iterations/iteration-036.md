# Iteration 036: account and cashflow API error privacy

Date: 2026-08-01
Branch: `feat/loop-engineering-36-account-cashflow-error-privacy`
Baseline: `102c862`

## Problem and evidence

Account, transfer, and cashflow API catches still pass raw errors to
`console.error`. These routes handle balances, transfers, and encrypted
cashflow; the transaction routes were hardened in Iteration 035 and already
provide a shared safe database-code classifier.

## Scope and acceptance

- Reuse `safeDatabaseErrorCode` in account collection/item, account transfer,
  cashflow collection, and cashflow-by-month routes.
- Add focused tests for private 500 responses and sanitized logs, including an
  allowlisted code and an unknown error.
- Preserve auth ordering, ownership, validation, response envelopes, and all
  financial writes.

## Exclusions and limits

No service, schema, migration, dependency, logging transport, or browser
behavior changes. Other raw-error routes remain separate bounded slices.
