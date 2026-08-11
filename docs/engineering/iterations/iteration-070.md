# Iteration 070 — budget unavailable-state recovery

## Category

UX / accessibility / reliability

## Executive summary

The Budget page previously ignored non-2xx responses and rendered budget totals after loading finished, making unavailable spending-limit data look like a valid empty budget. It now fails closed and provides an in-place retry.

## User / operational problem

Users need to distinguish “no budgets yet” from a failed budget request before making spending decisions from the page.

## Repository evidence and root cause

`src/app/budget/page.tsx` only set an error for rejected fetch promises, did not inspect response status, and always rendered the normal budget content once `isLoading` became false.

## Scope

- Validate the budget response status and parse it only when successful.
- Render an accessible unavailable state with retry.
- Add a focused availability contract test.

## Non-goals

No API, database, authentication, financial-calculation, dependency, or migration changes.

## Acceptance criteria

- Non-2xx budget responses never render budget totals or the empty-budget state as current.
- The unavailable state exposes a keyboard-accessible retry action.
- Retrying clears the stale error and restores loading state.
- A valid empty response retains the existing empty-budget experience.

## Implementation details

`fetchBudgets` now resets error/loading state for every attempt, rejects non-2xx responses, and gates normal rendering behind successful loading.

## Graph Engineering impact

- Product capability: budget request → availability state → retryable spending-limit journey.
- Module dependency: the page reuses its existing budget API and loader; no new abstraction or dependency.
- Data flow: failed transport is presented as unavailable rather than as zero budgets; valid empty data remains empty.
- User journey: users can recover in place without acting on unverified budget totals.

## Security and financial correctness

No trust boundary, ownership rule, persistence path, or monetary calculation changed. The UI no longer presents unverified budget data as authoritative.

## Validation and review

- Focused budget availability test passed.
- Full validation matrix and fallback architecture, security, financial, reliability, UX/accessibility, test-adequacy, and adversarial reviews are required before PR publication.
- Independent review is unavailable; fallback review will be recorded truthfully.

## Visual validation

Not run; no browser rendering tool was available in this invocation.

## Rollback

Revert the Budget page, focused test, and iteration document; no schema or deployment migration is required.

## Pull-request reference

Added when the owner-review PR is created.
