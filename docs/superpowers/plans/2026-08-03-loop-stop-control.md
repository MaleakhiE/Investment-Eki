# Executable Loop Stop Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an executable control plane that keeps Investment-Eki's outer engineering-iteration loop and inner validation/repair loop running only while verified evidence and explicit budgets permit it.

**Architecture:** A pure TypeScript policy module makes deterministic decisions, a state module validates and atomically persists redacted JSON, and a thin CLI applies one transition per invocation. The Codex harness remains the executor and follows the returned `nextAction`; no model SDK, workflow framework, production write, merge, or deployment is added.

**Tech Stack:** Node.js standard library, TypeScript 5, `tsx`, Jest 30 with `ts-jest`, existing Git/Codex engineering workflow.

## Global Constraints

- Add no production dependency.
- Target Iteration 070; correct the stale Iteration 050 completion clause.
- Limits: 3 repairs, 18 iterations, 120 run minutes, 30 validation minutes, 2 network retries, 6 child agents, stack depth 1, 2,000 changed lines and 30 changed files per iteration.
- Terminal states are exactly `accepted`, `completed`, `blocked`, `unsafe`, `exhausted`, and `escalated`.
- Validation states remain exactly `Passed`, `Failed`, `Blocked by environment`, and `Not applicable`.
- Never persist secrets, environment values, database URLs, tokens, full transcripts, or private financial data.
- Never authorize merge, auto-merge, force-push, deployment, credential changes, production writes, destructive commands, `db:migrate`, `db:deploy`, `db:seed`, `admin:promote`, or `smtp:import`.
- Hard-stop predicates run before commit, push, or pull-request creation.
- The controller never launches an LLM; the surrounding harness performs the returned action.

## File map

- `scripts/loop-control/policy.ts`: closed types, limits, command policy, and both loop decisions.
- `scripts/loop-control/state.ts`: schema validation, privacy/path guards, atomic JSON persistence.
- `scripts/loop-control.ts`: JSON CLI and phase dispatch.
- `src/lib/loop-control/{policy,state,cli}.test.ts`: table-driven public-seam tests.
- `package.json`: one `loop:control` script.
- `AGENTS.md` and `.agents/skills/investment-eki-loop/SKILL.md`: executable phase gates.
- `docs/engineering/loop-state.json`: reconciled machine state.
- Iteration 053 design/result and autonomous-state documents: exact evidence and handoff.

---

### Task 1: Pure stop policy for both loop layers

**Files:**
- Create: `scripts/loop-control/policy.ts`
- Test: `src/lib/loop-control/policy.test.ts`

**Interfaces:**
- Produces: `LoopState`, `Decision`, `evaluatePreflight()`, `recordValidation()`, `requestRepair()`, `authorizePublication()`, `acceptIteration()`, and `classifyCommand()`.
- Consumes: plain immutable values only; no filesystem or process state.

- [ ] **Step 1: Write the failing policy tests**

Create a `baseState()` fixture and table-test the public seam:

