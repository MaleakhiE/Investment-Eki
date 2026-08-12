# Iteration 074 — Cashflow account unavailable/retry state

## Category

UX / reliability / accessibility

## Executive summary

Cashflow silently ignored account-load failures, leaving users without an explanation or recovery action while account-dependent transaction entry could not proceed. The page now fails closed and exposes retry.

## Scope

Validate the accounts response used by Cashflow, clear stale account options on failure, expose accessible unavailable messaging, and add focused regression coverage. Transaction and summary loading behavior is unchanged.

## Acceptance criteria

- Non-2xx account responses show an unavailable state.
- Failed account data is not treated as an empty successful account list.
- Retry reloads accounts without affecting other cashflow data.

## Security and financial correctness

No authorization or persistence path changed. No financial values are synthesized from a failed account request.

## Validation

- Focused cashflow availability test — Passed.
- Full baseline validation recorded in the pull request.

## Review

Independent review: unavailable. Fallback architecture, security, financial, reliability, UX/accessibility, test adequacy, and adversarial diff review completed; no unresolved Critical/High finding identified.

## Rollback

Revert the iteration commit; no persisted data changes are involved.

## Pull request

Owner-review PR to be recorded after publication.
