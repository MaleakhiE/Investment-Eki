# Iteration 089 — Keep mutual-fund provider errors private

## Category

Security and reliability.

## Executive summary

Replace raw upstream exception logging in the mutual-fund NAV route with stable event names while preserving the Pasardana → Infovesta fallback and manual-entry response.

## Scope

`src/app/api/mutual-fund/nav/route.ts` and its focused privacy regression test.

## Non-goals

No provider, parsing, timeout, financial calculation, persistence, authentication, or UI changes.

## Acceptance criteria

- Provider and route failure logs contain no exception object or message.
- Existing provider fallback and `nav: 0` manual-entry behavior remain unchanged.
- Missing-fund and unauthorized behavior remain unchanged.

## Validation

Focused Jest, full Jest, TypeScript, lint, build, and `git diff --check` are recorded in the PR.

## Review

Role-separated BA, QA, Security, and CTO reviews are required on the exact final HEAD.

## Rollback

Revert the focused route and test commit.
