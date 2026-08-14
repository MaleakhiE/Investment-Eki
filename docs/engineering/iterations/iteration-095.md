# Iteration 095 — Require successful gold price envelopes

Category: financial correctness / frontend reliability

## Problem and evidence

The investments gold-price helper previously accepted any object with `responseDetails`, even if the envelope was not marked successful. That meant an error-shaped payload could still be treated as valid price data if its nested fields looked correct. The parser is used by the investments page at the client trust boundary, so the top-level success signal needs to be enforced explicitly.

## Scope and acceptance criteria

- Require `responseStatus === 'SUCCESS'` before trusting gold price response details.
- Reject error envelopes even when nested fields look valid.
- Preserve valid successful envelopes and the existing numeric field validation.
- Keep the gold-price API route and fallback behavior unchanged.

Non-goals: changing the API contract, adding a new source, or altering gold price calculations.

## Implementation

`parseGoldPriceResponse` now checks the top-level `responseStatus` before reading `responseDetails`. The parser still validates the nested `sell_price`, `source`, and `updated_at` fields exactly as before, and the investments page keeps clearing state when the response envelope is invalid.

## Security and privacy

No secrets, tokens, or exception details are exposed. Malformed envelopes are rejected locally.

## Database and compatibility

No schema or migration change. The `/api/gold-price` route already returns a successful envelope, so valid behavior remains unchanged.

## Validation

- Focused parser tests cover a valid success envelope, an error envelope, and invalid price values.
- Full validation and lint/build checks are recorded alongside the branch state.

## Rollback

Revert the parser change in `src/app/investments/gold-price-response.ts` and its tests.

## Follow-up

If more endpoints need envelope validation, factor a shared helper for response-status enforcement instead of duplicating the check.
