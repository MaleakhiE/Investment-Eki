# Iteration 090 — Keep registration failures private

## Category

Security and reliability.

## Executive summary

Replace raw registration exception logging with a stable event name while preserving the existing server-error response.

## Scope

`src/app/api/auth/register/route.ts` and its focused regression test.

## Non-goals

No authentication policy, validation, persistence, response, or UI changes.

## Acceptance criteria

- Unexpected registration failures emit no exception object or message in logs.
- The route still returns the existing 500 server-error response.
- Validation and duplicate-email behavior remain unchanged.

## Validation

Focused Jest, full Jest, TypeScript, lint, build, and `git diff --check` are recorded in the PR.

## Review

Role-separated BA, QA, Security, and CTO reviews are required on the exact final HEAD.

## Rollback

Revert the focused route and test commit.
