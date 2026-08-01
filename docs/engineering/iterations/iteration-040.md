# Iteration 040: financial read/export error privacy

Date: 2026-08-01
Branch: `feat/loop-engineering-40-financial-read-error-privacy`
Baseline: `3d24e8b`

## Problem and acceptance

Transaction summary, summary-range, and export routes still log raw caught
errors containing private financial/query context. Reuse `safeDatabaseErrorCode`
in those three handlers and add focused tests proving private 500 responses and
safe logging. Preserve auth, filters, calculations, CSV/JSON serialization, and
API envelopes.

No service, migration, schema, dependency, or export-semantics changes.
