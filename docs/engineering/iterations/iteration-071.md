# Iteration 071 — Unbounded loop continuation

## Category

Reliability / developer experience

## Executive summary

The loop controller treated `targetIteration: 70` as a lifetime stop. The owner-review queue now continues after legacy targets while retaining per-invocation safety limits.

## Evidence and root cause

`scripts/loop-control/policy.ts` returned `completed` when `currentIteration >= targetIteration`, and durable-state validation rejected iterations above the target. The repository has now verified Iteration 070 merged, so this legacy finite-horizon behavior would block Iteration 071.

## Scope and non-goals

Changed only controller terminal-state and state-coherence checks plus regression coverage. Per-run repair, elapsed-time, validation, network, child-agent, stack-depth, and diff-size limits remain unchanged. No application, schema, migration, dependency, or merge behavior changed.

## Acceptance criteria

- A published iteration is accepted with `nextAction: next-iteration` regardless of legacy `targetIteration`.
- Durable accepted state remains valid above the legacy target.
- Existing safety budgets and fail-closed publication checks remain enforced.

## Implementation

- Removed the target comparison from accepted-state coherence validation.
- Removed the target comparison from durable-state parsing and completed-state validation.
- Made `acceptIteration` always return the continuation transition.
- Updated the regression test to prove legacy target metadata does not stop continuation.

## Security and financial correctness

No authentication, authorization, financial calculation, persistence, or user-data paths changed. Existing validation and publication safeguards remain required.

## Validation

- `npx jest --runTestsByPath src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts --runInBand` — Passed (86 tests).
- Full baseline validation will be recorded in the pull request.

## Review

Independent review: unavailable. Fallback architecture, security, reliability, and adversarial diff review completed; no unresolved Critical/High finding identified.

## Rollback

Revert the single controller commit; this restores the legacy target stop without touching application data.

## Known limitations

`targetIteration` remains in the durable schema for backward compatibility and is treated as legacy metadata. A future schema migration may rename or make it optional once all consumers support explicit continuation mode.

## Pull request

Owner-review PR to be recorded after publication.
