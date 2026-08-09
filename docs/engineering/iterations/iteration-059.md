# Iteration 059 — Goals empty-state guidance

## Category

Product UX and accessibility.

## Executive summary

Replace the goals page's passive empty paragraph with an actionable, screen-reader-announced empty state that opens the existing goal form.

## User or operational problem

Users with no active goals see a sentence but no direct action, making the first-goal journey unclear and adding unnecessary navigation or pointer work.

## Repository evidence

`src/app/goals/page.tsx` renders `No active goals. Create one to start tracking!` as a plain paragraph even though the page already owns `showForm` and the goal dialog.

## Root cause

The empty branch was implemented as display-only copy and was not connected to the existing create-goal control.

## Scope

- Add a semantic empty-state card in the active-goals section.
- Reuse the existing `showForm` state and dialog.
- Keep ESLint scoped to application sources by ignoring isolated sibling worktrees.
- Add a focused regression assertion.

## Non-goals

- No API, database, calculation, authentication, or dependency changes.
- No redesign of populated, loading, or error states.

## Acceptance criteria

- Empty active goals expose clear guidance and a visible “Create your first goal” action.
- The action opens the existing goal dialog.
- The state is announced with `role="status"` and remains keyboard operable.
- Existing goal projection and progress semantics remain intact.

## Implementation details

Use native semantic elements and the existing React state; no new component or dependency is required.

## Product and UX impact

Shortens the first-goal journey and makes the next action obvious without changing goal persistence.

## Accessibility impact

Adds a status landmark, heading, descriptive text, and a keyboard-operable named button with visible focus styling.

## Graph Engineering impact

### Product capability graph

Financial planning → no-goal user → actionable goal onboarding → goals page empty state → existing goal dialog → focused source regression test → improved first-goal activation.

### Domain relationship graph

No domain or ownership relationship changes; the existing authenticated goal aggregate remains the source of truth.

### Module dependency graph

Goals page presentation → existing `AccessibleDialog` and feedback/form state; no server, Prisma, or auth dependency changes.

### Data-flow graph

Existing goal fetch → active-goal filtering → empty-state CTA → existing form submission → existing `/api/goals` authorization and persistence path.

### User-journey graph

Authenticated user with zero active goals → understands the empty state → activates the existing create form → submits a goal without leaving the page.

### Engineering task graph

Plan and baseline evidence → regression test → minimal UI change → focused/full validation → review and PR publication. Follow-up candidates remain investment empty-state parity and session diagnostics.

## Security impact

No new trust boundary or data access. The CTA only toggles local UI state; server authorization remains unchanged.

## Financial correctness impact

None. No monetary values or calculations change.

## Database impact

None.

## Compatibility impact

Backward compatible; existing populated, loading, error, and dialog flows remain available.

## Validation commands and results

- `npx prisma format` — Passed; produced no intentional schema change.
- `npx prisma validate` — Passed.
- `npx tsc --noEmit` — Passed.
- `npm run lint` — Initially failed because ESLint scanned generated `.next` output in the existing `.worktrees/iteration-053-loop-stop-control` worktree; adding `.worktrees/**` to the existing global ignores makes the exact command pass with one pre-existing warning.
- Remaining required validations were not run because the controller entered its terminal blocked state.

## Subagent or fallback review results

Not completed because the required lint gate blocked the bounded iteration before review/publication.

## Visual validation

Browser rendering is not assumed; the final report will state whether visual tooling was available.

## Deployment notes

No migration or environment change. Deploy with the normal web application release.

## Rollback procedure

Revert the iteration commit; no data rollback is required.

## Known limitations

The empty-state copy remains English while the surrounding product contains mixed-language copy.

## Follow-up work

Consider applying the same actionable pattern to other high-value empty states after verifying priority.

## Pull-request reference

None. Publication was correctly blocked by loop-control after the pre-existing lint failure.
