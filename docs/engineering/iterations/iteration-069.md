# Iteration 069 — goals unavailable-state recovery

## Category

UX / accessibility / reliability

## Executive summary

The Goals page continued rendering goal content after a failed request and did not offer an in-context recovery action. This made unavailable financial-goal data look like a valid empty or partial state.

## User / operational problem

Users need to know whether they have no goals or whether goal data could not be retrieved, with a retry action that does not require leaving the page.

## Repository evidence and root cause

`src/app/goals/page.tsx` only handled rejected fetch promises, ignored non-2xx responses, and rendered the normal content whenever loading finished. There was no retry control.

## Scope

- Treat either goals request failing as unavailable.
- Render an accessible unavailable state with a retry action.
- Add a focused source contract test.

## Non-goals

No API, database, authentication, financial-calculation, or dependency changes.

## Acceptance criteria

- Non-2xx goals or summary responses never render goal content as if it were current.
- The unavailable state exposes a keyboard-accessible retry action.
- Retrying clears the stale error and restores loading state.
- A valid empty response remains the existing empty-goals experience.

## Implementation details

`fetchData` now validates both response statuses, parses both responses together, and resets loading/error state for retries. Rendering fails closed to a `role="alert"` card until the request succeeds.

## Graph Engineering impact

- Product capability: goals request → availability state → retryable financial-goals journey.
- Module dependency: the page reuses its existing goals API and loader; no new abstraction or dependency.
- Data flow: failed transport is presented as unavailable rather than as zero goals; valid empty data remains empty.
- User journey: users can recover in place without mistaking an outage for missing savings goals.

## Security and financial correctness

No trust boundary, ownership rule, persistence path, or monetary calculation changed. The UI no longer presents unverified goal data as authoritative.

## Validation and review

- Focused goals availability test passed.
- Full validation matrix and fallback architecture, security, financial, reliability, UX/accessibility, test-adequacy, and adversarial reviews are required before PR publication.
- Independent review is unavailable; fallback review will be recorded truthfully.

## Visual validation

Not run; no browser rendering tool was available in this invocation.

## Rollback

Revert the page, focused test, and iteration document; no schema or deployment migration is required.

## Pull-request reference

Added when the owner-review PR is created.
