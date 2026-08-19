# Iteration 063 — Settings custom alerts empty state

## Category

UX, UI, and accessibility.

## Executive summary

Iteration 063 improves the settings "Custom alerts" empty state by replacing the plain "No custom alerts yet" text with an accessible, visually consistent onboarding card.

## User or operational problem

When a user has no custom alerts, the settings page shows a tiny plain text string with no structure. This is inconsistent with the onboarding-card pattern used in Goals (059), Investments (060), Cashflow (061), and Accounts (062).

## Repository evidence

- `src/app/settings/page.tsx` line 255: `: !showCustomAlertForm && <p className="text-[10px] text-zinc-500 text-center py-2">No custom alerts yet</p>}`.

## Scope

- Implement an accessible empty state card for the custom alerts list.
- Ensure consistency with the other onboarding cards.
- Add `src/app/settings/settings-alerts-empty-state.test.ts` asserting the empty state contract.

## Non-goals

- No changes to alert creation, toggle, or deletion logic.

## Acceptance criteria

- Custom alerts list shows an onboarding card when empty.
- Empty state uses `role="status"` and `aria-live="polite"`.
- Source-level regression test covers the new empty state copy.

## Implementation details

In `src/app/settings/page.tsx`:
- Replace the plain `<p>` with a structured card (icon, heading, descriptive copy, dashed border, `role="status"` + `aria-live="polite"`).

In `src/app/settings/settings-alerts-empty-state.test.ts`:
- Assert "Belum ada alarm kustom", `custom_alerts.length`, `role="status"`, and `aria-live="polite"`.

## Product and UX impact

Reduces friction by explaining what custom alerts are for new users.

## Accessibility impact

Uses `role="status"` so screen readers announce the empty state.

## Validation commands and results

- `npx jest --runTestsByPath src/app/settings/settings-alerts-empty-state.test.ts`
- `npx tsc --noEmit`
- `npm run lint`

## Deployment notes

Standard frontend deployment.

## Rollback procedure

Revert to the previous commit or restore the original plain `<p>`.
