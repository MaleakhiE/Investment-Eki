# Iteration 064 — duplicate-aware transaction import preview

## Category

Product capability, data quality, and reliability.

## Executive summary

This iteration adds an authenticated CSV preview endpoint for manual transaction capture. It strictly bounds input size and row count, validates each row before any persistence decision, preserves quoted descriptions, and identifies duplicate rows within the uploaded file.

## User problem and repository evidence

The market research identified QRIS-heavy households and UMKM users as a strong manual/import capture segment. Investment-Eki had transaction creation and export but no safe import or reconciliation preview. Directly writing imported financial data would make malformed or duplicated rows difficult to recover.

## Scope

- Add a pure CSV parser and duplicate-aware preview service.
- Add an authenticated `POST /api/transactions/import/preview` route.
- Return row-level errors and valid/invalid/duplicate counts without writing transactions.
- Add parser and route regression tests.

## Non-goals

No database migration, transaction persistence, bank credential aggregation, provider connector, automatic category inference, or account reconciliation against existing records.

## Acceptance criteria

- CSV input is limited to 1 MB and 1,000 transaction rows.
- Required columns and valid calendar dates, types, descriptions, categories, and positive amounts are enforced.
- Quoted commas and escaped quotes parse correctly.
- Duplicate rows are identified deterministically by normalized transaction content.
- Unauthenticated requests are rejected and valid previews do not write data.

## Implementation details

- `transaction-import.service.ts` performs bounded parsing, strict amount parsing, row validation, and duplicate fingerprinting.
- The preview route authenticates first and returns the standard API envelope.
- No Prisma call is made by the preview path.

## Product, security, and financial correctness impact

This gives users a reviewable import boundary for manual statements while avoiding irreversible writes. Authentication remains server-side. Amounts are parsed only from explicit numeric syntax; invalid values fail closed rather than becoming zero or a guessed amount.

## Accessibility and responsive behavior

No UI surface was added; this iteration establishes the API contract for a later accessible preview interface.

## Validation

- Focused Jest: 2 suites, 4 tests passed.
- Full Jest: 107 suites, 1,037 tests passed.
- TypeScript, ESLint, production build/OCR trace, Prisma validation, database status, audit threshold, and diff checks passed.
- Disposable migration replay: blocked by environment because the Docker daemon is unavailable.
- Publication is blocked until `npm run db:verify` can run successfully in a Docker-enabled environment.

## Rollback and follow-up

Rollback is a route/service revert with no database migration. Follow-up: add an accessible client preview with explicit user confirmation, then reconcile approved rows against existing transactions in a separate iteration.
