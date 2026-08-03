import { lstat, mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  FailureClassification,
  Limits,
  LoopState,
  NextAction,
  Phase,
  PublicationEvidence,
  ReviewEvidence,
  TerminalState,
  ValidationRecord,
  ValidationStatus,
} from './policy';

const DEFAULT_STATE_PATH = 'docs/engineering/loop-state.json';
const MAX_TEXT_LENGTH = 1_000;
const MAX_IDENTIFIER_LENGTH = 255;

const TERMINAL_STATES = new Set<TerminalState>(['accepted', 'completed', 'blocked', 'unsafe', 'exhausted', 'escalated']);
const VALIDATION_STATUSES = new Set<ValidationStatus>(['Passed', 'Failed', 'Blocked by environment', 'Not applicable']);
const FAILURE_CLASSIFICATIONS = new Set<FailureClassification>(['introduced', 'pre-existing', 'environment-related', 'invalid-command', 'external-service', 'unknown']);
const PHASES = new Set<Phase>(['preflight', 'execute', 'validate', 'repair', 'review', 'publish', 'stopped']);
const NEXT_ACTIONS = new Set<NextAction>(['preflight', 'execute', 'validate', 'repair', 'review', 'publish', 'next-iteration', 'stop']);
const PULL_REQUEST_STATES = new Set<PublicationEvidence['pullRequestState']>(['OPEN', 'DRAFT', 'MERGED', 'CLOSED']);
const SENSITIVE_VALUE = /\b(?:database_url|token|secret|password|api[_-]?key|authorization|cookie)\s*[:=]|\b(?:mysql|mariadb|postgres(?:ql)?|mongodb(?:\+srv)?|redis):\/\/|\bbearer\s+|\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b|\bgh(?:p|o|u|s|r)_[A-Za-z0-9_]{16,}\b|\bgithub_pat_[A-Za-z0-9_]{16,}\b|\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b|\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/i;
const DISALLOWED_SUMMARY_CHARACTER = /[\r\n\x1B]|[^\x20-\x7E]/;

const LOOP_STATE_KEYS = [
  'schemaVersion', 'runId', 'targetIteration', 'latestCompletedIteration', 'currentIteration', 'branch', 'baseBranch', 'baseCommit',
  'phase', 'terminalState', 'nextAction', 'repairAttempts', 'iterationsAcceptedThisRun', 'startedAt', 'deadlineAt', 'limits',
  'acceptanceContractHash', 'lastRepairStrategyHash', 'lastFailure', 'validations', 'review', 'publication', 'blocker',
] as const;
const LIMIT_KEYS = ['maxRepairAttempts', 'maxIterations', 'maxElapsedMinutes', 'validationTimeoutMinutes', 'maxNetworkRetries', 'maxChildAgents', 'maxStackDepth', 'maxChangedLines', 'maxChangedFiles'] as const;
const VALIDATION_KEYS = ['command', 'required', 'status', 'classification', 'repairable', 'summary'] as const;
const REVIEW_KEYS = ['independent', 'approved', 'baseCommitIsAncestor', 'summary'] as const;
const PUBLICATION_KEYS = ['commit', 'pullRequestUrl', 'pullRequestState'] as const;

const invalidState = (): Error => new Error('Invalid loop state');

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
};

const stringValue = (value: unknown, maximum = MAX_IDENTIFIER_LENGTH): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw invalidState();
  return value;
};

const nullableString = (value: unknown, maximum = MAX_TEXT_LENGTH): string | null => value === null ? null : stringValue(value, maximum);

const summaryValue = (value: unknown): string => {
  const summary = stringValue(value, MAX_TEXT_LENGTH);
  if (DISALLOWED_SUMMARY_CHARACTER.test(summary)) throw invalidState();
  return summary;
};

const nullableSummaryValue = (value: unknown): string | null => value === null ? null : summaryValue(value);

const nonNegativeInteger = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw invalidState();
  return value as number;
};

