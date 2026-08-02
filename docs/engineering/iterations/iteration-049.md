# Iteration 049 — Dashboard core availability

## Category and executive summary

Category: reliability and UX. The dashboard now distinguishes failed core API resources from verified zero/empty data.

## User problem and evidence

`src/app/dashboard/page.tsx` previously left summary, accounts, and recent transactions at zero/empty defaults when their requests failed. This could present an outage as a misleading financial state.

## Root cause and scope

The dashboard tracked only a global loading flag and budget status. This slice adds independent status flags for the salary-period summary, accounts, and recent transactions and renders explicit unavailable states with recovery links.

## Non-goals

No API, service, financial calculation, authorization, or persistence changes. No automatic retry loop.

## Acceptance criteria

- Failed core requests never render as verified zero or onboarding empty states.
- Successful resources remain visible when a sibling request fails.
- Unavailable states are text-based, responsive, and keyboard reachable.
- Existing API envelopes and financial source-of-truth calculations remain unchanged.

## Graph engineering impact

Capability: trustworthy dashboard → truthful resource status → dashboard page → source regression test → reduced false-empty support reports.

Domain and data flow remain unchanged: authenticated API responses still feed existing client calculations; only presentation state is added.

## Security, database, and compatibility

No new trust boundary or database access. User-scoped API calls, private responses, and existing currency formatting are preserved.

## Validation and review

RED/GREEN source test, focused dashboard tests, full Jest, TypeScript, lint, build, Prisma validation, migration status, and diff check. Browser/screen-reader runtime remains unavailable and will be disclosed in the result.

## Rollback and deployment

Revert the single commit; no migration or configuration change is required.
