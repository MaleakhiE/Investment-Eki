# Iteration 091 — Prevent misleading dashboard portfolio totals

Category: financial correctness / UX reliability

## Problem and evidence

The dashboard previously accepted any array from `/api/investments/details` and used `safe()` to coerce missing or non-numeric values to zero. A malformed response could therefore render a plausible zero portfolio instead of an unavailable state.

## Scope

- Validate investment detail records at the dashboard boundary.
- Show an explicit unavailable state when the response shape or numeric values are invalid.
- Preserve valid populated and valid empty responses.

Non-goals: changing the investment API, database schema, financial calculations, or portfolio domain semantics.

## Acceptance criteria

- Every investment detail has string identity fields and finite numeric amounts before rendering.
- Malformed data never contributes zero-valued totals silently.
- The dashboard provides an accessible retry/navigation state.
- Valid empty investment data remains an empty portfolio state.

## Implementation and graph impact

Input → response-shape validation → dashboard state → portfolio presentation. The existing server API and persistence path are unchanged; only the client trust boundary is hardened.

## Security, database, compatibility

No authorization, persistence, or schema changes. Invalid external response data is rejected locally without exposing additional details.

## Validation

- Focused Jest: `npx jest --runTestsByPath src/app/dashboard/dashboard-investment-integrity.test.ts --runInBand`
- Full baseline and CI checks recorded in the pull request.

## Rollback

Revert the iteration commit; the prior dashboard behavior returns without data migration.

## Follow-up

Consider shared response-schema validation if multiple dashboard resources show the same drift pattern.
