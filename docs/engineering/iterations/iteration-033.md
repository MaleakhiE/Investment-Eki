# Iteration 033: consolidate bounded database ID parsing

Date: 2026-07-31
Branch: `feat/loop-engineering-33-consolidate-id-parser`
Baseline: `8eb6117`

## Problem and evidence

Goal and export routes each carried a private copy of the positive signed
BIGINT parser despite `src/lib/database-id.ts` already being the shared,
tested boundary used by transaction, account, budget, and snapshot routes.
Duplicate regex/max logic can drift and makes future ID hardening incomplete.

## Scope and acceptance

- Replace the goal route's local parser with `parseDatabaseId`.
- Replace export's account-filter regex/max conversion with the same helper,
  preserving its existing validation message, CSV-only filters, and private
  no-store response contract.
- Keep all route/service ownership and response semantics unchanged; no schema
  or data changes.
- Existing parser/route matrices plus full tests, typecheck, lint, build/OCR,
  Prisma checks, audit classification, migration status, and diff checks pass.
