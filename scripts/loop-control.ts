import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import {
  acceptIteration,
  authorizePublication,
  classifyCommand,
  evaluatePreflight,
  recordValidation,
  requestRepair,
  type Decision,
  type LoopState,
  type PreflightEvidence,
  type PublicationReadiness,
  type ReviewEvidence,
  type ValidationInput,
} from './loop-control/policy';
import { parseLoopState, readLoopState, writeLoopState } from './loop-control/state';

export const EXIT = Object.freeze({ CONTINUE: 0, TERMINAL_SUCCESS: 0, BLOCKED: 1, INVALID_OR_UNSAFE: 2 });

export interface CliIo {
  readonly cwd: string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

type Command = 'init' | 'preflight' | 'record-validation' | 'request-repair' | 'record-review'
  | 'authorize-publication' | 'accept-iteration' | 'status' | 'classify-command';
type Options = Readonly<{ input: string | null; state: string; dryRun: boolean }>;

const DEFAULT_STATE_PATH = 'docs/engineering/loop-state.json';
const COMMANDS = new Set<Command>([
  'init', 'preflight', 'record-validation', 'request-repair', 'record-review',
  'authorize-publication', 'accept-iteration', 'status', 'classify-command',
]);
const INPUT_COMMANDS = new Set<Command>([
  'init', 'preflight', 'record-validation', 'request-repair', 'record-review', 'authorize-publication',
]);
const VALIDATION_STATUSES = new Set(['Passed', 'Failed', 'Blocked by environment', 'Not applicable']);
const FAILURE_CLASSIFICATIONS = new Set(['introduced', 'pre-existing', 'environment-related', 'invalid-command', 'external-service', 'unknown']);
const PRINTABLE_TEXT = /^[\x20-\x7E]+$/;

const invalid = (): never => { throw new Error('Invalid input'); };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
};
const nonEmptyText = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim() || value.length > 1_000 || !PRINTABLE_TEXT.test(value)) invalid();
  return value as string;
};
const boolean = (value: unknown): boolean => {
  if (typeof value !== 'boolean') invalid();
  return value as boolean;
};
const nonNegativeInteger = (value: unknown): number => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalid();
  return value as number;
};
const record = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) invalid();
  return value as Record<string, unknown>;
};

const parseOptions = (command: Command, argv: readonly string[]): Options => {
  let input: string | null = null;
  let state = DEFAULT_STATE_PATH;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run' && !dryRun) {
      dryRun = true;
      continue;
    }
    if ((argument === '--input' || argument === '--state') && index + 1 < argv.length) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) invalid();
      if (argument === '--input' && input === null) input = value;
      else if (argument === '--state' && state === DEFAULT_STATE_PATH) state = value;
      else invalid();
      index += 1;
      continue;
    }
    invalid();
  }
  if (INPUT_COMMANDS.has(command) !== (input !== null)) invalid();
  return { input, state, dryRun };
};

const resolveWithinRoot = (root: string, relativePath: string): string => {
  if (!relativePath || path.isAbsolute(relativePath)) invalid();
  const target = path.resolve(root, relativePath);
  if (target === root || !target.startsWith(`${root}${path.sep}`)) invalid();
  return target;
};

const resolveExistingPathWithinRoot = async (root: string, relativePath: string): Promise<string> => {
  const target = resolveWithinRoot(root, relativePath);
  if ((await lstat(target)).isSymbolicLink()) invalid();
  const resolvedTarget = await realpath(target);
  if (!resolvedTarget.startsWith(`${root}${path.sep}`)) invalid();
  return resolvedTarget;
};

const readJsonInput = async (root: string, relativePath: string): Promise<unknown> => {
  const resolvedTarget = await resolveExistingPathWithinRoot(root, relativePath);
  try {
    return JSON.parse(await readFile(resolvedTarget, 'utf8'));
  } catch {
    invalid();
  }
};

const parsePreflight = (value: unknown): PreflightEvidence => {
  const keys = [
    'worktreeInventoried', 'detached', 'fetchSucceeded', 'baseCommitIsAncestor', 'stateMatchesRepository',
    'duplicateCompletedIteration', 'targetAuthorized', 'headMatchesOriginMain', 'secretsRisk', 'productionTarget',
    'unsafeMigration', 'ownerDecisionRequired', 'elapsedMinutes', 'networkRetries', 'childAgents', 'stackDepth',
    'changedLines', 'changedFiles',
  ] as const;
  const input = record(value);
  if (!exactKeys(input, keys)) invalid();
  return {
    worktreeInventoried: boolean(input.worktreeInventoried), detached: boolean(input.detached), fetchSucceeded: boolean(input.fetchSucceeded),
    baseCommitIsAncestor: boolean(input.baseCommitIsAncestor), stateMatchesRepository: boolean(input.stateMatchesRepository),
    duplicateCompletedIteration: boolean(input.duplicateCompletedIteration), targetAuthorized: boolean(input.targetAuthorized),
    headMatchesOriginMain: boolean(input.headMatchesOriginMain), secretsRisk: boolean(input.secretsRisk),
    productionTarget: boolean(input.productionTarget), unsafeMigration: boolean(input.unsafeMigration), ownerDecisionRequired: boolean(input.ownerDecisionRequired),
    elapsedMinutes: nonNegativeInteger(input.elapsedMinutes), networkRetries: nonNegativeInteger(input.networkRetries),
    childAgents: nonNegativeInteger(input.childAgents), stackDepth: nonNegativeInteger(input.stackDepth),
    changedLines: nonNegativeInteger(input.changedLines), changedFiles: nonNegativeInteger(input.changedFiles),
  };
};

