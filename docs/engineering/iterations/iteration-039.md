# Iteration 039: settings API error privacy

Date: 2026-08-01
Branch: `feat/loop-engineering-39-settings-error-privacy`
Baseline: `b909cfb`

## Problem and evidence

Settings, notification-preference, and AI-recommendation APIs still log raw
caught errors. These endpoints handle private user preferences and account
configuration; analytics and financial routes now use the shared safe taxonomy.

## Scope and acceptance

- Reuse `safeDatabaseErrorCode` in all four settings catches.
- Add focused tests proving private 500 responses, unknown-error
  classification, and allowlisted-code preservation.
- Preserve auth, validation, settings semantics, API envelopes, and update
  behavior.

## Exclusions and limits

No product policy, service, schema, migration, dependency, SMTP transport, or
browser behavior changes.
