# Executable Loop Stop Control Design

Date: 2026-08-03

Iteration: 053

Status: Approved for implementation planning

## Executive summary

Investment-Eki's autonomous engineering loop has detailed prose instructions but no executable control plane. This iteration adds a dependency-free TypeScript policy engine and CLI that govern both the outer iteration loop and the inner validation/repair loop. The controller persists evidence between attempts, permits retries only when the repair strategy changes, and returns named terminal states instead of trusting an agent's success claim.

The controller does not launch an LLM, merge pull requests, deploy, or perform production database operations. The existing Codex harness remains the executor; it must call the controller at phase boundaries and obey its decision.

## Problem and evidence

- `AGENTS.md` tells the agent to continue through Iteration 070, while its completion section still says Iteration 050.
- `docs/engineering/autonomous-state.md` is stale relative to the current clean `main` at `origin/main`.
- `.agents/skills/investment-eki-loop/SKILL.md` caps quality-repair loops at three, but nothing enforces the cap.
- Stop, validation, and publication rules exist only in Markdown.
- Mutating operational scripts are available through `package.json`; an engineering loop needs an explicit deny policy.

The referenced Loop Engineering article recommends bounded tasks, protected verification, durable evidence, named exits, and hard ceilings. This design applies those controls without adding a workflow framework: <https://www.llmrumors.com/news/loop-engineering-designing-agent-stop-conditions>.

## Goals

1. Continue an iteration automatically when validation proves the change is acceptable.
2. Continue the inner loop when a validation failure is repairable and a changed repair strategy is supplied.
3. Continue the outer loop after an accepted iteration while the run budget and target allow it.
4. Stop before unsafe publication, unbounded retries, stale-state work, or prohibited operations.
5. Persist sufficient evidence to resume without relying on chat history.

## Non-goals

- Launching or selecting an LLM provider.
- Replacing Codex multi-agent orchestration.
- Automatically merging, deploying, migrating, seeding, promoting users, or importing SMTP configuration.
- Building a general workflow engine, web dashboard, database-backed queue, or telemetry service.
- Treating environment-blocked optional checks as successful checks.

## Architecture

The implementation has three small parts:

1. `scripts/loop-control/policy.ts` contains pure transition and stop-condition logic.
2. `scripts/loop-control/state.ts` validates and atomically persists a versioned JSON state file.
3. `scripts/loop-control.ts` exposes CLI phase commands for the existing agent harness.

The machine-readable source of truth is `docs/engineering/loop-state.json`. `docs/engineering/autonomous-state.md` remains the human-readable operational summary and must be reconciled from verified repository evidence; it is not trusted as controller input.

No production dependency is added. The implementation uses Node.js and the repository's existing TypeScript/Jest toolchain.

## State model

The durable state contains only bounded orchestration data:

- schema version and run identifier;
- target and latest completed iteration;
- current iteration, branch, base branch, and base commit;
- phase and terminal state;
- validation and repair attempt counts;
- run start/deadline and configured limits;
- last failure classification and redacted evidence summary;
- last repair strategy fingerprint;
- verification results and publication evidence;
- remaining blocker and next allowed action.

Writes use a temporary sibling file followed by atomic rename. State parsing fails closed on missing required fields, unknown enum values, invalid limits, or unsupported schema versions.

Secrets, raw environment variables, database URLs, tokens, full transcripts, and private financial data must never be persisted.

## State machines

### Outer iteration loop

```text
preflight
  -> select_iteration
  -> execute
  -> validate_or_repair
  -> independent_review
  -> publish
  -> accepted
  -> next_iteration | completed
```

The outer loop may advance only when the current iteration has:

- required validations recorded as passed or explicitly not applicable;
- no unresolved introduced failure;
- independent review evidence;
- a focused commit descended from the recorded base;
- a direct pull-request URL and state when publication is required;
- no hard-stop predicate.

Iteration numbers or documentation files alone are never completion evidence.

### Inner validation and repair loop

```text
validate
  -> accepted
  -> repair_required -> repair -> validate
  -> blocked
  -> unsafe
  -> exhausted
```

A failed required validation enters `repair_required` only when the failure is classified as introduced and repairable. A retry requires a non-empty strategy fingerprint different from the previous failed attempt. Three unsuccessful repair attempts end as `exhausted`.

Environment-blocked checks are recorded separately. They may permit progress only when the check is optional for the selected change; required checks remain blocking.

## Terminal states

- `accepted`: the current iteration satisfies its evidence contract.
- `completed`: the target iteration is accepted and no further iteration is authorized.
- `blocked`: progress requires unavailable infrastructure or capability.
- `unsafe`: secrets, production-data risk, destructive action, or unsafe migration is detected.
- `exhausted`: an attempt, time, iteration, diff, agent, network, or stack budget is spent.
- `escalated`: a genuine product or public-API decision requires the owner.

Terminal states are closed enums. Unknown states are invalid and stop execution.

## Limits

Defaults are conservative and may only be reduced by the caller unless an owner explicitly approves an increase:

- repair attempts per iteration: 3;
- iterations per run: the explicit remaining range through the target, capped at 18 for Iterations 053–070;
- elapsed run time: 120 minutes;
- validation command time: 30 minutes;
- network retries per operation: 2;
- concurrent child agents: repository-configured maximum, currently 6;
- open stacked dependency depth: 1;
- changed lines per iteration: 2,000, excluding generated lockfile changes;
- changed files per iteration: 30.

