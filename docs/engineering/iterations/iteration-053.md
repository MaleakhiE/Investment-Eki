# Iteration 053 — Executable loop stop control

## Category

Reliability, governance, and developer experience.

## Executive summary

Autonomous engineering instructions now require the durable loop controller's preflight, validation/repair, publication, and acceptance gates. The repository also has a reconciled schema-1 loop state targeting Iteration 070.

## User or operational problem

The written completion condition still stopped at Iteration 050 while the mission said 070, and written workflow guidance did not require the controller already implemented in `scripts/loop-control.ts`. That left an operator able to commit, push, or publish without a recorded phase decision.

## Repository evidence

`AGENTS.md` contained `Completion Condition ... Iteration 050` and did not name `npm run loop:control`, `authorize-publication`, or `unsafe`. `package.json` exposes the committed `loop:control` script, and the policy, state, and CLI suites cover its durable phase decisions. `git fetch --all --prune` resolved `origin/main` to `fcd3129a8f6c0bf8663ca92af0ff084bda9428ab`; `gh pr list --head feat/iteration-053-loop-stop-control --state all` returned no pull request.

## Root cause

The controller implementation and the autonomous instruction surfaces evolved separately, leaving a stale terminal target and no mandatory operational hand-off to the controller.

## Scope

- Require `preflight`, `record-validation`/eligible `request-repair`, `authorize-publication`, and `accept-iteration` in the repository instructions and loop skill.
- Fail closed when an `unsafe` terminal decision exists.
- Initialize `docs/engineering/loop-state.json` through the CLI with reconciled branch, base, target, and acceptance-contract evidence.
- Add one public instruction-invariant test.
- Reconcile `autonomous-state.md` from local and remote Git evidence.

## Non-goals

No controller behavior change, product UI, API, Prisma schema, migration, financial calculation, authentication change, external publication, or pull request creation.

## Acceptance criteria

- The completion condition targets Iteration 070.
- Instruction surfaces require all four controller gates and state the `unsafe` publication stop.
- The committed state is schema version 1, `preflight`, non-terminal, and contains no sensitive values.
- The policy invariant and loop-control suites, TypeScript, lint, and diff checks pass.
- Current state makes no unsupported Iteration 052 branch or PR #48 claim.

## Implementation details

The policy test reads `AGENTS.md` as the public instruction seam. `AGENTS.md` and the repository loop skill now direct operators to `npm run loop:control` at each phase boundary without duplicating the policy implementation. The CLI persisted the validated state using the controller's atomic state writer. The approved `/tmp` input contract is retained only as transient input; because the CLI rejects absolute inputs by design, an identical transient input inside the repository was used for the successful CLI invocation and both temporary files were removed.

## Product and UX impact

No end-user interface changes. Engineering operators get an explicit, auditable stop before external publication.

## Accessibility impact

Not applicable: this iteration changes no rendered UI, interaction, or assistive-technology behavior.

## Graph Engineering impact

### Product capability graph

Reliable autonomous delivery → prevent unapproved publication → durable phase gates → `AGENTS.md` and `investment-eki-loop` skill → policy invariant and loop-control suites → fewer unreconciled or unsafe iteration publications.

### Domain relationship graph

No financial or user-owned entity is read or written. The sole persisted aggregate is the repository-local loop state, whose `runId`, branch, base commit, phase, terminal state, and evidence remain internally consistent through the controller.

### Module dependency graph

`AGENTS.md` and `.agents/skills/investment-eki-loop/SKILL.md` direct the operator to `package.json`'s `loop:control` script; that CLI consumes validated input and persists `docs/engineering/loop-state.json`; `policy.test.ts` verifies the instruction contract. No presentation, application, Prisma, authentication, or external-service module is added.

### Data-flow graph

Operator evidence → CLI input parsing and sensitive-value validation → policy/state validation → atomic repository-local JSON write → `status` JSON decision → operator action. No authentication, encryption, user data, database, or network write is in this flow.

### User-journey graph

The engineering journey becomes safer and more reliable: inventory and preflight precede edits; validation failures route only through bounded repair; independent review precedes publication; acceptance precedes the next iteration.

### Engineering task graph

Committed controller policy/state/CLI slices → this instruction-and-state integration → focused static verification → independent full-diff review and controller-authorized publication. Deferred: record actual preflight evidence and complete the later phase transitions only when their evidence exists.

## Security impact

`unsafe` is an explicit terminal guard against commit, push, and pull-request publication. State parsing rejects sensitive values and path traversal. The `/tmp` initialization attempt was rejected by the absolute-path guard; that guard was retained rather than weakened.

## Database impact

None. No Prisma schema, migration, query, or production data operation occurs.

## Compatibility impact

Existing workflows now have a documented required controller gate. The target changes from the stale 050 completion condition to 070, matching the existing mission. Product and public API compatibility are unchanged.

## Validation commands and results

- RED: `npx jest --runTestsByPath src/lib/loop-control/policy.test.ts --runInBand` failed before instruction changes because `AGENTS.md` still had `Completion Condition ... Iteration 050` and lacked the required gates.
- GREEN: the same command passed after the minimal instruction changes (1 suite, 36 tests).
- CLI initialization: the exact absolute `/tmp` input was rejected with exit 2 by the controller's path guard; the identical repository-local transient input then initialized the state and `npm run loop:control -- status` reported `phase: preflight`, `terminalState: null`.
- `npx jest --runTestsByPath src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts src/lib/loop-control/cli.test.ts --runInBand`: passed (3 suites, 66 tests).
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with one existing `state.test.ts` unused-variable warning and zero errors.
- `git diff --check`: passed.

## Subagent or fallback review results

This task owns the integration only. No independent reviewer has evaluated the complete Iteration 053 diff at the time of this document; the required fresh review remains a publication prerequisite.

## Visual validation

Not applicable: no browser-rendered behavior changed.

## Deployment notes

No deployment, migration, environment variable, or production operation is required. Commit the documentation, state, and invariant test together.

## Rollback procedure

Revert the focused integration commit. Remove `docs/engineering/loop-state.json` only if reverting the entire loop-control feature; otherwise reinitialize it through the CLI with reconciled evidence.

## Known limitations

The CLI's secure repository-relative input rule conflicts with an absolute `/tmp` input invocation. The identical transient repository-local copy is the safe current bridge; a future CLI interface change requires its own security-reviewed iteration.

## Follow-up work

Record actual preflight evidence, run the next eligible work slice, record validation and repair decisions if needed, obtain independent review, then authorize publication and acceptance through the controller.

## Pull-request reference

None. No pull request exists for `feat/iteration-053-loop-stop-control` as of reconciliation, and publication has not been authorized.
