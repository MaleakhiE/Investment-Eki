import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { main, type CliIo } from '../../../scripts/loop-control';
import {
  ACCEPTANCE_CONTRACT_HASH,
  DEFAULT_LIMITS,
  REQUIRED_VALIDATION_COMMANDS,
  type LoopState,
} from '../../../scripts/loop-control/policy';
import { readLoopState, writeLoopState } from '../../../scripts/loop-control/state';

const COMMIT_SHA = '8ee03c4f6fb8749bdbabc2a35cb7ad78f53f3ed9';
const authorizationVerification = {
  currentCommit: COMMIT_SHA, branchMatches: true, headDescendsFromBase: true, checkedAt: '2099-08-03T08:00:00.000Z',
};
const publicationVerification = {
  baseCommitIsAncestor: true, commitIsHead: true, branchMatches: true, repositoryMatches: true,
  livePullRequestMatches: true, checkedAt: '2099-08-03T08:00:00.000Z',
};
const passedValidations = () => REQUIRED_VALIDATION_COMMANDS.map((command) => ({
  command: [...command], required: true, status: 'Passed' as const, classification: 'introduced' as const,
  repairable: false, summary: 'Passed.',
}));

const roots: string[] = [];
const fail = (line: string): never => { throw new Error(`Unexpected output: ${line}`); };

const validState = (changes: Partial<LoopState> = {}): LoopState => ({
  schemaVersion: 1,
  runId: 'iteration-053-cli-test',
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
  acceptanceContractHash: ACCEPTANCE_CONTRACT_HASH,
  lastRepairStrategyHash: null,
  lastFailure: null,
  validations: [],
  review: null,
  publication: null,
  blocker: null,
  ...changes,
});

const createRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), 'loop-control-cli-'));
  roots.push(root);
  await writeLoopState(root, validState());
  return root;
};

const createEmptyRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), 'loop-control-cli-'));
  roots.push(root);
  return root;
};

const writeInput = async (root: string, name: string, value: unknown): Promise<string> => {
  await writeFile(path.join(root, name), JSON.stringify(value), 'utf8');
  return name;
};

const preflight = {
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
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('dry-run preflight emits one decision without writing state', async () => {
  const fixtureRoot = await createRoot();
  await writeFile(path.join(fixtureRoot, 'preflight.json'), JSON.stringify(preflight), 'utf8');
  const stdout: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: fail };

  expect(await main(['preflight', '--input', 'preflight.json', '--dry-run'], io)).toBe(0);
  expect(stdout).toHaveLength(1);
  expect(JSON.parse(stdout[0])).toMatchObject({ terminalState: null, nextAction: 'execute' });
  expect(await readLoopState(fixtureRoot)).toEqual(validState());
});

test('invalid JSON fails closed without rewriting state', async () => {
  const fixtureRoot = await createRoot();
  await writeFile(path.join(fixtureRoot, 'invalid.json'), '{', 'utf8');
  const stderr: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: fail, stderr: (line) => stderr.push(line) };

  expect(await main(['record-validation', '--input', 'invalid.json'], io)).toBe(2);
  expect(stderr[0]).toContain('Invalid input');
  expect(await readLoopState(fixtureRoot)).toEqual(validState());
});

test.each(['db:deploy', 'db:seed', 'admin:promote', 'smtp:import'])
  ('denies operational script %s', async (script) => {
    const fixtureRoot = await createRoot();
    const stdout: string[] = [];
    const io: CliIo = { cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: fail };

    expect(await main(['classify-command', '--', 'npm', 'run', script], io)).toBe(2);
    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout[0])).toMatchObject({ allowed: false });
  });

test.each([
  ['npm', 'audit', 'fix'],
  ['npm', 'audit', 'fix', '--force'],
])('denies mutating audit command %j', async (...command) => {
  const fixtureRoot = await createRoot();
  const stdout: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: fail };

  expect(await main(['classify-command', '--', ...command], io)).toBe(2);
  expect(JSON.parse(stdout[0])).toMatchObject({ allowed: false });
});

