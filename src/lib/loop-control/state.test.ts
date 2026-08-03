import { mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DEFAULT_LIMITS, type LoopState } from '../../../scripts/loop-control/policy';
import { parseLoopState, readLoopState, writeLoopState } from '../../../scripts/loop-control/state';

const roots: string[] = [];

const validState = (changes: Partial<LoopState> = {}): LoopState => ({
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
  ...changes,
});

const createRoot = async (): Promise<string> => {
  const root = await mkdtemp(path.join(tmpdir(), 'loop-control-state-'));
  roots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('rejects unknown states and invalid limits', () => {
  expect(() => parseLoopState({ schemaVersion: 1, terminalState: 'done' })).toThrow('Invalid loop state');
  expect(() => parseLoopState(validState({ limits: { ...DEFAULT_LIMITS, maxIterations: 0 } }))).toThrow('Invalid loop state');
});

test('returns a detached, validated copy', () => {
  const state = validState({ validations: [{
    command: ['npm', 'test'],
    required: true,
    status: 'Passed',
    classification: 'introduced',
    repairable: false,
    summary: 'Focused checks passed.',
  }] });
  const parsed = parseLoopState(state);

  expect(parsed).toEqual(state);
  expect(parsed).not.toBe(state);
  expect(parsed.limits).not.toBe(DEFAULT_LIMITS);
  expect(parsed.validations[0].command).not.toBe(state.validations[0].command);
});

test.each(['DATABASE_URL=mysql://secret', 'token=abc123'])
  ('rejects sensitive state: %s', async (blocker) => {
    const root = await createRoot();
    await expect(writeLoopState(root, validState({ blocker }))).rejects.toThrow('Sensitive state value');
  });

test.each([
  ['s', 'k-', 'a'.repeat(26)].join(''),
  ['s', 'k-proj-', 'a'.repeat(26)].join(''),
  ['g', 'hp_', 'a'.repeat(26)].join(''),
  ['github', '_pat_', 'a'.repeat(26)].join(''),
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJl',
  ['AK', 'IA', 'IOSFODNN7EXAMPLE'].join(''),
])('rejects common raw secret formats without persisting them', async (blocker) => {
  const root = await createRoot();
  await expect(writeLoopState(root, validState({ blocker }))).rejects.toThrow('Sensitive state value');
});

test.each([
  ['validation summary', validState({ validations: [{
    command: ['npm', 'test'], required: true, status: 'Failed', classification: 'introduced', repairable: true, summary: 'failed\nraw output',
  }] })],
  ['blocker', validState({ blocker: 'blocked\u001B[31mraw output' })],
  ['review summary', validState({ review: { independent: true, approved: true, baseCommitIsAncestor: true, summary: 'reviewed\rraw output' } })],
])('rejects non-redacted %s', (_label, state) => {
  expect(() => parseLoopState(state)).toThrow('Invalid loop state');
});

test('rejects paths outside the repository root', async () => {
  const root = await createRoot();
  await expect(writeLoopState(root, validState(), '../loop-state.json')).rejects.toThrow('outside repository root');
});

test('rejects a repository symlink that would escape writes', async () => {
  const root = await createRoot();
  const external = await createRoot();
  await symlink(external, path.join(root, 'docs'));

  await expect(writeLoopState(root, validState())).rejects.toThrow('outside repository root');
  await expect(readdir(external)).resolves.toEqual([]);
});

test('rejects missing and inconsistent required fields', () => {
  const { branch: _branch, ...missingBranch } = validState();

  expect(() => parseLoopState(missingBranch)).toThrow('Invalid loop state');
  expect(() => parseLoopState(validState({ currentIteration: 52 }))).toThrow('Invalid loop state');
  expect(() => parseLoopState(validState({ deadlineAt: '2026-08-03T06:00:00.000Z' }))).toThrow('Invalid loop state');
});

test('rejects unknown state fields', () => {
  expect(() => parseLoopState({ ...validState(), unexpected: true })).toThrow('Invalid loop state');
});

test('an interrupted temp write leaves the prior state readable', async () => {
  const root = await createRoot();
  const state = validState();

  await writeLoopState(root, state);
  await writeFile(path.join(root, 'docs/engineering/loop-state.json.tmp'), '{broken', 'utf8');

  expect(await readLoopState(root)).toEqual(state);
});

test('writes only validated state and reads a detached copy', async () => {
  const root = await createRoot();
  const state = validState();

  await writeLoopState(root, state);
  const read = await readLoopState(root);

  expect(read).toEqual(state);
  expect(read).not.toBe(state);
  expect(read.limits).not.toBe(state.limits);
});
