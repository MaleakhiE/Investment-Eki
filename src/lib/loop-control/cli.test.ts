import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { main, type CliIo } from '../../../scripts/loop-control';
import { DEFAULT_LIMITS, type LoopState } from '../../../scripts/loop-control/policy';
import { readLoopState, writeLoopState } from '../../../scripts/loop-control/state';

const roots: string[] = [];
const fail = (line: string): never => { throw new Error(`Unexpected output: ${line}`); };

const validState = (): LoopState => ({
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

const createRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), 'loop-control-cli-'));
  roots.push(root);
  await writeLoopState(root, validState());
  return root;
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

test('rejects an input path outside the fixture root without reading state', async () => {
  const fixtureRoot = await createRoot();
  const stderr: string[] = [];
  const io: CliIo = { cwd: fixtureRoot, stdout: fail, stderr: (line) => stderr.push(line) };

  expect(await main(['preflight', '--input', '../preflight.json'], io)).toBe(2);
  expect(stderr[0]).toContain('Invalid input');
  expect(await readLoopState(fixtureRoot)).toEqual(validState());
});