test('rejects an input path outside the fixture root without reading state', async () => {
  const fixtureRoot = await createRoot();
  const stderr: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: fail, stderr: (line) => stderr.push(line) };

  expect(await main(['preflight', '--input', '../preflight.json'], io)).toBe(2);
  expect(stderr[0]).toContain('Invalid input');
  expect(await readLoopState(fixtureRoot)).toEqual(validState());
});

test('initializes only an absent canonical durable state', async () => {
  const fixtureRoot = await createEmptyRoot();
  const customState = validState({ runId: 'custom-state' });
  await writeInput(fixtureRoot, 'initial.json', customState);
  const stdout: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: fail };

  expect(await main(['init', '--input', 'initial.json'], io)).toBe(0);
  expect(await readLoopState(fixtureRoot)).toEqual(customState);
  expect(await main(['status'], io)).toBe(0);
  expect(JSON.parse(stdout.at(-1) ?? '')).toMatchObject({ state: { runId: 'custom-state' } });
  expect(await main(['init', '--input', 'initial.json'], { ...io, stderr: () => undefined })).toBe(2);
  expect(await main(['init', '--input', 'initial.json', '--dry-run'], { ...io, stderr: () => undefined })).toBe(2);
  expect(await main(['status', '--state', 'package.json'], { ...io, stderr: () => undefined })).toBe(2);
});

test('init rejects a coherent but non-pristine accepted state', async () => {
  const fixtureRoot = await createRoot();
  const accepted = validState({
    phase: 'publish', terminalState: 'accepted', nextAction: 'next-iteration',
    validations: passedValidations(),
    review: { independent: true, approved: true, baseCommitIsAncestor: true, summary: 'Approved.' },
    publication: { commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN' },
  });
  await writeLoopState(fixtureRoot, accepted, 'accepted.json');
  const stderr: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: fail, stderr: (line) => stderr.push(line) };

  expect(await main(['init', '--input', 'accepted.json'], io)).toBe(2);
  expect(stderr).toEqual(['Invalid input.']);
});

test('authorize-publication cannot skip preflight and durable evidence', async () => {
  const fixtureRoot = await createRoot();
  const stdout: string[] = [];
  const io: CliIo = {
    cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: fail,
    verifyAuthorization: async () => authorizationVerification,
  };
  await writeInput(fixtureRoot, 'publication-readiness.json', {
    requiredValidationsPassed: true,
    noUnresolvedIntroducedFailure: true,
    review: { independent: true, approved: true, baseCommitIsAncestor: true, summary: 'Forged.' },
  });

  expect(await main(['authorize-publication', '--input', 'publication-readiness.json'], io)).toBe(1);
  expect(JSON.parse(stdout[0])).toMatchObject({ terminalState: 'blocked', nextAction: 'stop' });
  expect(await readLoopState(fixtureRoot)).toMatchObject({ terminalState: 'blocked', publication: null });
});

test('persists the preflight, validation, review, publication, and acceptance commands', async () => {
  const fixtureRoot = await createRoot();
  const io: CliIo = {
    cwd: fixtureRoot, stdout: () => undefined, stderr: fail,
    verifyAuthorization: async () => authorizationVerification,
    verifyPublication: async () => publicationVerification,
  };
  const review = { independent: true, approved: true, baseCommitIsAncestor: true, summary: 'Approved independently.' };
  await writeInput(fixtureRoot, 'preflight.json', preflight);
  await writeInput(fixtureRoot, 'review.json', review);
  await writeInput(fixtureRoot, 'publication.json', {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  });
  await writeInput(fixtureRoot, 'publication-readiness.json', {
    requiredValidationsPassed: true, noUnresolvedIntroducedFailure: true, review,
  });

  expect(await main(['preflight', '--input', 'preflight.json'], io)).toBe(0);
  expect((await readLoopState(fixtureRoot)).nextAction).toBe('execute');
  for (const [index, command] of REQUIRED_VALIDATION_COMMANDS.entries()) {
    const inputName = `validation-${index}.json`;
    await writeInput(fixtureRoot, inputName, {
      command, required: true, status: 'Passed', classification: 'introduced', repairable: false, summary: 'Passed.', elapsedMinutes: 0,
    });
    expect(await main(['record-validation', '--input', inputName], io)).toBe(0);
  }
  expect((await readLoopState(fixtureRoot)).nextAction).toBe('review');
  expect(await main(['record-review', '--input', 'review.json'], io)).toBe(0);
  expect((await readLoopState(fixtureRoot)).review).toEqual(review);
  expect(await main(['authorize-publication', '--input', 'publication-readiness.json'], io)).toBe(0);
  expect(await main(['record-publication', '--input', 'publication.json'], io)).toBe(0);
  expect(await main(['accept-iteration'], io)).toBe(0);
  expect(await readLoopState(fixtureRoot)).toMatchObject({ terminalState: 'accepted', nextAction: 'next-iteration' });
});

