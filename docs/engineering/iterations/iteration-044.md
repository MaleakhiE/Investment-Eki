# Iteration 044 — Financial-planning collection log privacy

## Problem and evidence

Budget and goal collection GET/POST handlers logged raw caught errors. Prisma, encryption, or service errors can contain driver metadata and private financial context. Their item routes already use the closed `safeDatabaseErrorCode` taxonomy.

## Scope and acceptance criteria

- Sanitize the four collection failure logs through `safeDatabaseErrorCode`.
- Preserve fixed operation labels and allowlisted Prisma `P####` codes.
- Prove budget GET/POST and goal GET/summary GET/POST keep private error messages out of logs.
- Preserve authentication order, service scoping, API envelopes, statuses, validation, calculations, and persistence.

## Exclusions

No service, schema, migration, UI, malformed-JSON, or financial-semantics changes.

## Validation and recovery

Focused route tests are the public seam. The change is stateless and can be reverted without data recovery. Full TypeScript, lint, Jest, build, Prisma, audit, and diff checks run where environment configuration permits.
