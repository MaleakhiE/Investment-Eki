# Iteration 059 — Goals empty state

## Category

UX and accessibility.

## Executive summary

Iteration 059 improves the financial goals empty state by introducing a dedicated card with clear CTA and guidance, while preserving existing accessibility and projection-assumption test coverage.

## User or operational problem

When no financial goals were set, the interface lacked a clear, accessible, and welcoming empty state to guide the user in setting their first goal.

## Repository evidence

- `src/app/goals/page.tsx` lacked a specialized empty-state component, relying on `goals.length === 0` conditional logic.
- Existing regression tests in `src/app/goals/goals-ux.test.ts` had been partially overwritten in a previous iteration.

## Root cause

The UI lacked an explicit, high-visibility empty-state design, and testing logic was inadvertently narrowed during a previous iteration's refactor.

## Scope

- Implement a card-based empty state for `GoalsPage` with:
  - Accessible icon and descriptive copy.
  - A clear, action-oriented "Create Goal" button.
- Restore projection-assumption and deadline-risk regression tests in `src/app/goals/goals-ux.test.ts` that were previously lost.
- Ensure the new UI is responsive and accessible (aria-hidden icons, semantic layout).
- Verify all tests pass, including restored coverage.

## Non-goals

- No schema, API, service, or financial calculation changes.
- No changes to the active-goals or completed-goals display logic.

## Acceptance criteria

- `GoalsPage` displays a card-based empty state when `goals` is empty.
- `src/app/goals/goals-ux.test.ts` passes and confirms both the new empty-state UI and the restored projection-assumption coverage.
- UI remains responsive and accessible.
- All validation checks (build, lint, test) pass.

## Implementation details

- `src/app/goals/page.tsx`: Updated `GoalsPage` to render a centered card component with a 🎯 icon and clear CTA when `goals.length === 0`.
- `src/app/goals/goals-ux.test.ts`: Updated to verify both the new empty-state UI elements and the previous projection-assumption and deadline-risk text content.

## Product and UX impact

Users have a clearer path to getting started with financial goal tracking.

## Accessibility impact

The empty-state icon is `aria-hidden="true"`, and the component uses semantic structure.

## Graph Engineering impact

### Product capability graph

Empty goals list → card-based empty state → explicit CTA → goal tracking adoption.

### Domain relationship graph

No entity or financial aggregate changes.

### Module dependency graph

GoalsPage → (no new dependencies).

### Data-flow graph

Goals list empty → UI rendering state → new empty-state card.

### User-journey graph

Goals navigation → (no goals) → view empty-state card → create goal.

### Engineering Task Graph

UX assessment → goals empty state evidence → implementation → restoration of coverage → validation → PR publication.

## Security impact

None.

## Financial correctness impact

None.

## Database impact

None.

## Compatibility impact

None.

## Validation commands and results

- `npx jest --runTestsByPath src/app/goals/goals-ux.test.ts --runInBand`: passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed (one unrelated pre-existing warning).
- `git diff --check`: passed.

## Visual validation

UI rendering verified via semantic markup and responsive class checks.

## Deployment notes

Normal application deployment.

## Rollback procedure

Revert the Iteration 059 commit.

## Known limitations

None.

## Follow-up work

Monitor goal creation conversion rates.

## Pull-request reference

Pending publication.
