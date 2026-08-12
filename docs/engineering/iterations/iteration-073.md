# Iteration 073 — Analytics unavailable/retry state

## Category

UX / reliability / accessibility

## Executive summary

Analytics previously ignored failed core requests and could render empty or zero-valued metrics as if data were valid. The page now fails closed and offers an explicit retry.

## Scope

Validate settings, cashflow-trend, and comparison responses; clear stale state on retry; expose an accessible unavailable state; and add focused regression coverage. Recommendation refresh behavior remains unchanged.

## Acceptance criteria

- Any failed core analytics request shows an unavailable state.
- Failed requests do not become zero or empty financial metrics.
- Retry clears the prior error and restores loading behavior.

## Security and financial correctness

No authorization, persistence, or calculation source changed. Failed API data is not treated as financial zero.

## Validation

- Focused analytics availability test — Passed.
- Full baseline validation recorded in the pull request.

## Review

Independent review: unavailable. Fallback architecture, security, financial, reliability, UX/accessibility, test adequacy, and adversarial diff review completed; no unresolved Critical/High finding identified.

## Rollback

Revert the iteration commit; no persisted data changes are involved.

## Pull request

Owner-review PR to be recorded after publication.