const positiveInteger = (value: unknown): number => {
  const parsed = nonNegativeInteger(value);
  if (parsed === 0) throw invalidState();
  return parsed;
};

const enumValue = <T extends string>(value: unknown, values: Set<T>): T => {
  if (typeof value !== 'string' || !values.has(value as T)) throw invalidState();
  return value as T;
};

const nullableEnumValue = <T extends string>(value: unknown, values: Set<T>): T | null => value === null ? null : enumValue(value, values);

const booleanValue = (value: unknown): boolean => {
  if (typeof value !== 'boolean') throw invalidState();
  return value;
};

const timestampValue = (value: unknown): string => {
  const timestamp = stringValue(value);
  if (Number.isNaN(Date.parse(timestamp)) || new Date(timestamp).toISOString() !== timestamp) throw invalidState();
  return timestamp;
};

const parseLimits = (value: unknown): Limits => {
  if (!isRecord(value) || !hasExactKeys(value, LIMIT_KEYS)) throw invalidState();

  return {
    maxRepairAttempts: positiveInteger(value.maxRepairAttempts),
    maxIterations: positiveInteger(value.maxIterations),
    maxElapsedMinutes: positiveInteger(value.maxElapsedMinutes),
    validationTimeoutMinutes: positiveInteger(value.validationTimeoutMinutes),
    maxNetworkRetries: positiveInteger(value.maxNetworkRetries),
    maxChildAgents: positiveInteger(value.maxChildAgents),
    maxStackDepth: positiveInteger(value.maxStackDepth),
    maxChangedLines: positiveInteger(value.maxChangedLines),
    maxChangedFiles: positiveInteger(value.maxChangedFiles),
  };
};

const parseValidation = (value: unknown): ValidationRecord => {
  if (!isRecord(value) || !hasExactKeys(value, VALIDATION_KEYS) || !Array.isArray(value.command) || value.command.length === 0) throw invalidState();
  const command = value.command.map((argument) => stringValue(argument, MAX_TEXT_LENGTH));

  return {
    command,
    required: booleanValue(value.required),
    status: enumValue(value.status, VALIDATION_STATUSES),
    classification: enumValue(value.classification, FAILURE_CLASSIFICATIONS),
    repairable: booleanValue(value.repairable),
    summary: summaryValue(value.summary),
  };
};

const parseReview = (value: unknown): ReviewEvidence | null => {
  if (value === null) return null;
  if (!isRecord(value) || !hasExactKeys(value, REVIEW_KEYS)) throw invalidState();

  return {
    independent: booleanValue(value.independent),
    approved: booleanValue(value.approved),
    baseCommitIsAncestor: booleanValue(value.baseCommitIsAncestor),
    summary: summaryValue(value.summary),
  };
};

const parsePublication = (value: unknown): PublicationEvidence | null => {
  if (value === null) return null;
  if (!isRecord(value) || !hasExactKeys(value, PUBLICATION_KEYS)) throw invalidState();
  const pullRequestUrl = stringValue(value.pullRequestUrl);
  try {
    if (new URL(pullRequestUrl).protocol !== 'https:') throw invalidState();
  } catch {
    throw invalidState();
  }

  return {
    commit: stringValue(value.commit),
    pullRequestUrl,
    pullRequestState: enumValue(value.pullRequestState, PULL_REQUEST_STATES),
  };
};

const assertNoSensitiveValues = (value: unknown): void => {
  if (typeof value === 'string') {
    if (SENSITIVE_VALUE.test(value)) throw new Error('Sensitive state value');
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertNoSensitiveValues);
    return;
  }
  if (isRecord(value)) Object.values(value).forEach(assertNoSensitiveValues);
};

const resolveWithinRoot = (repoRoot: string, relativePath: string): string => {
  const root = path.resolve(repoRoot);
  const target = path.resolve(root, relativePath);
  if (path.isAbsolute(relativePath) || target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('State path is outside repository root');
  }
  return target;
};

const isWithinRoot = (target: string, root: string): boolean => target === root || target.startsWith(`${root}${path.sep}`);

