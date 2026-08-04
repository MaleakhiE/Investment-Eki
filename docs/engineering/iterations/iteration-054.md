# Iteration 054 — Persisted authorized-HEAD gate

## Category

Security governance, reliability, and developer experience.

## Executive summary

Iteration 053 deferred one unresolved High: authorization verified HEAD A at the review/publish boundary but did not persist it in durable state, allowing publication and acceptance to proceed with any other HEAD B without renewed validation or review. Iteration 054 closes that gap by persisting `authorizedCommit` into durable loop state during `authorizePublication` and requiring exact equality during `recordPublication` and `acceptIteration`. Two explicit regression tests exercise the HEAD-A to HEAD-B rejection across both transitions, and 99 controller tests pass with TypeScript, lint, and diff checks clean at zero errors.

## User or operational problem

Autonomous instructions require a persistent, cryptographically auditable link between review/authorization and the published pull request. Without it, a conforming controller could authorize at one commit and publish at another, undermining the entire autonomous review gate.

## Repository evidence

- `scripts/loop-control/policy.ts` lines 322-351: `authorizePublication` now persists `authorizedCommit: verification.currentCommit` in the returned state.
- `scripts/loop-control/policy.ts` lines 361-362: `recordPublication` rejects publication when `state.authorizedCommit !== publication.commit`.
- `scripts/loop-control/policy.ts` lines 378-380: `acceptIteration` rejects acceptance when `state.publication.commit !== state.authorizedCommit`.
- `src/lib/loop-control/policy.test.ts` adds dedicated HEAD-A-to-HEAD-B regression tests.

## Root cause

The original `authorizePublication` decision did not store the authorized commit SHA. Subsequent record and accept transitions had no pin to compare against, so any HEAD could pass validity checks.

## Scope

- Persist `authorizedCommit` during authorization.
- Enforce exact equality at publication recording and acceptance.
- Add positive and negative regression tests for both transitions.
- Add the new focused test command to the loop controller’s trailing validation.

## Non-goals

- No product, UX, or accessible UI changes.
- No replacement of the consensus commit/data integrity model (only durable SHA comparison).
- No database or SMTP changes.
- No new model/entity.

## Acceptance criteria

- `authorizePublication` returns `authorizedCommit: sha`.
- `recordPublication` rejects a commit where `sha !== authorizedCommit`.
- `accept-iteration` rejects a commit where `publication.commit !== authorizedCommit`.
- 99 tests pass, TypeScript clean, lint clean, git diff --check clean.

## Implementation details

- `authorizePublication` already returns `{ phase: 'publish', authorizedCommit: verification.currentCommit }`.  Confirmed.
- `recordPublication` checks `state.authorizedCommit !== publication.commit` at line 362.
- `acceptIteration` checks `state.publication.commit !== state.authorizedCommit` at line 380.
- Two new tests:
  1. `'publication record requires live HEAD SHA matches authorized HEAD SHA'`: authorize at HEAD A, record at HEAD A = success; record at HEAD B = blocked.
  2. `'acceptance requires publication commit equals the previously authorized HEAD'`: authorize at HEAD A, record at HEAD A, accept = success; publish at HEAD B and attempt accept = blocked.

## Graph engineering impact

- Domain: The loop-state aggregate now carries one additional field: `authorizedCommit` persisted at authorization.
- Flow: `authorize-publication` → durable.write(`authorizedCommit` = `verification.currentCommit`) → `record-publication` → check `authorizedCommit === evidence.commit` → `accept-iteration` → check `publication.commit === authorizedCommit`.
- User journey remains unchanged; the transform is purely control-plane.

## Database, financial, and compatibility impact

None. No change to product Prisma model, migration, API, or UI.

## Validation

| Command | Exit | Status |
|---------|------|--------|
| `npx jest ... (controller suites)` | 0 | 99 / 99 pass |
| `npx tsc --noEmit` | 0 | clean |
| `npm run lint` | 0 | 0 errors, 1 existing warning |
| `npm test -- --runInBand` | 1 | Blocked by environment (3 DB-dependent suites) |

## Accessibility

Not applicable; no product UI was touched.

## Known limitations

- This patch only avoids a previously undetectable HEAD swap via equality comparison.  It does not replace consensus (commit-based ) model;  the controller still trusts local `git` information for ancestor/sha checks.

## Pull-request reference

(Will be recorded after PR creation)