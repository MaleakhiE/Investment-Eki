## Objective

Require the investments gold-price parser to trust `responseDetails` only when the upstream/API envelope reports `responseStatus: "SUCCESS"`.

## Scope

- Add a client-side parser guard for successful gold-price envelopes.
- Keep existing validation for positive finite `sell_price`, non-empty `source`, and non-empty `updated_at`.
- Add focused tests for valid success envelopes, error envelopes with otherwise valid details, and invalid sell prices.
- Record iteration 095 durable engineering state.

## Acceptance criteria

- [x] `parseGoldPriceResponse` rejects any envelope whose `responseStatus` is not `SUCCESS`.
- [x] Error-shaped envelopes cannot be treated as valid gold price data merely because nested fields look valid.
- [x] Successful valid envelopes still parse into the existing gold price shape.
- [x] Invalid numeric price values still fail closed.
- [x] Existing `/api/gold-price` fallback behavior remains unchanged.

## Validation

Local validation at HEAD `af798ebee1dce0afb589a6736341b9b56681268c`:

- [x] `npm run test -- --runInBand` — passed (`119` suites, `1080` tests).
- [x] `npm run lint` — passed with one pre-existing warning in `src/lib/loop-control/state.test.ts:128` (`_branch` unused).
- [x] `npx tsc --noEmit` — passed.
- [x] `npm run build` — passed, including OCR trace verification.
- [x] `git diff --check` — passed.
- [x] Pre-push ECC hook — passed lint, test, and build before pushing.

## Review matrix

Role-separated review is in progress for exact HEAD `af798ebee1dce0afb589a6736341b9b56681268c`:

| Role | Runtime context | Reviewed SHA | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Business Analyst | Hermes delegated child | `af798ebee1dce0afb589a6736341b9b56681268c` | Pending | Dispatched for acceptance/product/financial review. |
| QA / Test Engineer | Hermes delegated child | `af798ebee1dce0afb589a6736341b9b56681268c` | Pending | Dispatched for coverage/regression review. |
| Security Engineer | Hermes delegated child | `af798ebee1dce0afb589a6736341b9b56681268c` | Pending | Dispatched for upstream trust-boundary/error-privacy review. |
| CTO / Principal Engineer | Hermes delegated child | `af798ebee1dce0afb589a6736341b9b56681268c` | Pending | Dispatched for final gate; merge must wait for returned verdict and live PR/check reconciliation. |

## Dependencies and compatibility

- No database schema or migration change.
- No new package dependency.
- The server route continues returning the existing success response envelope for both upstream and fallback prices.

## Deployment and rollback

Deploy through the normal application release path after mandatory checks and reviews pass. Rollback is a normal revert of this branch/PR, primarily `src/app/investments/gold-price-response.ts`, `src/app/investments/gold-price-response.test.ts`, and the iteration state docs.

## Known risks

- Gold prices remain estimates derived from USD/IDR fallback sources; this iteration only hardens response-envelope validation and does not change pricing methodology.
- Merge is intentionally blocked until the pending role-separated reviews and visible GitHub checks are reconciled for the exact live PR HEAD.
