# Iteration 053 — Truthful recurring schedule visibility

## Category

Product UX and reliability.

## Problem and evidence

`src/app/dashboard/page.tsx` treats any HTTP-success `/api/recurring` response as a list and otherwise renders “No active recurring transactions.” It does not validate the API envelope, item shape, date, or amount. A failed or malformed response can therefore look like a verified empty schedule.

## User story

As a user relying on scheduled income and expenses, I want the dashboard to distinguish an empty schedule from unavailable data so I do not miss commitments during an outage.

## Scope

- Add `loading | ready | error` status for the recurring dashboard resource.
- Require a `SUCCESS` envelope and structurally valid recurring items before presentation.
- Preserve server-calculated `next_run`, finite amounts, active filtering, and current sorting.
- Render a generic accessible unavailable state linking to `/recurring`; retain the verified-empty state.

## Non-goals

No API, schema, migration, recurring calculation, notification, browser retry loop, or financial write changes. No client-side recalculation or client authorization.

## Data-flow and graph impact

`/api/recurring` → envelope/item validation → dashboard status/list → accessible schedule panel. Existing authentication, user scoping, recurring service, Prisma ownership, and transaction boundaries remain unchanged.

## Failure modes

Non-2xx, `responseStatus: ERROR`, malformed arrays/items/dates/amounts, and malformed JSON must fail closed to unavailable. A valid successful empty array remains an empty state.

## Accessibility and compatibility

Unavailable and empty status are communicated with text, not color alone. Recovery is a keyboard-reachable link with visible focus. Existing responsive list layout and API contracts remain compatible.

## Acceptance and validation

Add a RED/GREEN parser or source test covering success, empty, malformed-success, and non-2xx states. Run focused/full Jest, TypeScript, lint, build/OCR trace, Prisma validation, migration status, and diff checks. Browser/screen-reader runtime remains a release gate.

## Deployment, rollback, and review

No deployment migration/configuration step. Revert the single commit to roll back. Request independent architecture, security, reliability, product/UX, and accessibility review; if slots are unavailable, disclose structured fallback review rather than claiming independent approval. Stack the PR on PR #48 until dependencies merge.
