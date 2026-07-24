# Iteration 001: atomic investment snapshot accounting

## Problem statement and evidence

`saveSnapshot()` in `src/services/investment.service.ts` finds/creates an investment, reads and upserts its monthly snapshot, then calls `createTransaction()` outside any shared database transaction. If posting fails, the snapshot remains committed. A retry sees the new invested amount as its previous amount and creates no expense. Concurrent saves can also calculate the same delta.

Repository explorer, finance reviewer, and QA reviewer independently classified this as a P0 financial-integrity gap. There is no focused investment service test.

## User story

As an investment tracker user, when I save a monthly investment snapshot, I need the portfolio record and its generated cashflow expense to succeed or fail together so dashboard totals never silently diverge.

## In scope

- Execute investment lookup/create, snapshot read/upsert, and optional expense creation in one interactive Prisma transaction.
- Allow transaction creation to use the caller’s Prisma transaction client without changing existing public behavior.
- Use serializable isolation and bounded retry for Prisma P2034 write conflicts/deadlocks.
- Treat an unsuccessful generated transaction result as a failed snapshot operation.
- Preserve validation, encryption, DTO shape, `createTransaction: false`, and current positive-delta semantics.
- Add service-level regression tests at the public `saveSnapshot()` seam.

## Out of scope

- Schema links between snapshots and historic transactions.
- Reversing or editing historic expenses when invested amount decreases or a snapshot is deleted.
- Changing the investment UI/API payload, amount policy, date semantics, or category copy.
- Reconciliation of already-divergent production data.
- Broad transaction-service refactoring.

These exclusions avoid guessing how historical expense reversals should work. They remain a documented follow-up.

## Technical design

1. Extend `createTransaction()` with an optional Prisma transaction client that defaults to the root client.
2. Ensure owned-account lookup and transaction insertion use the supplied client.
3. Wrap all `saveSnapshot()` persistence and generated-expense work in `prisma.$transaction(callback, { isolationLevel: Serializable })`.
4. Retry only Prisma `P2034` conflicts, up to three total attempts; rethrow other failures and exhausted conflicts.
5. Keep validation outside the transaction. Encrypt values inside each attempt so the persisted data belongs to that attempt.
6. Return the same `SaveSnapshotResult` contract after commit.

## Data model and migration

No schema or migration change. The source of truth remains:

- monthly portfolio state: `InvestmentSnapshot`;
- generated cash outflow: `Transaction`;
- both are committed atomically for new writes.

Existing unlinked historical rows are not rewritten.

## API and UI impact

The snapshot POST endpoint and UI remain unchanged. On a persistence/accounting failure, the existing route returns its standard 500 envelope and the UI shows its existing save-error feedback. No new loading, empty, focus, or responsive state is introduced.

## Security and privacy

- Authenticated user scoping remains unchanged.
- Public UUID resolution remains in the route boundary; internal IDs remain server-only.
- Encrypted monetary strings remain persisted.
- No new logging, dependency, external request, or sensitive response field is added.

## Accessibility

No interface markup changes. Existing feedback behavior remains the user-visible failure path.

## Failure modes

- Validation failure: return the existing service error without opening a transaction.
- Generated expense validation failure: throw inside the transaction so snapshot changes roll back.
- Database write failure: transaction rolls back and route returns the existing server-error envelope.
- P2034 conflict/deadlock: retry the complete transaction up to two times after the first attempt.
- Exhausted P2034 conflicts: fail without partial commit.
- `createTransaction: false` or non-positive delta: commit the snapshot without an expense, matching current behavior.

## Public test seams

- `saveSnapshot(userId, input)`:
  - uses one serializable transaction and the callback client for every write;
  - creates the expected positive-delta expense;
  - throws when generated transaction creation reports failure;
  - skips expense when explicitly disabled;
  - retries P2034 and returns the successful attempt.
- Existing `createTransaction(userId, input)` remains backward compatible when no client is supplied.

## Rollback and recovery

Code rollback is safe because there is no migration. Reverting restores previous behavior but not recommended integrity. The implementation does not repair existing divergence; a future read-only reconciliation report should identify snapshots without corresponding investment expenses before any repair is designed.

## Acceptance criteria

1. No snapshot write can commit when its required generated expense fails in the same attempt.
2. All investment persistence and generated expense writes use one Prisma transaction client.
3. The transaction requests serializable isolation and retries only P2034 conflicts within a bounded limit.
4. Validation, encryption, positive-delta, opt-out, API envelope, and public UUID behavior remain compatible.
5. Focused tests demonstrate the failing baseline then pass after implementation.
6. Prisma validation, TypeScript, lint, full Jest suite, production build, and diff check pass.
7. Independent security, finance, and release reviewers find no unresolved high-severity regression.
