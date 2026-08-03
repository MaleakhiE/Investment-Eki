# Iteration 051 — Gold-price error-log privacy

## Category

Security and observability.

## Problem and evidence

The gold-price route logged raw upstream and fallback errors, which can include URLs, abort details, or provider response context. Evidence: `src/app/api/gold-price/route.ts`.

## Scope and non-goals

Replace raw error serialization with fixed operational events while preserving fallback pricing and response behavior. No provider, pricing formula, cache, or API envelope changes.

## Acceptance criteria

- No caught error object or message is passed to `console.error`.
- Operators retain fixed events for upstream failure and local fallback use.
- Existing fallback price remains available and no sensitive data crosses logs.

## Graph impact

External provider → guarded fetch → fixed event → fallback response. Domain calculations and persistence are unchanged.

## Validation and rollback

Focused source test, full Jest, TypeScript, lint, build, Prisma validation, migration status, and diff checks. Revert the commit; no migration/config change.
