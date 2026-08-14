import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_LIMITS,
  acceptIteration,
  authorizePublication,
  classifyCommand,
  evaluatePreflight,
  recordPublication,
  reconcileMergedPublication,
  recordValidation,
  requestRepair,
  type LoopState,
  type PreflightEvidence,
  type PublicationReadiness,
} from '../../../scripts/loop-control/policy';
import { parseLoopState } from '../../../scripts/loop-control/state';

const COMMIT_SHA = '8ee03c4f6fb8749bdbabc2a35cb7ad78f53f3ed9';
const ACCEPTANCE_HASH = '77bc377a2d8a3f0f9d06208d25bd0a589d98a2c25547981dd5650037ebfa5c7d';
const REQUIRED_COMMANDS = [
  ['npx', 'prisma', 'format'],
  ['npx', 'prisma', 'validate'],
  ['npx', 'tsc', '--noEmit'],
  ['npm', 'run', 'lint'],
  ['npm', 'test', '--', '--runInBand'],
  ['npm', 'run', 'build'],
  ['npm', 'run', 'db:status'],
  ['npm', 'run', 'db:verify'],
  ['git', 'diff', '--check'],
  ['npm', 'audit', '--omit=dev', '--audit-level=critical'],
] as const;

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
  startedAt: '2099-08-03T07:00:00.000Z',
  deadlineAt: '2099-08-03T09:00:00.000Z',
  limits: DEFAULT_LIMITS,
  acceptanceContractHash: ACCEPTANCE_HASH,
  lastRepairStrategyHash: null,
  lastFailure: null,
  validations: [],
  review: null,
  authorizedCommit: null,
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
  validations: REQUIRED_COMMANDS.map((command) => ({
    command: [...command],
    required: true,
    status: 'Passed',
    classification: 'introduced',
    repairable: false,
    summary: 'Required validation passed.',
  })),
  review: {
    independent: true,
    approved: true,
    baseCommitIsAncestor: true,
    summary: 'Independent review approved the focused change.',
  },
  ...changes,
});

const readyForPublication = (): PublicationReadiness => ({
  requiredValidationsPassed: true,
  noUnresolvedIntroducedFailure: true,
  review: reviewedState().review,
});

const authorizationVerification = {
  currentCommit: COMMIT_SHA,
  branchMatches: true,
  headDescendsFromBase: true,
  checkedAt: '2099-08-03T08:00:00.000Z',
};

const publicationVerification = {
  baseCommitIsAncestor: true,
  commitIsHead: true,
  branchMatches: true,
  repositoryMatches: true,
  livePullRequestMatches: true,
  checkedAt: '2099-08-03T08:00:00.000Z',
};

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
  const failed = recordValidation({ ...baseState(), phase: 'execute', nextAction: 'execute' }, {
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
  const failed = recordValidation({ ...baseState(), phase: 'execute', nextAction: 'execute' }, {
    command: ['npm', 'test'], required: true, status: 'Failed', classification: 'introduced', repairable: true,
    summary: 'policy test failed',
  });
  const repairing = requestRepair(failed.state, 'strategy-a');

  expect(requestRepair(repairing.state, 'strategy-b').terminalState).toBe('blocked');
});

test('validation timeout exhausts the repair loop', () => {
  expect(recordValidation({ ...baseState(), phase: 'execute', nextAction: 'execute' }, {
    command: ['npm', 'test'],
    required: true,
    status: 'Passed',
    classification: 'introduced',
    repairable: false,
    summary: 'completed too slowly',
    elapsedMinutes: DEFAULT_LIMITS.validationTimeoutMinutes,
  }).terminalState).toBe('exhausted');
});

test('environment-blocked validations remain recorded for the complete release matrix', () => {
  const required = recordValidation({ ...baseState(), phase: 'execute', nextAction: 'execute' }, {
    command: ['npm', 'run', 'build'],
    required: true,
    status: 'Blocked by environment',
    classification: 'environment-related',
    repairable: false,
    summary: 'database unavailable',
  });
  const optional = recordValidation({ ...baseState(), phase: 'execute', nextAction: 'execute' }, {
    command: ['npm', 'test'],
    required: false,
    status: 'Blocked by environment',
    classification: 'environment-related',
    repairable: false,
    summary: 'database unavailable',
  });

  expect(required).toMatchObject({ terminalState: null, nextAction: 'review' });
  expect(required.state.validations).toHaveLength(1);
  expect(optional).toMatchObject({ terminalState: null, nextAction: 'review' });
  expect(optional.state.validations).toHaveLength(1);
  const reviewed = {
    ...required.state,
    review: { independent: true, approved: true, baseCommitIsAncestor: true, summary: 'Approved.' },
  };
  expect(authorizePublication(reviewed, {
    requiredValidationsPassed: false,
    noUnresolvedIntroducedFailure: true,
    review: reviewed.review,
  }, authorizationVerification).terminalState).toBe('blocked');
});

