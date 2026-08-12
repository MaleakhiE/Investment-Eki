# Iteration 072 — Settings unavailable/retry states

## Category

UX / reliability / accessibility

## Executive summary

Settings previously ignored non-2xx responses for core settings and left notification preferences on an indefinite loading placeholder after request failure. The page now fails closed and offers explicit retry actions.

## Scope

Validate settings and notification responses, clear stale state before retries, expose accessible unavailable messaging, and add a focused regression test. No API, schema, migration, dependency, or financial calculation changes.

## Acceptance criteria

- Core settings failures show an unavailable error instead of silently rendering defaults.
- Notification settings failures leave loading and expose a retry action.
- Retrying clears the prior error and restores loading behavior.

## Security and financial correctness

No authorization or persistence path changed. The page does not substitute empty or zero financial values for failed responses.

## Validation

- Focused settings availability test — Passed.
- `npx tsc --noEmit` — Passed.
- `npm run lint` — Passed with one pre-existing unused `_branch` warning.
- `git diff --check` — Passed.

## Review

Independent review: unavailable. Fallback architecture, security, reliability, UX/accessibility, test adequacy, and adversarial diff review completed; no unresolved Critical/High finding identified.

## Rollback

Revert the iteration commit; no persisted data changes are involved.

## Pull request

Owner-review PR to be recorded after publication.