```ts
import {
  DEFAULT_LIMITS,
  acceptIteration,
  authorizePublication,
  classifyCommand,
  evaluatePreflight,
  recordValidation,
  requestRepair,
  type LoopState,
} from '../../../../scripts/loop-control/policy';

const baseState = (): LoopState => ({
  schemaVersion: 1,
  runId: 'iteration-053-test',
  targetIteration: 70,
  latestCompletedIteration: 52,
  currentIteration: 53,
  branch: 'feat/iteration-053-loop-stop-control',
  baseBranch: 'main',
  baseCommit: 'fcd3129a8f6c0bf8663ca92af0ff084bda9428ab',
  phase: 'preflight', terminalState: null, nextAction: 'preflight',
  repairAttempts: 0, iterationsAcceptedThisRun: 0,
  startedAt: '2026-08-03T07:00:00.000Z', deadlineAt: '2026-08-03T09:00:00.000Z',
  limits: DEFAULT_LIMITS, acceptanceContractHash: 'contract-v1',
  lastRepairStrategyHash: null, lastFailure: null, validations: [],
  review: null, publication: null, blocker: null,
});

test('iteration 052 continues toward 070', () => {
  const result = evaluatePreflight(baseState(), validPreflight());
  expect(result).toMatchObject({ terminalState: null, nextAction: 'execute' });
});

test.each([
  ['stale state', { stateMatchesRepository: false }, 'blocked'],
  ['detached head', { detached: true }, 'blocked'],
  ['secret risk', { secretsRisk: true }, 'unsafe'],
  ['production target', { productionTarget: true }, 'unsafe'],
  ['unsafe migration', { unsafeMigration: true }, 'unsafe'],
  ['owner decision', { ownerDecisionRequired: true }, 'escalated'],
] as const)('%s fails closed', (_label, override, terminal) => {
  expect(evaluatePreflight(baseState(), { ...validPreflight(), ...override }).terminalState).toBe(terminal);
});

test('repair continues only below cap with a changed strategy', () => {
  const failed = recordValidation(baseState(), {
    command: ['npm', 'test', '--', '--runInBand'], required: true,
    status: 'Failed', classification: 'introduced', repairable: true,
    summary: 'policy test failed',
  });
  expect(failed.nextAction).toBe('repair');
  expect(requestRepair(failed.state, 'strategy-a').state.repairAttempts).toBe(1);
  expect(requestRepair({ ...failed.state, lastRepairStrategyHash: 'strategy-a' }, 'strategy-a').terminalState).toBe('blocked');
  expect(requestRepair({ ...failed.state, repairAttempts: 2 }, 'strategy-c').terminalState).toBe('exhausted');
});

test('iteration 070 completes only after recorded publication evidence', () => {
  const state = { ...baseState(), currentIteration: 70, phase: 'publish' as const };
  const authorized = authorizePublication(state, readyForPublication());
  const published = {
    ...authorized.state,
    publication: { commit: 'abc1234', pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN' as const },
  };
  expect(acceptIteration(published).terminalState).toBe('completed');
});

test.each([
  ['npm', 'run', 'db:deploy'], ['npm', 'run', 'admin:promote'],
  ['npx', 'prisma', 'migrate', 'reset'], ['git', 'push', '--force'],
])('denies %j', (...command) => expect(classifyCommand(command).allowed).toBe(false));
```

Define `validPreflight()` and `readyForPublication()` in the same test with every required field explicit. Add cases for every numeric limit, required versus optional blocked validation, unknown failure classification, missing review, missing ancestry, and missing PR URL at `acceptIteration()`.

- [ ] **Step 2: Run the focused test and confirm RED**

```bash
npx jest --runTestsByPath src/lib/loop-control/policy.test.ts --runInBand
```

Expected: FAIL because `scripts/loop-control/policy.ts` does not exist.

- [ ] **Step 3: Implement the minimal immutable policy**

Create the closed public types and limits:

```ts
export type TerminalState = 'accepted' | 'completed' | 'blocked' | 'unsafe' | 'exhausted' | 'escalated';
export type ValidationStatus = 'Passed' | 'Failed' | 'Blocked by environment' | 'Not applicable';
export type FailureClassification = 'introduced' | 'pre-existing' | 'environment-related' | 'invalid-command' | 'external-service' | 'unknown';
export type Phase = 'preflight' | 'execute' | 'validate' | 'repair' | 'review' | 'publish' | 'stopped';
export type NextAction = 'preflight' | 'execute' | 'validate' | 'repair' | 'review' | 'publish' | 'next-iteration' | 'stop';

export const DEFAULT_LIMITS = Object.freeze({
  maxRepairAttempts: 3, maxIterations: 18, maxElapsedMinutes: 120,
  validationTimeoutMinutes: 30, maxNetworkRetries: 2, maxChildAgents: 6,
  maxStackDepth: 1, maxChangedLines: 2_000, maxChangedFiles: 30,
});
```

Implement unsafe checks first, then escalation, exhaustion, stale/ambiguous evidence, and finally the normal transition. Return new objects/arrays and freeze the acceptance-contract hash after initialization. Match normalized argv arrays, never shell substrings.

- [ ] **Step 4: Run focused tests and confirm GREEN**

