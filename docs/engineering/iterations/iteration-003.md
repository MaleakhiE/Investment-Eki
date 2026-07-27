# Iteration 003: account-aware data export

Date: 2026-07-27
Branch: `feat/loop-engineering-3-account-aware-export`
Baseline: `24ee7d9`

## Selection

The two higher-ranked backlog items are currently gated:

- canonical IDR boundaries require owner decisions for scale, maximum, rounding, signs, and compatibility;
- npm reports that the latest stable Next.js (`16.2.12`) remains in the vulnerable range, so moving production to a preview release is not an acceptable automatic patch.

The next safe opportunity is an account-aware export whose scope is truthful and testable.

## Problem

The current JSON file is labeled a backup despite having no import/restore path and omitting account source records. Transaction exports also discard transfer endpoints, load unused receipt-image data, and cannot be limited to an owned account or inclusive date range.

## Contract

- JSON remains an unfiltered, versioned plaintext data export. It is not a restorable backup.
- JSON adds owned active and archived accounts plus transfer-aware transaction rows.
- CSV remains a transaction report and accepts optional inclusive `from`, `to`, and owned `accountId` filters.
- Account-scoped CSV includes a transaction when the selected account is either source or destination and adds an account-relative signed delta.
- Filters are rejected for JSON rather than silently producing a partial file.
- Account, transaction, user, and relational numeric IDs are never written into exported artifacts.
- Receipt images, credentials, notification settings, recurring rules, and operational database state remain excluded and are named as exclusions.

## Data and security

All reads remain scoped by authenticated internal `user_id`. Account filters resolve with `{ id, user_id }`, including archived owned accounts; missing and foreign accounts return the same not-found result. Prisma selects exclude receipt images, ciphertext-only fields not used by the DTO, and internal IDs except transiently where required to calculate a filtered delta.

Every CSV cell, including account labels, continues through formula neutralization. All export responses, including errors, retain `private, no-store`.

## Test-first seams

1. Service tests prove explicit selects, user/account ownership, archived accounts, inclusive dates, deterministic ordering, and cross-user rejection.
2. DTO tests prove transfer endpoints, signed account-relative deltas, and absence of internal/sensitive fields.
3. CSV tests prove transfer headers, empty exports, and formula neutralization for new account columns.
4. Route tests prove strict format/date/account validation, filter forwarding only for CSV, standard error envelopes, filenames, and no-store headers.
5. Settings source/runtime checks prove filters are grouped with CSV and JSON is described as a non-restorable plaintext export.

## Scope exclusions

- No import/restore workflow, database backup replacement, schema migration, production dependency, receipt binary export, pagination/streaming framework, or new IDR policy.
- Large exports remain buffered. Explicit selects remove receipt-image amplification; streaming or quotas require measured production limits.

## Acceptance criteria

1. Transfers export once with source and destination names; account-scoped delta is correct for income, expense, transfer source, and transfer destination.
2. CSV filters are strict, inclusive, ownership-scoped, and support archived owned accounts.
3. JSON includes account source records, is versioned, states exclusions, and contains no internal IDs or ciphertext.
4. UI and filenames no longer claim automatic backup/restore capability.
5. Focused coverage and the full Prisma, TypeScript, lint, Jest, build, audit, runtime, and diff gates are recorded.
6. Independent security, finance, and release reviews have no unresolved high-severity findings.