const parseValidation = (value: unknown): ValidationInput => {
  const keys = ['command', 'required', 'status', 'classification', 'repairable', 'summary', 'elapsedMinutes'] as const;
  const input = record(value);
  if (!exactKeys(input, keys)) invalid();
  const command = Array.isArray(input.command) ? input.command : invalid();
  if (command.length === 0) invalid();
  const status = nonEmptyText(input.status);
  const classification = nonEmptyText(input.classification);
  if (!VALIDATION_STATUSES.has(status) || !FAILURE_CLASSIFICATIONS.has(classification)) invalid();
  return {
    command: command.map(nonEmptyText), required: boolean(input.required), status: status as ValidationInput['status'],
    classification: classification as ValidationInput['classification'], repairable: boolean(input.repairable),
    summary: nonEmptyText(input.summary), elapsedMinutes: nonNegativeInteger(input.elapsedMinutes),
  };
};

const parseReview = (value: unknown): ReviewEvidence => {
  const keys = ['independent', 'approved', 'baseCommitIsAncestor', 'summary'] as const;
  const input = record(value);
  if (!exactKeys(input, keys)) invalid();
  return {
    independent: boolean(input.independent), approved: boolean(input.approved),
    baseCommitIsAncestor: boolean(input.baseCommitIsAncestor), summary: nonEmptyText(input.summary),
  };
};

const parseRepairStrategy = (value: unknown): string => {
  const input = record(value);
  if (!exactKeys(input, ['strategyHash'])) invalid();
  return nonEmptyText(input.strategyHash);
};

const parsePublicationReadiness = (value: unknown): PublicationReadiness => {
  const keys = ['requiredValidationsPassed', 'noUnresolvedIntroducedFailure', 'review'] as const;
  const input = record(value);
  if (!exactKeys(input, keys) || (input.review !== null && !isRecord(input.review))) invalid();
  return {
    requiredValidationsPassed: boolean(input.requiredValidationsPassed),
    noUnresolvedIntroducedFailure: boolean(input.noUnresolvedIntroducedFailure),
    review: input.review === null ? null : parseReview(input.review),
  };
};

const decisionFor = (state: LoopState): Decision => ({
  state,
  terminalState: state.terminalState,
  nextAction: state.nextAction,
  reason: state.blocker,
});

const recordReview = (state: LoopState, review: ReviewEvidence): Decision => {
  if (state.terminalState !== null) return decisionFor(state);
  if (state.phase !== 'review' || state.nextAction !== 'review') invalid();
  const nextState: LoopState = { ...state, review: { ...review }, limits: { ...state.limits }, validations: state.validations.map((validation) => ({ ...validation, command: [...validation.command] })) };
  return decisionFor(nextState);
};

const exitFor = (decision: Decision): number => {
  if (decision.terminalState === 'unsafe') return EXIT.INVALID_OR_UNSAFE;
  if (decision.terminalState === 'blocked' || decision.terminalState === 'exhausted' || decision.terminalState === 'escalated') return EXIT.BLOCKED;
  return EXIT.CONTINUE;
};

const emitDecision = (io: CliIo, decision: Decision): number => {
  io.stdout(JSON.stringify(decision));
  return exitFor(decision);
};

export const main = async (argv: readonly string[], io: CliIo): Promise<number> => {
  try {
    const [commandName, ...argumentsAfterCommand] = argv;
    if (!COMMANDS.has(commandName as Command)) invalid();
    const command = commandName as Command;

    if (command === 'classify-command') {
      if (argumentsAfterCommand[0] !== '--' || argumentsAfterCommand.length < 2) invalid();
      const classification = classifyCommand(argumentsAfterCommand.slice(1));
      io.stdout(JSON.stringify(classification));
      return classification.allowed ? EXIT.CONTINUE : EXIT.INVALID_OR_UNSAFE;
    }

    const options = parseOptions(command, argumentsAfterCommand);
    const root = await realpath(path.resolve(io.cwd));
    resolveWithinRoot(root, options.state);
    const input = options.input === null ? null : await readJsonInput(root, options.input);

    if (command === 'init') {
      const state = parseLoopState(input);
      if (!options.dryRun) await writeLoopState(root, state, options.state);
      return emitDecision(io, decisionFor(state));
    }

    await resolveExistingPathWithinRoot(root, options.state);
    const state = await readLoopState(root, options.state);
    let decision: Decision = decisionFor(state);
    if (command === 'preflight') decision = evaluatePreflight(state, parsePreflight(input));
    else if (command === 'record-validation') decision = recordValidation(state, parseValidation(input));
    else if (command === 'request-repair') decision = requestRepair(state, parseRepairStrategy(input));
    else if (command === 'record-review') decision = recordReview(state, parseReview(input));
    else if (command === 'authorize-publication') decision = authorizePublication(state, parsePublicationReadiness(input));
    else if (command === 'accept-iteration') decision = acceptIteration(state);
    else if (command === 'status') decision = decisionFor(state);
    else invalid();

    if (!options.dryRun && command !== 'status') await writeLoopState(root, decision.state, options.state);
    return emitDecision(io, decision);
  } catch {
    io.stderr('Invalid input.');
    return EXIT.INVALID_OR_UNSAFE;
  }
};

const isDirectExecution = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === path.resolve(process.cwd(), 'scripts/loop-control.ts');

if (isDirectExecution) {
  void main(process.argv.slice(2), {
    cwd: process.cwd(),
    stdout: (line) => process.stdout.write(`${line}\n`),
    stderr: (line) => process.stderr.write(`${line}\n`),
  }).then((exitCode) => { process.exitCode = exitCode; });
}