```bash
npx jest --runTestsByPath src/lib/loop-control/policy.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit the policy slice**

```bash
git add scripts/loop-control/policy.ts src/lib/loop-control/policy.test.ts
git commit -m "feat(loop): enforce bounded stop decisions"
```

---

### Task 2: Validated and atomic durable state

**Files:**
- Create: `scripts/loop-control/state.ts`
- Test: `src/lib/loop-control/state.test.ts`

**Interfaces:**
- Consumes: `LoopState` from Task 1.
- Produces: `parseLoopState(value)`, `readLoopState(repoRoot, relativePath?)`, and `writeLoopState(repoRoot, state, relativePath?)`.

- [ ] **Step 1: Write failing schema, privacy, path, and atomic-write tests**

Use `mkdtemp` with a fresh explicit directory per test:

```ts
test('rejects unknown states and invalid limits', () => {
  expect(() => parseLoopState({ schemaVersion: 1, terminalState: 'done' })).toThrow('Invalid loop state');
});

test.each(['DATABASE_URL=mysql://secret', 'token=abc123'])
  ('rejects sensitive state: %s', async (blocker) => {
    await expect(writeLoopState(root, validState({ blocker }))).rejects.toThrow('Sensitive state value');
  });

test('rejects paths outside the repository root', async () => {
  await expect(writeLoopState(root, validState(), '../loop-state.json')).rejects.toThrow('outside repository root');
});

test('an interrupted temp write leaves the prior state readable', async () => {
  await writeLoopState(root, validState());
  await writeFile(path.join(root, 'docs/engineering/loop-state.json.tmp'), '{broken', 'utf8');
  expect(await readLoopState(root)).toEqual(validState());
});
```

The fixture must match Task 1's exact state fields. Remove only each recorded temporary directory in `afterEach`.

- [ ] **Step 2: Run the state test and confirm RED**

```bash
npx jest --runTestsByPath src/lib/loop-control/state.test.ts --runInBand
```

Expected: FAIL because the state module does not exist.

- [ ] **Step 3: Implement validated atomic replacement**

Use only `node:fs/promises` and `node:path`:

```ts
const DEFAULT_STATE_PATH = 'docs/engineering/loop-state.json';

