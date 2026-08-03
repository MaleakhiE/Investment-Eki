import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_LIMITS,
  acceptIteration,
  authorizePublication,
  classifyCommand,
  evaluatePreflight,
  recordPublication,
  recordValidation,
  requestRepair,
  type LoopState,
  type PreflightEvidence,
} from '../../../scripts/loop-control/policy';

const COMMIT_SHA = '8ee03c4f6fb8749bdbabc2a35cb7ad78f53f3ed9';

test('instructions target 070 and require controller gates', () => {
  const agents = readFileSync(path.join(process.cwd(), 'AGENTS.md'), 'utf8');

  expect(agents).not.toMatch(/Completion Condition[\s\S]*Iteration 050/);
  expect(agents).toContain('npm run loop:control');
  expect(agents).toContain('authorize-publication');
  expect(agents).toContain('unsafe');
});

const baseState = (): LoopState => ({
  schemaVersion: 1,
  runId: 'iteration-053-test',
  targetIteration: 70,
  latestCompletedIteration: 52,
  currentIteration: 53,
  branch: 'feat/iteration-053-loop-stop-control',
  baseBranch: 'main',
  baseCommit: 'fcd3129a8f6c0bf8663ca92af0ff084bda9428ab',
  phase: 'preflight',
  terminalState: null,
  nextAction: 'preflight',
  repairAttempts: 0,
  iterationsAcceptedThisRun: 0,
  startedAt: '2026-08-03T07:00:00.000Z',
  deadlineAt: '2026-08-03T09:00:00.000Z',
  limits: DEFAULT_LIMITS,
  acceptanceContractHash: 'contract-v1',
  lastRepairStrategyHash: null,
  lastFailure: null,
  validations: [],
  review: null,
  publication: null,
  blocker: null,
});

const validPreflight = (): PreflightEvidence => ({
  worktreeInventoried: true,
  detached: false,
  fetchSucceeded: true,
  baseCommitIsAncestor: true,
  stateMatchesRepository: true,
  duplicateCompletedIteration: false,
  targetAuthorized: true,
  headMatchesOriginMain: true,
  secretsRisk: false,
  productionTarget: false,
  unsafeMigration: false,
  ownerDecisionRequired: false,
  elapsedMinutes: 0,
  networkRetries: 0,
  childAgents: 0,
  stackDepth: 0,
  changedLines: 0,
  changedFiles: 0,
});

const reviewedState = (changes: Partial<LoopState> = {}): LoopState => ({
  ...baseState(),
  phase: 'review',
  nextAction: 'review',
  validations: [{
    command: ['npm', 'test'],
    required: true,
    status: 'Passed',
    classification: 'introduced',
    repairable: false,
    summary: 'Full tests passed.',
  }],
  review: {
    independent: true,
    approved: true,
    baseCommitIsAncestor: true,
    summary: 'Independent review approved the focused change.',
  },
  ...changes,
});

