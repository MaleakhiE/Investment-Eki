# Iteration 042 — Goal contribution guidance

## Problem and evidence

The goals page renders a server-calculated monthly contribution amount without stating its projection assumptions. It also renders a negative day count after a deadline has passed and exposes the progress bar without progress semantics. Evidence: `src/app/goals/page.tsx` and `src/services/goals.service.ts`.

## User story

As a user tracking a financial goal, I want the monthly contribution guidance and deadline risk to be explicit so I can interpret the projection correctly and act before or after the target date.

## Scope

- Add progress-bar role and value semantics for keyboard and screen-reader users.
- Explain that monthly guidance assumes equal monthly contributions and excludes growth or interest.
- Render a clear `Deadline passed` state instead of a negative day count.
- Preserve the existing server-calculated values and all existing loading, empty, and error behavior.

## Exclusions

- No schema, API, service, or migration changes.
- No investment-return assumptions, personalized financial advice, or recalculation in the browser.

## Design and failure modes

The UI continues to display `monthly_needed`, `days_left`, and `percentage` from the goals API. A missing monthly value remains hidden. A null deadline remains unchanged. A negative `days_left` becomes text describing the overdue state, while non-negative values retain the existing countdown. Progress values are bounded to 0–100 for the ARIA value and visual width.

## Public test seam and acceptance criteria

- A source-level regression test fails before implementation and verifies the guidance copy, overdue copy, and progress semantics.
- Existing goals tests remain green.
- Focused and full Jest, TypeScript, lint, Prisma validation, build, and diff checks pass.
- Text communicates risk without relying on color alone and remains usable at mobile widths.
- No financial calculation or authorization behavior changes.

## Validation limitations

No browser runtime, screen-reader, or production database validation is available in this environment; those checks are recorded as follow-up evidence rather than claimed as complete.