export async function writeLoopState(repoRoot: string, state: LoopState, relativePath = DEFAULT_STATE_PATH) {
  const target = resolveWithinRoot(repoRoot, relativePath);
  assertNoSensitiveValues(state);
  const validated = parseLoopState(state);
  const temporary = `${target}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, target);
}
```

Validate every required field, closed enum, ISO timestamp, positive limit, and iteration relationship. Return copies. On failure, leave the previous target untouched and never persist raw command output.

- [ ] **Step 4: Run policy and state tests**

```bash
npx jest --runTestsByPath src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit durable state**

```bash
git add scripts/loop-control/state.ts src/lib/loop-control/state.test.ts
git commit -m "feat(loop): persist validated run state"
```

---

### Task 3: Thin CLI and dry-run proof

**Files:**
- Create: `scripts/loop-control.ts`
- Test: `src/lib/loop-control/cli.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 policy and Task 2 state functions.
- Produces: `main(argv: readonly string[], io: CliIo): Promise<number>` and the `npm run loop:control -- COMMAND` entry point.

- [ ] **Step 1: Write failing CLI contract tests**

Inject IO rather than mutating global process streams:

```ts
import { main, type CliIo } from '../../../../scripts/loop-control';

test('dry-run preflight emits one decision without writing state', async () => {
  const stdout: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: fail };
  expect(await main(['preflight', '--input', 'preflight.json', '--dry-run'], io)).toBe(0);
  expect(stdout).toHaveLength(1);
  expect(JSON.parse(stdout[0])).toMatchObject({ terminalState: null, nextAction: 'execute' });
});

test('invalid JSON fails closed without rewriting state', async () => {
  const stderr: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: fail, stderr: (line) => stderr.push(line) };
  expect(await main(['record-validation', '--input', 'invalid.json'], io)).toBe(2);
  expect(stderr[0]).toContain('Invalid input');
});

test.each(['db:deploy', 'db:seed', 'admin:promote', 'smtp:import'])
  ('denies operational script %s', async (script) => {
    const stdout: string[] = [];
    const io: CliIo = { cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: fail };
    expect(await main(['classify-command', '--', 'npm', 'run', script], io)).toBe(2);
    expect(JSON.parse(stdout[0])).toMatchObject({ allowed: false });
  });
```

Build the fixture state with `writeLoopState`; never read or change the real state from tests.

- [ ] **Step 2: Run the CLI test and confirm RED**

```bash
npx jest --runTestsByPath src/lib/loop-control/cli.test.ts --runInBand
```

Expected: FAIL because the CLI module does not exist.

- [ ] **Step 3: Implement one-transition CLI dispatch**

Support `init`, `preflight`, `record-validation`, `request-repair`, `record-review`, `authorize-publication`, `accept-iteration`, `status`, and `classify-command`. Parse immutable argv, resolve files beneath `io.cwd`, emit one JSON decision to stdout, diagnostics to stderr, and persist only successful non-dry-run transitions.

```ts
export const EXIT = Object.freeze({ CONTINUE: 0, TERMINAL_SUCCESS: 0, BLOCKED: 1, INVALID_OR_UNSAFE: 2 });

export interface CliIo {
  readonly cwd: string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}
```

Use an ESM entry-point check so Jest imports do not execute `main()`.

- [ ] **Step 4: Add the existing-runtime package command**

Add only:

```json
"loop:control": "tsx scripts/loop-control.ts"
```

Do not change dependencies or the lockfile because `tsx` is installed.

- [ ] **Step 5: Run all focused tests and command denial proof**

```bash
npx jest --runTestsByPath src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts src/lib/loop-control/cli.test.ts --runInBand
npm run loop:control -- classify-command -- npm run db:deploy
```

Expected: Jest PASS. The second command emits `allowed: false` and exits 2; that exact denial is the expected result.

- [ ] **Step 6: Commit the CLI slice**

```bash
git add scripts/loop-control.ts src/lib/loop-control/cli.test.ts package.json
git commit -m "feat(loop): expose durable control CLI"
```

---

### Task 4: Integrate phase gates and reconcile Iteration 053

**Files:**
- Modify: `AGENTS.md`
- Modify: `.agents/skills/investment-eki-loop/SKILL.md`
- Create: `docs/engineering/loop-state.json`
- Create: `docs/engineering/iterations/iteration-053.md`
- Modify: `docs/engineering/autonomous-state.md`
- Modify: `src/lib/loop-control/policy.test.ts`

**Interfaces:**
- Consumes: CLI decisions and terminal states.
- Produces: one canonical target and required preflight, repair, publication, and acceptance gates.

- [ ] **Step 1: Add a failing instruction-invariant test**

```ts
test('instructions target 070 and require controller gates', () => {
  const agents = readFileSync(path.join(process.cwd(), 'AGENTS.md'), 'utf8');
  expect(agents).not.toMatch(/Completion Condition[\s\S]*Iteration 050/);
  expect(agents).toContain('npm run loop:control');
  expect(agents).toContain('authorize-publication');
  expect(agents).toContain('unsafe');
});
```

- [ ] **Step 2: Run the invariant test and confirm RED**

```bash
npx jest --runTestsByPath src/lib/loop-control/policy.test.ts --runInBand
```

Expected: FAIL on the stale Iteration 050 clause and missing CLI gates.

- [ ] **Step 3: Update instruction surfaces minimally**

In `AGENTS.md`, change the completion target to 070 and add an `Executable Loop Control` section requiring `preflight` before edits, `record-validation`/`request-repair` during repair, `authorize-publication` before external publication, and `accept-iteration` before continuing. State that `unsafe` prevents commit/push/PR despite normal pre-stop steps.

In the loop skill, add the same four gates without duplicating policy internals. Retain the existing single-slice workflow and three-repair cap.

- [ ] **Step 4: Initialize reconciled state through the CLI**

Create `/tmp/investment-loop-init-053.json` as an untracked input with this exact reconciled contract:

```json
{
  "schemaVersion": 1,
  "runId": "iteration-053-loop-stop-control",
  "targetIteration": 70,
  "latestCompletedIteration": 52,
  "currentIteration": 53,
  "branch": "feat/iteration-053-loop-stop-control",
  "baseBranch": "main",
  "baseCommit": "fcd3129a8f6c0bf8663ca92af0ff084bda9428ab",
  "acceptanceContractHash": "77bc377a2d8a3f0f9d06208d25bd0a589d98a2c25547981dd5650037ebfa5c7d"
}
```

Then run:

```bash
npm run loop:control -- init --input /tmp/investment-loop-init-053.json
npm run loop:control -- status
```

Expected: `docs/engineering/loop-state.json` has schema 1, phase `preflight`, no terminal state, and no sensitive values. Delete only the explicit temporary input afterward.

- [ ] **Step 5: Document Iteration 053 and reconcile human state**

Write `iteration-053.md` with every repository-required section and exact graph impacts. Update autonomous state from current Git/remote evidence; remove claims that the Iteration 052 branch or PR #48 is the current work. Preserve verified historical facts only when clearly labeled.

- [ ] **Step 6: Run focused static verification**

```bash
npx jest --runTestsByPath src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts src/lib/loop-control/cli.test.ts --runInBand
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: all exit 0.

- [ ] **Step 7: Commit integration**

```bash
git add AGENTS.md .agents/skills/investment-eki-loop/SKILL.md docs/engineering/loop-state.json docs/engineering/iterations/iteration-053.md docs/engineering/autonomous-state.md src/lib/loop-control/policy.test.ts
git commit -m "docs(loop): require executable phase gates"
```

---

### Task 5: Independent review, full verification, and publication gate

**Files:**
- Create: `docs/engineering/iterations/iteration-053-result.md`
- Modify: `docs/engineering/autonomous-state.md`
- Modify through CLI only: `docs/engineering/loop-state.json`

**Interfaces:**
- Consumes: complete diff from the recorded base and every controller transition.
- Produces: exact Iteration 053 result evidence and an accurate final decision.

- [ ] **Step 1: Run full validation and feed every result to the inner loop**

```bash
npx prisma format
npx prisma validate
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
npm run db:status
npm run db:verify
git diff --check
npm audit --omit=dev --audit-level=critical
```

Classify each result with the four permitted validation states. For an introduced repairable failure, call `request-repair` with a changed strategy, repair minimally, and rerun. Stop after three unsuccessful repairs. Never report environment-blocked database, network, browser, or audit checks as passed.

- [ ] **Step 2: Run independent security, QA, and release reviews**

Dispatch fresh read-only reviewers against the complete diff from `fcd3129a8f6c0bf8663ca92af0ff084bda9428ab`. Resolve confirmed high-severity findings through the same repair loop, then record outcomes with `record-review`.

- [ ] **Step 3: Prove terminal and denial paths**

```bash
npm run loop:control -- classify-command -- npm run db:deploy
npm run loop:control -- classify-command -- git push --force
```

Expected: both emit `allowed: false` and exit 2. The focused test suite must also prove `completed`, `blocked`, `unsafe`, `exhausted`, and `escalated` using fixture state only.

- [ ] **Step 4: Write result evidence and current state**

Create `iteration-053-result.md` with RED/GREEN evidence, exact command exits, review findings, quality score, limitations, deployment/rollback, and next iteration. Update autonomous state with actual branch, base, validation, blocker, and PR state. Never invent a PR URL.

- [ ] **Step 5: Commit result evidence**

```bash
git add docs/engineering/iterations/iteration-053-result.md docs/engineering/autonomous-state.md docs/engineering/loop-state.json
git commit -m "docs: record iteration 053 validation"
```

- [ ] **Step 6: Run publication authorization in dry-run mode**

```bash
npm run loop:control -- authorize-publication --input /tmp/investment-loop-publication-053.json --dry-run
```

Populate `/tmp/investment-loop-publication-053.json` immediately beforehand with the exact validation booleans, reviewer decision, and `git merge-base --is-ancestor` result. Expected: `nextAction: publish` only when those pre-publication gates pass. Otherwise obey the returned terminal state. The PR URL/state is recorded after Step 7 and is required by `accept-iteration`, avoiding a circular pre-publication requirement.

- [ ] **Step 7: Publish only after controller authorization**

```bash
git push -u origin feat/iteration-053-loop-stop-control
gh pr list --head feat/iteration-053-loop-stop-control --json number,url,state,isDraft
```

Create a review-ready PR against `main` only if none exists. Never merge or enable auto-merge. Record the real URL/state, then call `accept-iteration`; expected next action is `next-iteration` because 053 is below target 070.
