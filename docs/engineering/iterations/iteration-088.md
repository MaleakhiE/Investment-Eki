# Iteration 088 — Keep cashflow client errors private

## Category

Privacy and reliability.

## Objective

Prevent raw transaction and summary fetch errors from being serialized into browser console logs while preserving retryable unavailable states.

## Evidence and root cause

`src/app/cashflow/page.tsx` caught fetch failures as `err` and logged the error object. The dashboard already uses fixed event names, and the cashflow availability flow already exposes an accessible retry action.

## Scope and non-goals

Replace two raw client error logs with fixed event names and add a source-level regression test. No API, persistence, financial calculation, or user-facing retry behavior changes.

## Acceptance criteria

- Cashflow fetch failures retain unavailable states and retry behavior.
- Browser logs contain stable event names only, not exception objects or messages.

## Validation

- Focused cashflow privacy and availability tests: required.
- Full Jest, lint, build, and `git diff --check`: required before publication.

## Review and rollback

Fallback security, reliability, UX/accessibility, and adversarial reviews are required. Independent review is unavailable unless a separate role context is provided. Rollback is a revert of the implementation commit.
