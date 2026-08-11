# Iteration 068 — accounts unavailable-state recovery

## Category

UX / accessibility / reliability

## Executive summary

The Accounts page currently renders the empty onboarding message after a failed account fetch. That conflates unavailable data with a valid empty account list and leaves the user without an in-context recovery action.

## Scope

- Render an explicit unavailable state when `/api/accounts` fails.
- Add a keyboard-accessible retry action that reuses the existing loader.
- Preserve the valid empty state and all account mutation behavior.

## Non-goals

No API, database, authentication, financial-calculation, or dependency changes.

## Acceptance criteria

- Failed account loading never presents the empty-account onboarding message.
- The unavailable state exposes an accessible Retry action.
- Retrying uses the existing request path and restores loading state.
- A valid zero-account response still shows the onboarding message.

## Graph Engineering impact

- Product capability: account data request → availability state → retryable Accounts journey.
- Module dependency: `src/app/accounts/page.tsx` remains on the existing API and feedback seams.
- Data flow: fetch failure is presented as unavailable; no fallback balance or persistence is introduced.
- User journey: users can distinguish “no accounts yet” from “accounts could not be loaded” and recover without navigation.

## Security and financial correctness

No trust boundary or money calculation changed. Existing server-side authentication, ownership, and account response validation remain unchanged.

## Validation and review

- Focused accounts availability test passed.
- Full validation matrix and fallback architecture, security, financial, reliability, UX/accessibility, and adversarial reviews are required before PR publication.

## Rollback

Revert the page and focused test changes; no schema or deployment migration is required.