const assertNoExistingSymlink = async (target: string): Promise<void> => {
  try {
    if ((await lstat(target)).isSymbolicLink()) throw new Error('State path is outside repository root');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
};

const prepareWriteTarget = async (repoRoot: string, target: string): Promise<void> => {
  const root = path.resolve(repoRoot);
  const parent = path.dirname(target);
  const relativeParent = path.relative(root, parent);
  let ancestor = root;

  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    ancestor = path.join(ancestor, segment);
    try {
      const metadata = await lstat(ancestor);
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error('State path is outside repository root');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break;
      throw error;
    }
  }

  await mkdir(parent, { recursive: true });
  const [realRoot, realParent] = await Promise.all([realpath(root), realpath(parent)]);
  if (!isWithinRoot(realParent, realRoot)) throw new Error('State path is outside repository root');
  await assertNoExistingSymlink(target);
  await assertNoExistingSymlink(`${target}.tmp`);
};

export const parseLoopState = (value: unknown): LoopState => {
  assertNoSensitiveValues(value);
  if (!isRecord(value) || !hasExactKeys(value, LOOP_STATE_KEYS)) throw invalidState();

  const schemaVersion = positiveInteger(value.schemaVersion);
  const targetIteration = positiveInteger(value.targetIteration);
  const latestCompletedIteration = nonNegativeInteger(value.latestCompletedIteration);
  const currentIteration = positiveInteger(value.currentIteration);
  const repairAttempts = nonNegativeInteger(value.repairAttempts);
  const iterationsAcceptedThisRun = nonNegativeInteger(value.iterationsAcceptedThisRun);
  const limits = parseLimits(value.limits);
  const startedAt = timestampValue(value.startedAt);
  const deadlineAt = timestampValue(value.deadlineAt);
  if (schemaVersion !== 1 || latestCompletedIteration >= currentIteration || currentIteration > targetIteration
    || repairAttempts > limits.maxRepairAttempts || iterationsAcceptedThisRun > limits.maxIterations
    || Date.parse(deadlineAt) <= Date.parse(startedAt)) throw invalidState();
  if (!Array.isArray(value.validations)) throw invalidState();

  return {
    schemaVersion,
    runId: stringValue(value.runId),
    targetIteration,
    latestCompletedIteration,
    currentIteration,
    branch: stringValue(value.branch),
    baseBranch: stringValue(value.baseBranch),
    baseCommit: stringValue(value.baseCommit),
    phase: enumValue(value.phase, PHASES),
    terminalState: nullableEnumValue(value.terminalState, TERMINAL_STATES),
    nextAction: enumValue(value.nextAction, NEXT_ACTIONS),
    repairAttempts,
    iterationsAcceptedThisRun,
    startedAt,
    deadlineAt,
    limits,
    acceptanceContractHash: stringValue(value.acceptanceContractHash),
    lastRepairStrategyHash: nullableString(value.lastRepairStrategyHash),
    lastFailure: nullableEnumValue(value.lastFailure, FAILURE_CLASSIFICATIONS),
    validations: value.validations.map(parseValidation),
    review: parseReview(value.review),
    publication: parsePublication(value.publication),
    blocker: nullableSummaryValue(value.blocker),
  };
};

export const readLoopState = async (repoRoot: string, relativePath = DEFAULT_STATE_PATH): Promise<LoopState> => {
  const target = resolveWithinRoot(repoRoot, relativePath);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(target, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw error;
    throw invalidState();
  }
  return parseLoopState(value);
};

export const writeLoopState = async (repoRoot: string, state: LoopState, relativePath = DEFAULT_STATE_PATH): Promise<void> => {
  const target = resolveWithinRoot(repoRoot, relativePath);
  assertNoSensitiveValues(state);
  const validated = parseLoopState(state);
  const temporary = `${target}.tmp`;

  await prepareWriteTarget(repoRoot, target);
  await writeFile(temporary, `${JSON.stringify(validated, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporary, target);
};