The target iteration is 070. The stale Iteration 050 completion clause will be corrected in the same focused change.

## Preflight and reconciliation

Before any edit or external write, the controller requires evidence for:

- a clean or explicitly inventoried worktree;
- a non-detached branch;
- fresh fetch success;
- recorded base commit ancestry;
- agreement between Git history, merged pull requests, iteration result documents, and machine state;
- no duplicate completed iteration;
- an authorized target and remaining iteration budget.

Conflicting or stale evidence returns `blocked`; the controller never guesses which source is correct. Starting an independent iteration from `main` additionally requires `HEAD == origin/main`.

## Command policy

The controller classifies commands before execution.

Allowed validation commands are exact repository scripts or explicit binaries required by the iteration, such as TypeScript, ESLint, Jest, build, Prisma format/validate, `db:status`, and disposable `db:verify`.

The engineering loop denies these operations unless a separate owner-authorized operational task supplies the exact target:

- `db:migrate`, `db:deploy`, and `db:seed`;
- `admin:promote` and `smtp:import`;
- Prisma reset, migrate-dev, deploy, or seed operations;
- merge, auto-merge, force-push, deployment, credential changes, or production writes;
- destructive Git or filesystem commands.

Command matching uses normalized executable and argument arrays, not substring matching over a shell command.

## Failure handling

Validation results use the existing repository vocabulary: `Passed`, `Failed`, `Blocked by environment`, and `Not applicable`.

Failures are additionally classified as introduced, pre-existing, environment-related, invalid command usage, external-service failure, or unknown. Only introduced, repairable failures can drive the automatic repair loop. Unknown failures stop as `blocked` rather than consuming retries blindly.

Hard-stop predicates run before commit, push, or pull-request creation. If a secret, privacy risk, production target, or irreversible migration is detected, the controller preserves only redacted local evidence and returns `unsafe`; it must not publish the affected work.

## CLI contract

The CLI accepts explicit JSON input and emits one JSON decision to standard output. Human diagnostics go to standard error. Every invocation exits non-zero for invalid input or a terminal failure.

Planned commands:

```text
loop-control init
loop-control preflight
loop-control record-validation
loop-control request-repair
loop-control record-review
loop-control authorize-publication
loop-control accept-iteration
loop-control status
```

Each command performs one transition. The surrounding agent harness repeats commands according to the returned `nextAction`. This keeps the controller deterministic and avoids embedding model/provider concerns.

## Verification boundary

The implementer may submit validation evidence but may not change the acceptance contract during a repair. Required command names and acceptance criteria are frozen at `init` and fingerprinted in state. Any attempted contract change after execution begins returns `escalated`.

Independent reviewers remain read-only and may reject publication. The controller records reviewer outcomes but does not treat model agreement as deterministic proof.

## Testing strategy

Use existing Jest conventions with table-driven tests around the pure policy boundary.

Required cases:

- Iteration 052 continues toward target 070; accepted 070 completes.
- Conflicting target values, stale state, detached HEAD, dirty unknown work, or unsynced base fail closed.
- A repairable introduced failure continues below three attempts.
- An identical repair strategy is rejected.
- Three failed repairs become `exhausted`.
- Required blocked validation prevents publication; optional blocked validation remains accurately recorded.
- Secrets, production database targets, prohibited commands, and unsafe migrations become `unsafe` before publication.
- Attempt, elapsed-time, diff, agent, network, and stack budgets stop execution.
- Completion requires validation, review, commit ancestry, and publication evidence.
- Atomic state persistence survives an interrupted temporary write without corrupting the prior state.

The focused test is the minimum runnable check for this non-trivial orchestration logic. Full repository type checking, lint, tests, and build remain required before publication.

## Security and privacy

- Inputs are schema-validated at the CLI boundary.
- State contains redacted summaries and fingerprints, never credentials or full logs.
- File paths are resolved beneath the repository root.
- Command execution avoids shell interpolation.
- Operational mutations and destructive commands are denied by default.
- Publication is impossible after an `unsafe` decision.
- State files do not grant authority; repository and external evidence are rechecked before consequential actions.

## Compatibility and rollout

This is additive except for reconciling the contradictory completion target. Existing package scripts, application behavior, Prisma schema, API routes, and financial calculations remain unchanged.

Rollout steps:

1. Add the policy, persistence, CLI, and focused tests.
2. Add package scripts for explicit controller invocation.
3. Update `AGENTS.md` and the loop skill to require controller decisions at phase boundaries.
4. Initialize state only after fresh Git/PR reconciliation.
5. Run the controller in dry-run mode for the current iteration before it can authorize publication.

## Acceptance criteria

- Both outer and inner loops have executable, deterministic transitions.
- All terminal states and limits are enforced by tests.
- Repair continues only with changed strategy and stops after three failed attempts.
- Accepted iterations continue automatically until the configured run/target limit.
- Unsafe or stale conditions prevent commit, push, PR creation, and further retries.
- State survives across agent sessions without secrets or transcript dependence.
- No new dependency, deployment, migration, or application-runtime change is introduced.

## Rollback

Remove the controller files and package-script entries, then revert the instruction changes. The application runtime and database require no rollback because this iteration changes orchestration only. Preserve the last JSON state as audit evidence or delete it after confirming no active run depends on it.
