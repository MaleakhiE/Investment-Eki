# Iteration 075 — Cashflow transaction and summary retry state

## Category

UX/reliability

## Executive summary

Cashflow transaction and summary requests previously ignored non-OK responses, leaving users with a misleading empty dashboard and no recovery action. This slice exposes an unavailable state and a retry action while preserving valid empty results.

## User problem and repository evidence

`src/app/cashflow/page.tsx` only updated transactions and summary when `response.ok` was true. Authentication failures, server errors, or network failures therefore looked identical to a month with no data.

## Scope and non-goals

- Add explicit failure state for transaction and summary loading.
- Clear failed data rather than display stale or fabricated values.
- Add an accessible retry action for both requests.
- No API, schema, financial-calculation, or dependency changes.

## Acceptance criteria

- Non-OK transaction responses produce an unavailable state.
- Non-OK summary responses produce an unavailable state.
- Valid empty responses remain valid empty states.
- Retry re-runs both cashflow requests.
- The unavailable message is exposed through `role="alert"`.

## Implementation and graph impact

Input/API response → response status check → cashflow loading state → alert/retry presentation. The change is limited to the cashflow page and its focused contract test; accounts remain an independent queued iteration (PR #72).

## Security, financial, database, and compatibility impact

No new trust boundary, authorization path, persistence, monetary arithmetic, migration, or dependency is introduced. Failed responses are no longer interpreted as zero/empty financial data.

## Validation

Validation is recorded in the run report and PR body. Focused Jest coverage was added for the unavailable/retry contract; full tests, TypeScript, lint, build, Prisma, database status, audit threshold, and diff checks are required before publication.

## Review and visual validation

Independent review is unavailable. Fallback architecture, security, financial-correctness, reliability, UX/accessibility, test-adequacy, and adversarial diff reviews are completed for the reviewed HEAD. Visual validation is limited to static review; no browser renderer was available in this run.

## Deployment, rollback, limitations, and follow-up

No deployment or migration step is required. Roll back by reverting this commit. The retry action does not add request deduplication beyond the existing loading state; follow-up can address broader cashflow loading coordination if duplicate requests are observed.

## Pull request

Owner-review PR URL is recorded after the reviewed commit is pushed. Autonomous merge remains disabled.