test('rejects publication without verified commit ancestry', async () => {
  const fixtureRoot = await createRoot();
  await writeLoopState(fixtureRoot, validState({
    phase: 'publish', nextAction: 'publish',
    validations: passedValidations(),
    review: { independent: true, approved: true, baseCommitIsAncestor: true, summary: 'Approved.' },
  }));
  await writeInput(fixtureRoot, 'publication.json', {
    commit: COMMIT_SHA, pullRequestUrl: 'https://github.com/MaleakhiE/Investment-Eki/pull/53', pullRequestState: 'OPEN',
  });
  const io: CliIo = {
    cwd: fixtureRoot, stdout: () => undefined, stderr: () => undefined,
    verifyPublication: async () => ({ ...publicationVerification, baseCommitIsAncestor: false }),
  };

  expect(await main(['record-publication', '--input', 'publication.json'], io)).toBe(1);
  expect((await readLoopState(fixtureRoot)).publication).toBeNull();
});

test('serializes concurrent state transitions without losing the winning decision', async () => {
  const fixtureRoot = await createRoot();
  await writeInput(fixtureRoot, 'preflight.json', preflight);
  const io: CliIo = { cwd: fixtureRoot, stdout: () => undefined, stderr: () => undefined };

  const exits = await Promise.all([
    main(['preflight', '--input', 'preflight.json'], io),
    main(['preflight', '--input', 'preflight.json'], io),
  ]);

  expect(exits.sort()).toEqual([0, 2]);
  expect(await readLoopState(fixtureRoot)).toMatchObject({ phase: 'execute', nextAction: 'execute' });
});

test('persists a requested repair after an introduced repairable validation failure', async () => {
  const fixtureRoot = await createRoot();
  const io: CliIo = { cwd: fixtureRoot, stdout: () => undefined, stderr: fail };
  await writeInput(fixtureRoot, 'failed-validation.json', {
    command: ['npm', 'test'], required: true, status: 'Failed', classification: 'introduced', repairable: true, summary: 'Failed.', elapsedMinutes: 0,
  });
  await writeInput(fixtureRoot, 'repair.json', { strategyHash: 'repair-v1' });

  await writeInput(fixtureRoot, 'preflight.json', preflight);
  expect(await main(['preflight', '--input', 'preflight.json'], io)).toBe(0);
  expect(await main(['record-validation', '--input', 'failed-validation.json'], io)).toBe(0);
  expect(await main(['request-repair', '--input', 'repair.json'], io)).toBe(0);
  expect(await readLoopState(fixtureRoot)).toMatchObject({ phase: 'repair', nextAction: 'validate', repairAttempts: 1 });
});

test('rejects a state symlink outside the fixture root without emitting state', async () => {
  const fixtureRoot = await createRoot();
  const externalRoot = await createRoot();
  const statePath = path.join(fixtureRoot, 'docs/engineering/loop-state.json');
  const externalStatePath = path.join(externalRoot, 'docs/engineering/loop-state.json');
  await rm(statePath);
  await symlink(externalStatePath, statePath);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: (line) => stdout.push(line), stderr: (line) => stderr.push(line) };

  expect(await main(['status'], io)).toBe(2);
  expect(stdout).toEqual([]);
  expect(stderr[0]).toContain('Invalid input');
});
