# Iteration 084 — Role-separated engineering governance

## Category

Architecture and developer experience.

## Objective

Make the requested CEO/CTO and specialist roles explicit, auditable, and reusable without changing runtime behavior or weakening merge safeguards.

## Acceptance criteria

- All requested roles have stable IDs and responsibility boundaries.
- Financial, database, backend, frontend, operations, and performance work has explicit required-review routing.
- CTO is represented as the final merge-readiness authority only after owner approval, independent review, branch protection, green checks, and exact reviewed HEAD verification.
- Missing evidence fails closed; auto-merge remains disabled in owner-review queue mode.

## Scope and non-goals

This adds a repository-local JSON role registry and documentation. It does not add an agent runtime, claim reviews that did not occur, alter application code, change Prisma, or bypass GitHub protections.

## Validation

- JSON parse check: required before publication.
- `git diff --check`: required before publication.
- Runtime validation: not applicable; no runtime code changed.

## Rollback

Revert the role registry and iteration document.
