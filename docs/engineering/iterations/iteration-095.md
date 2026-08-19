# Iteration 095 — Require successful gold price envelopes

Category: financial correctness / frontend reliability

## Problem and evidence

The investments gold-price flow previously had two trust-boundary flaws:

1. the client accepted gold price payloads without requiring a verified envelope;
2. a failed price fetch could leave the gold calculator enabled, allowing a zero-valued snapshot to be submitted.

Because the investments page is user-facing financial software, an unverified or offline price must not auto-drive the current value field.

## Scope and acceptance criteria

- Require `responseStatus === 'SUCCESS'` before trusting gold price response details.
- Require a verification flag for live gold prices and treat fallback/offline responses as unverified.
- Disable the gold calculator whenever the price is unverified or loading.
- Keep manual `currentValue` entry available when the price cannot be verified.
- Reject error envelopes even when nested fields look valid.
- Preserve valid successful envelopes and the existing numeric field validation.
- Add route-level regression coverage for verified/unverified pricing behavior.

Non-goals: changing the API contract shape beyond the verification flag, adding a new source, or altering gold price calculations.

## Implementation

`parseGoldPriceResponse` now checks the top-level `responseStatus` before reading `responseDetails`, and requires `is_verified`. The investments page disables calculator mode when the response is unverified, clears derived state on failure, and keeps manual current value entry available. The gold-price route now marks provider-derived prices as verified and fallback/offline prices as unverified, with an exchange-rate sanity bound to avoid implausible provider data.

## Security and privacy

No secrets, tokens, or exception details are exposed. Malformed envelopes are rejected locally. Fallback pricing is no longer trusted as verified at the client trust boundary.

## Database and compatibility

No schema or migration change. The `/api/gold-price` route continues to return a successful envelope for both verified and fallback cases, but clients can distinguish them through `is_verified`.

## Validation

- Focused parser tests cover a valid verified envelope, an error envelope, invalid price values, and missing verification metadata.
- Route regression tests cover verified pricing and offline fallback behavior.
- UI source-level regression tests cover the manual-entry fallback state.
- Full validation and lint/build checks are recorded alongside the branch state.

## Rollback

Revert the parser, route, and investments page changes together with their tests.

## Follow-up

If more financial APIs need trust-boundary enforcement, factor shared helpers for envelope verification instead of duplicating the check.
