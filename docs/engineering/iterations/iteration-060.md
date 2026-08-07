# Iteration 060 — Investment history empty states

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 060 improves the investment history empty states by replacing the plain "No records yet" text with accessible, visually consistent onboarding cards for both Gold and Mutual Fund history tables.

## User or operational problem

When a user has no investment snapshots recorded, the history tables show a centered "No records yet" string. This provides no guidance on how to populate the data and lacks the visual polish found in the dashboard or goals modules.

## Repository evidence

- `src/app/investments/page.tsx` lines 426 and 460 contain `<p className="text-center py-6 text-zinc-600 text-sm">No records yet</p>`.
- `src/app/investments/investments-availability.test.ts` only tests loading and error states, not the empty history state.

## Scope

- Implement accessible empty state cards for Gold and Mutual Fund history.
- Ensure consistency with the Goals empty state (Iteration 059).
- Update `investments-availability.test.ts` to assert the empty state contract.

## Non-goals

- No changes to investment calculation logic.
- No changes to the snapshot creation form functionality.

## Acceptance criteria

- Gold history shows an onboarding card when empty.
- Mutual Fund history shows an onboarding card when empty.
- Empty states use `role="status"` and `aria-live="polite"`.
- Source-level regression tests cover the new empty state copy.

## Implementation details

In `src/app/investments/page.tsx`:
- Replace the simple `<p>` tags with structured cards containing an icon, heading, and descriptive text.

In `src/app/investments/investments-availability.test.ts`:
- Add assertions for "Set your first gold snapshot" and "Set your first mutual fund snapshot".

## Product and UX impact

Reduces user friction by providing a clear explanation and visual cue for new users who haven't yet recorded investment data.

## Accessibility impact

Uses `role="status"` to ensure screen readers announce the state correctly.

## Graph Engineering impact

### Product capability graph

Financial investments → investment history → accessible empty states → source-level regression test.

## Validation commands and results

- `npx jest --runTestsByPath src/app/investments/investments-availability.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Deployment notes

Standard frontend deployment.

## Rollback procedure

Revert to the previous commit or restore the original `<p>` tags.
