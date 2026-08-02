# Iteration 052 — Dashboard client-log privacy

## Category

Security and observability.

## Problem and evidence

The dashboard catch path serialized the raw fetch error to the browser console. Provider, network, or response details can contain URLs or private context.

## Scope

Replace the raw client log with a fixed event while preserving the existing unavailable states and loading completion. No API or financial behavior changes.

## Acceptance and validation

The source regression test rejects raw error logging and requires the fixed event. Run focused/full Jest, TypeScript, lint, build, Prisma validation, migration status, and diff checks. Browser validation remains unavailable.

## Rollback

Revert the single client-side commit; no migration/configuration changes.