test('iteration 052 continues toward 070', () => {
  const state = baseState();
  const result = evaluatePreflight(state, validPreflight());

  expect(result).toMatchObject({ terminalState: null, nextAction: 'execute' });
  expect(result.state).not.toBe(state);
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

test.each([
  ['max iterations', (state: LoopState, evidence: PreflightEvidence) => ({
    state: { ...state, iterationsAcceptedThisRun: state.limits.maxIterations }, evidence,
  })],
  ['elapsed minutes', (state: LoopState, evidence: PreflightEvidence) => ({
    state, evidence: { ...evidence, elapsedMinutes: state.limits.maxElapsedMinutes },
  })],
  ['network retries', (state: LoopState, evidence: PreflightEvidence) => ({
    state, evidence: { ...evidence, networkRetries: state.limits.maxNetworkRetries },
  })],
  ['child agents', (state: LoopState, evidence: PreflightEvidence) => ({
    state, evidence: { ...evidence, childAgents: state.limits.maxChildAgents },
  })],
  ['stack depth', (state: LoopState, evidence: PreflightEvidence) => ({
    state, evidence: { ...evidence, stackDepth: state.limits.maxStackDepth },
  })],
  ['changed lines', (state: LoopState, evidence: PreflightEvidence) => ({
    state, evidence: { ...evidence, changedLines: state.limits.maxChangedLines },
  })],
  ['changed files', (state: LoopState, evidence: PreflightEvidence) => ({
    state, evidence: { ...evidence, changedFiles: state.limits.maxChangedFiles },
  })],
])('%s limit exhausts the run', (_label, arrange) => {
  const { state, evidence } = arrange(baseState(), validPreflight());

  expect(evaluatePreflight(state, evidence).terminalState).toBe('exhausted');
});

test('repair continues only below cap with a changed strategy', () => {
  const failed = recordValidation(baseState(), {
    command: ['npm', 'test', '--', '--runInBand'],
    required: true,
    status: 'Failed',
    classification: 'introduced',
    repairable: true,
    summary: 'policy test failed',
  });

  expect(failed.nextAction).toBe('repair');
  expect(requestRepair(failed.state, 'strategy-a').state.repairAttempts).toBe(1);
  expect(requestRepair({ ...failed.state, lastRepairStrategyHash: 'strategy-a' }, 'strategy-a').terminalState).toBe('blocked');
  expect(requestRepair({ ...failed.state, repairAttempts: 2 }, 'strategy-c').state.repairAttempts).toBe(3);
  expect(requestRepair({ ...failed.state, repairAttempts: 3 }, 'strategy-d').terminalState).toBe('exhausted');
});

test('a second repair requires another failed validation first', () => {
  const failed = recordValidation(baseState(), {
    command: ['npm', 'test'], required: true, status: 'Failed', classification: 'introduced', repairable: true,
    summary: 'policy test failed',
  });
  const repairing = requestRepair(failed.state, 'strategy-a');

  expect(requestRepair(repairing.state, 'strategy-b').terminalState).toBe('blocked');
});

test('validation timeout exhausts the repair loop', () => {
  expect(recordValidation(baseState(), {
    command: ['npm', 'test'],
    required: true,
    status: 'Passed',
    classification: 'introduced',
    repairable: false,
    summary: 'completed too slowly',
    elapsedMinutes: DEFAULT_LIMITS.validationTimeoutMinutes,
  }).terminalState).toBe('exhausted');
});

test('a required environment-blocked validation blocks but an optional one remains recorded', () => {
  const required = recordValidation(baseState(), {
    command: ['npm', 'run', 'build'],
    required: true,
    status: 'Blocked by environment',
    classification: 'environment-related',
    repairable: false,
    summary: 'database unavailable',
  });
  const optional = recordValidation(baseState(), {
    command: ['npm', 'run', 'db:verify'],
    required: false,
    status: 'Blocked by environment',
    classification: 'environment-related',
    repairable: false,
    summary: 'database unavailable',
  });

  expect(required.terminalState).toBe('blocked');
  expect(optional).toMatchObject({ terminalState: null, nextAction: 'review' });
  expect(optional.state.validations).toHaveLength(1);
});

test.each(['unknown', 'pre-existing', 'environment-related', 'invalid-command', 'external-service'] as const)(
  'does not automatically repair a %s failure',
  (classification) => {
    expect(recordValidation(baseState(), {
      command: ['npm', 'test'],
      required: true,
      status: 'Failed',
      classification,
      repairable: true,
      summary: 'failure needs investigation',
    }).terminalState).toBe('blocked');
  },
);

test('publication authorization derives readiness from durable validation and review evidence', () => {
  const state = reviewedState();
  const authorized = authorizePublication(state);
  expect(authorized).toMatchObject({ terminalState: null, nextAction: 'publish' });
  expect(authorizePublication(baseState()).terminalState).toBe('blocked');
  expect(authorizePublication(reviewedState({ validations: [] })).terminalState).toBe('blocked');
  expect(authorizePublication(reviewedState({ review: null })).terminalState).toBe('blocked');
  expect(authorizePublication(reviewedState({ review: { ...state.review!, baseCommitIsAncestor: false } })).terminalState).toBe('blocked');
});

test('publication evidence requires an authorized phase, valid identifiers, and verified ancestry', () => {
  const authorized = authorizePublication(reviewedState()).state;
  const publication = {
    commit: COMMIT_SHA,
    pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53',
    pullRequestState: 'OPEN' as const,
  };

  expect(recordPublication(authorized, publication, true).state.publication).toEqual(publication);
  expect(recordPublication(authorized, publication, false).terminalState).toBe('blocked');
  expect(recordPublication(baseState(), publication, true).terminalState).toBe('blocked');
  expect(recordPublication(authorized, { ...publication, commit: 'abc1234' }, true).terminalState).toBe('blocked');
  expect(recordPublication(authorized, { ...publication, pullRequestUrl: 'https://alice:secret@github.com/MaleakhiE/Investment-Eki/pull/53' }, true).terminalState).toBe('blocked');
});

test('iteration 070 completes only after recorded publication evidence', () => {
  const authorized = authorizePublication(reviewedState({ currentIteration: 70 }));
  const published = recordPublication(authorized.state, {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  }, true).state;

  expect(acceptIteration(published).terminalState).toBe('completed');
});

test('an accepted non-target iteration continues to the next iteration', () => {
  const authorized = authorizePublication(reviewedState());
  const published = recordPublication(authorized.state, {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  }, true).state;

  expect(acceptIteration(published)).toMatchObject({ terminalState: 'accepted', nextAction: 'next-iteration' });
});

test('the terminal guard does not reopen an accepted iteration', () => {
  const authorized = authorizePublication(reviewedState());
  const accepted = acceptIteration(recordPublication(authorized.state, {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  }, true).state);

  const result = recordValidation(accepted.state, {
    command: ['npm', 'test'], required: true, status: 'Passed', classification: 'introduced', repairable: false,
    summary: 'must not run after acceptance',
  });

  expect(result).toMatchObject({ terminalState: 'accepted', nextAction: 'next-iteration' });
  expect(result.state).toEqual(accepted.state);
});

test('acceptance requires review, ancestry, and a direct pull-request URL', () => {
  const authorized = authorizePublication(reviewedState()).state;
  const published = {
    ...authorized,
    publication: { commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN' as const },
  };

  expect(acceptIteration({ ...published, review: null }).terminalState).toBe('blocked');
  expect(acceptIteration({ ...published, review: { ...published.review!, baseCommitIsAncestor: false } }).terminalState).toBe('blocked');
  expect(acceptIteration({ ...published, publication: { ...published.publication, pullRequestUrl: '' } }).terminalState).toBe('blocked');
});

test('acceptance requires prior publication authorization', () => {
  const state = {
    ...baseState(),
    phase: 'publish' as const,
    nextAction: 'publish' as const,
    review: reviewedState().review,
    publication: { commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN' as const },
  };

  expect(acceptIteration(state).terminalState).toBe('blocked');
});

test.each([
  ['npm', 'run', 'db:deploy'],
  ['npm', 'run', 'admin:promote'],
  ['npm', 'audit', 'fix'],
  ['npm', 'audit', 'fix', '--force'],
  ['npx', 'prisma', 'migrate', 'reset'],
  ['git', 'push', '--force'],
])('denies %j', (...command) => expect(classifyCommand(command).allowed).toBe(false));

test.each([
  ['git', 'diff', '--check'],
  ['npm', 'audit', '--omit=dev', '--audit-level=critical'],
])('allows required read-only validation %j', (...command) => expect(classifyCommand(command).allowed).toBe(true));

test.each([
  ['npm', 'audit'],
  ['npm', 'audit', '--audit-level=critical'],
  ['npm', 'audit', '--omit=dev', '--audit-level=high'],
  ['npm', 'audit', '--omit=dev', '--audit-level=critical', '--json'],
])('rejects non-canonical audit command %j', (...command) => expect(classifyCommand(command).allowed).toBe(false));

test('does not deny a safe argv because an argument merely contains a denied command', () => {
  expect(classifyCommand(['npm', 'test', '--', 'db:deploy']).allowed).toBe(true);
});

test('fails closed for an unrecognized command', () => {
  expect(classifyCommand(['rm', '-rf', 'temporary-output']).allowed).toBe(false);
});