test('record-validation cannot skip preflight or bypass a pending repair', () => {
  const passed = {
    command: ['npm', 'test'], required: true, status: 'Passed' as const, classification: 'introduced' as const,
    repairable: false, summary: 'Passed.',
  };
  expect(recordValidation(baseState(), passed).terminalState).toBe('blocked');

  const failed = recordValidation({ ...baseState(), phase: 'execute', nextAction: 'execute' }, {
    ...passed, status: 'Failed', repairable: true,
  });
  expect(failed.nextAction).toBe('repair');
  expect(recordValidation(failed.state, passed).terminalState).toBe('blocked');
});

test('late validation invalidates recorded review evidence', () => {
  const result = recordValidation(reviewedState(), {
    command: ['npm', 'test'], required: true, status: 'Passed', classification: 'introduced', repairable: false, summary: 'Passed.',
  });
  expect(result.state.review).toBeNull();
});

test('a required acceptance validation cannot be downgraded by a later optional record', () => {
  const result = recordValidation(reviewedState(), {
    command: ['npm', 'run', 'build'], required: false, status: 'Passed', classification: 'introduced',
    repairable: false, summary: 'Attempted downgrade.',
  });
  expect(result.terminalState).toBe('blocked');
});

test.each(['unknown', 'pre-existing', 'environment-related', 'invalid-command', 'external-service'] as const)(
  'does not automatically repair a %s failure',
  (classification) => {
    expect(recordValidation({ ...baseState(), phase: 'execute', nextAction: 'execute' }, {
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
  const authorized = authorizePublication(state, readyForPublication(), authorizationVerification);
  expect(authorized).toMatchObject({ terminalState: null, nextAction: 'publish' });
  expect(authorized.state.authorizedCommit).toBe(COMMIT_SHA);
  expect(authorizePublication(baseState(), readyForPublication(), authorizationVerification).terminalState).toBe('blocked');
  expect(authorizePublication(reviewedState({ validations: [] }), readyForPublication(), authorizationVerification).terminalState).toBe('blocked');
  expect(authorizePublication(reviewedState({ review: null }), readyForPublication(), authorizationVerification).terminalState).toBe('blocked');
  const withoutAncestry = reviewedState({ review: { ...state.review!, baseCommitIsAncestor: false } });
  expect(authorizePublication(withoutAncestry, readyForPublication(), authorizationVerification).terminalState).toBe('blocked');
  expect(authorizePublication(state, { ...readyForPublication(), requiredValidationsPassed: false }, authorizationVerification).terminalState).toBe('blocked');
  expect(authorizePublication(state, readyForPublication(), { ...authorizationVerification, branchMatches: false }).terminalState).toBe('blocked');
  expect(authorizePublication(state, readyForPublication(), { ...authorizationVerification, checkedAt: '2100-08-03T08:00:00.000Z' }).terminalState).toBe('exhausted');
  const incomplete = reviewedState({ validations: reviewedState().validations.slice(0, 1) });
  expect(authorizePublication(incomplete, { ...readyForPublication(), requiredValidationsPassed: false }, authorizationVerification).terminalState).toBe('blocked');
});

test('publication evidence requires an authorized phase, valid identifiers, and verified ancestry', () => {
  const reviewed = reviewedState();
  const authorized = authorizePublication(reviewed, readyForPublication(), authorizationVerification).state;
  const publication = {
    commit: COMMIT_SHA,
    pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53',
    pullRequestState: 'OPEN' as const,
  };

  expect(recordPublication(authorized, publication, publicationVerification).state.publication).toEqual(publication);
  expect(recordPublication(authorized, { ...publication, commit: 'f'.repeat(40) }, publicationVerification).terminalState).toBe('blocked');
  expect(recordPublication({ ...authorized, authorizedCommit: 'f'.repeat(40) }, publication, publicationVerification).terminalState).toBe('blocked');
  expect(recordPublication(authorized, publication, { ...publicationVerification, commitIsHead: false }).terminalState).toBe('blocked');
  expect(recordPublication(authorized, publication, { ...publicationVerification, repositoryMatches: false }).terminalState).toBe('blocked');
  expect(recordPublication(authorized, publication, { ...publicationVerification, livePullRequestMatches: false }).terminalState).toBe('blocked');
  expect(recordPublication(authorized, { ...publication, commit: authorized.baseCommit }, publicationVerification).terminalState).toBe('blocked');
  expect(recordPublication(baseState(), publication, publicationVerification).terminalState).toBe('blocked');
  expect(recordPublication(authorized, { ...publication, commit: 'abc1234' }, publicationVerification).terminalState).toBe('blocked');
  expect(recordPublication(authorized, { ...publication, pullRequestUrl: 'https://alice:secret@github.com/MaleakhiE/Investment-Eki/pull/53' }, publicationVerification).terminalState).toBe('blocked');
});

test('publication record requires live HEAD SHA matches authorized HEAD SHA', () => {
  const reviewed = reviewedState();
  const authorizedAtHeadA = authorizePublication(reviewed, readyForPublication(), authorizationVerification).state;
  const publicationAtHeadA = {
    commit: COMMIT_SHA,
    pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53',
    pullRequestState: 'OPEN' as const,
  };

  // Publication at the same HEAD SHA succeeds.
  expect(recordPublication(authorizedAtHeadA, publicationAtHeadA, publicationVerification).state.publication).toEqual(publicationAtHeadA);

  // Attempting publication at a different HEAD is blocked.
  const publicationAtHeadB = { ...publicationAtHeadA, commit: 'b'.repeat(40) };
  expect(recordPublication(authorizedAtHeadA, publicationAtHeadB, publicationVerification).terminalState).toBe('blocked');
});

test('acceptance requires publication commit equals the previously authorized HEAD', () => {
  const reviewed = reviewedState();
  const authorizedAtHeadA = authorizePublication(reviewed, readyForPublication(), authorizationVerification).state;
  const publishedAtHeadA = recordPublication(authorizedAtHeadA, {
    commit: COMMIT_SHA,
    pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53',
    pullRequestState: 'OPEN',
  }, publicationVerification).state;

  expect(acceptIteration(publishedAtHeadA, publicationVerification).terminalState).toBe('accepted');
  const publishedAtHeadB = {
    ...publishedAtHeadA,
    publication: {
      ...publishedAtHeadA.publication!,
      commit: 'b'.repeat(40),
    },
  };
  expect(acceptIteration(publishedAtHeadB, publicationVerification).terminalState).toBe('blocked');
});

test('reconciles a publication that merged before durable acceptance was recorded', () => {
  const reviewed = reviewedState();
  const authorized = authorizePublication(reviewed, readyForPublication(), authorizationVerification).state;
  const open = recordPublication(authorized, {
    commit: COMMIT_SHA,
    pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53',
    pullRequestState: 'OPEN',
  }, publicationVerification).state;
  const merged = reconcileMergedPublication(open, {
    ...open.publication!,
    pullRequestState: 'MERGED',
  }, publicationVerification);

  expect(merged.terminalState).toBeNull();
  expect(merged.state.publication?.pullRequestState).toBe('MERGED');
  expect(acceptIteration(merged.state, publicationVerification).terminalState).toBe('accepted');
});

test.each([
  ['wrong commit', { commit: 'f'.repeat(40) }],
  ['wrong PR URL', { pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/999' }],
  ['non-merged state', { pullRequestState: 'OPEN' as const }],
] as const)('merged publication reconciliation fails closed for %s', (_label, change) => {
  const reviewed = reviewedState();
  const authorized = authorizePublication(reviewed, readyForPublication(), authorizationVerification).state;
  const open = recordPublication(authorized, {
    commit: COMMIT_SHA,
    pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53',
    pullRequestState: 'OPEN',
  }, publicationVerification).state;
  expect(reconcileMergedPublication(open, {
    ...open.publication!,
    pullRequestState: 'MERGED',
    ...change,
  }, publicationVerification).terminalState).toBe('blocked');
});

test('repository durable loop state remains parseable by the controller', () => {
  const durableState = JSON.parse(readFileSync(path.join(process.cwd(), 'docs/engineering/loop-state.json'), 'utf8')) as unknown;

  expect(() => parseLoopState(durableState)).not.toThrow();
});

test('repository autonomous state documents the active branch and current iteration', () => {
  const autonomousState = readFileSync(path.join(process.cwd(), 'docs/engineering/autonomous-state.md'), 'utf8');

  expect(autonomousState).toContain('Current branch: `fix/iteration-095-model-selection-fallback`.');
  expect(autonomousState).toContain('Current iteration: 095');
});

test('legacy target metadata does not stop unbounded continuation', () => {
  const reviewed = reviewedState({ currentIteration: 70 });
  const authorized = authorizePublication(reviewed, readyForPublication(), authorizationVerification);
  const published = recordPublication(authorized.state, {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  }, publicationVerification).state;

  expect(acceptIteration(published, publicationVerification)).toMatchObject({ terminalState: 'accepted', nextAction: 'next-iteration' });
});

test('an accepted non-target iteration continues to the next iteration', () => {
  const reviewed = reviewedState();
  const authorized = authorizePublication(reviewed, readyForPublication(), authorizationVerification);
  const published = recordPublication(authorized.state, {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  }, publicationVerification).state;

  expect(acceptIteration(published, publicationVerification)).toMatchObject({ terminalState: 'accepted', nextAction: 'next-iteration' });
  expect(acceptIteration({ ...published, authorizedCommit: 'f'.repeat(40) }, publicationVerification).terminalState).toBe('blocked');
});

test('the terminal guard does not reopen an accepted iteration', () => {
  const reviewed = reviewedState();
  const authorized = authorizePublication(reviewed, readyForPublication(), authorizationVerification);
  const accepted = acceptIteration(recordPublication(authorized.state, {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  }, publicationVerification).state, publicationVerification);

  const result = recordValidation(accepted.state, {
    command: ['npm', 'test'], required: true, status: 'Passed', classification: 'introduced', repairable: false,
    summary: 'must not run after acceptance',
  });

  expect(result).toMatchObject({ terminalState: 'accepted', nextAction: 'next-iteration' });
  expect(result.state).toEqual(accepted.state);
});

test('acceptance requires review, ancestry, and a direct pull-request URL', () => {
  const reviewed = reviewedState();
  const authorized = authorizePublication(reviewed, readyForPublication(), authorizationVerification).state;
  const published = {
    ...authorized,
    publication: { commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN' as const },
  };

  expect(acceptIteration({ ...published, review: null }, publicationVerification).terminalState).toBe('blocked');
  expect(acceptIteration({ ...published, review: { ...published.review!, baseCommitIsAncestor: false } }, publicationVerification).terminalState).toBe('blocked');
  expect(acceptIteration({ ...published, publication: { ...published.publication, pullRequestUrl: '' } }, publicationVerification).terminalState).toBe('blocked');
  expect(acceptIteration(published, { ...publicationVerification, commitIsHead: false }).terminalState).toBe('blocked');
});

test('acceptance requires prior publication authorization', () => {
  const state = {
    ...baseState(),
    phase: 'publish' as const,
    nextAction: 'publish' as const,
    review: reviewedState().review,
    publication: { commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN' as const },
  };

  expect(acceptIteration(state, publicationVerification).terminalState).toBe('blocked');
});

test.each([
  ['npm', 'run', 'db:deploy'],
  ['npm', 'run', 'admin:promote'],
  ['npm', 'audit', 'fix'],
  ['npm', 'audit', 'fix', '--force'],
  ['npx', 'prisma', 'migrate', 'reset'],
  ['git', 'push', '--force'],
  ['npm', 'run', 'lint', '--', '--fix'],
  ['npx', 'tsc', '--build', '--clean'],
  ['npx', 'prisma', 'format', '--schema', '../outside.prisma'],
  ['npx', 'jest', '--config', 'attacker.js'],
  ['npm', 'run', 'db:verify', '--', '--production'],
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
  expect(classifyCommand(['npm', 'test', '--', 'db:deploy']).allowed).toBe(false);
});

test('fails closed for an unrecognized command', () => {
  expect(classifyCommand(['rm', '-rf', 'temporary-output']).allowed).toBe(false);
});
