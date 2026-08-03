import { execFile } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import {
  acceptIteration,
  authorizePublication,
  classifyCommand,
  evaluatePreflight,
  isCommitSha,
  isDirectGitHubPullRequestUrl,
  recordPublication,
  recordValidation,
  requestRepair,
  type Decision,
  type AuthorizationVerification,
  type LoopState,
  type PreflightEvidence,
  type PublicationEvidence,
  type PublicationReadiness,
  type PublicationVerification,
  type ReviewEvidence,
  type ValidationInput,
} from './loop-control/policy';
import { parseLoopState, readLoopState, withLoopStateLock, writeLoopState } from './loop-control/state';

export const EXIT = Object.freeze({ CONTINUE: 0, TERMINAL_SUCCESS: 0, BLOCKED: 1, INVALID_OR_UNSAFE: 2 });

export interface CliIo {
  readonly cwd: string;
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
  readonly verifyAuthorization?: (state: LoopState) => Promise<AuthorizationVerification>;
  readonly verifyPublication?: (state: LoopState, publication: PublicationEvidence) => Promise<PublicationVerification>;
}

type Command = 'init' | 'preflight' | 'record-validation' | 'request-repair' | 'record-review'
  | 'authorize-publication' | 'record-publication' | 'accept-iteration' | 'status' | 'classify-command';
type Options = Readonly<{ input: string | null; dryRun: boolean }>;

const DEFAULT_STATE_PATH = 'docs/engineering/loop-state.json';
const COMMANDS = new Set<Command>([
  'init', 'preflight', 'record-validation', 'request-repair', 'record-review',
  'authorize-publication', 'record-publication', 'accept-iteration', 'status', 'classify-command',
]);
const INPUT_COMMANDS = new Set<Command>([
  'init', 'preflight', 'record-validation', 'request-repair', 'record-review', 'authorize-publication', 'record-publication',
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
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run' && !dryRun) {
      dryRun = true;
      continue;
    }
    if (argument === '--input' && index + 1 < argv.length) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) invalid();
      if (input === null) input = value;
      else invalid();
      index += 1;
      continue;
    }
    invalid();
  }
  if (INPUT_COMMANDS.has(command) !== (input !== null)) invalid();
  return { input, dryRun };
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

const parsePublication = (value: unknown): PublicationEvidence => {
  const keys = ['commit', 'pullRequestUrl', 'pullRequestState'] as const;
  const input = record(value);
  if (!exactKeys(input, keys)) invalid();
  const commit = nonEmptyText(input.commit);
  const pullRequestUrl = nonEmptyText(input.pullRequestUrl);
  const pullRequestState = nonEmptyText(input.pullRequestState);
  if (!isCommitSha(commit) || !isDirectGitHubPullRequestUrl(pullRequestUrl)
    || !['OPEN', 'DRAFT'].includes(pullRequestState)) invalid();
  return {
    commit,
    pullRequestUrl,
    pullRequestState: pullRequestState as PublicationEvidence['pullRequestState'],
  };
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

const gitIsAncestor = (cwd: string, baseCommit: string, commit: string): Promise<boolean> => new Promise((resolve, reject) => {
  execFile('git', ['merge-base', '--is-ancestor', baseCommit, commit], { cwd }, (error) => {
    if (!error) resolve(true);
    else if ((error as NodeJS.ErrnoException & { code?: number }).code === 1) resolve(false);
    else reject(error);
  });
});

const execOutput = (cwd: string, file: string, args: readonly string[]): Promise<string> => new Promise((resolve, reject) => {
  execFile(file, [...args], { cwd }, (error, stdout) => error ? reject(error) : resolve(stdout.trim()));
});

const repositorySlug = (remote: string): string => {
  const match = remote.match(/^(?:git@github\.com:|https:\/\/github\.com\/)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/);
  const slug = match?.[1];
  if (typeof slug !== 'string') throw new Error('Invalid repository remote');
  return slug;
};

const verifyAuthorizationLive = async (cwd: string, state: LoopState): Promise<AuthorizationVerification> => {
  const [currentCommit, branchMatches, headDescendsFromBase] = await Promise.all([
    execOutput(cwd, 'git', ['rev-parse', 'HEAD']),
    execOutput(cwd, 'git', ['branch', '--show-current']).then((branch) => branch === state.branch),
    gitIsAncestor(cwd, state.baseCommit, 'HEAD'),
  ]);
  return { currentCommit, branchMatches, headDescendsFromBase, checkedAt: new Date().toISOString() };
};

const verifyPublicationLive = async (
  cwd: string,
  state: LoopState,
  publication: PublicationEvidence,
): Promise<PublicationVerification> => {
  const [currentCommit, currentBranch, origin, baseCommitIsAncestor] = await Promise.all([
    execOutput(cwd, 'git', ['rev-parse', 'HEAD']),
    execOutput(cwd, 'git', ['branch', '--show-current']),
    execOutput(cwd, 'git', ['config', '--get', 'remote.origin.url']),
    gitIsAncestor(cwd, state.baseCommit, publication.commit),
  ]);
  const slug = repositorySlug(origin);
  const pullRequestUrl = new URL(publication.pullRequestUrl);
  const repositoryMatches = pullRequestUrl.pathname.toLowerCase().startsWith(`/${slug.toLowerCase()}/pull/`);
  const live = JSON.parse(await execOutput(cwd, 'gh', [
    'pr', 'view', publication.pullRequestUrl, '--repo', slug,
    '--json', 'url,state,isDraft,headRefName,headRefOid,baseRefName',
  ])) as Record<string, unknown>;
  const expectedState = publication.pullRequestState === 'DRAFT'
    ? live.state === 'OPEN' && live.isDraft === true
    : live.state === 'OPEN' && live.isDraft === false;
  const livePullRequestMatches = live.url === publication.pullRequestUrl && expectedState
    && live.headRefName === state.branch && live.headRefOid === publication.commit && live.baseRefName === state.baseBranch;
  return {
    baseCommitIsAncestor,
    commitIsHead: publication.commit === currentCommit,
    branchMatches: currentBranch === state.branch,
    repositoryMatches,
    livePullRequestMatches,
    checkedAt: new Date().toISOString(),
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
    const input = options.input === null ? null : await readJsonInput(root, options.input);

    if (command === 'init') {
      const state = parseLoopState(input);
      if (state.phase !== 'preflight' || state.terminalState !== null || state.nextAction !== 'preflight'
        || state.validations.length > 0 || state.review !== null || state.publication !== null || state.blocker !== null) invalid();
      try {
        await lstat(path.join(root, DEFAULT_STATE_PATH));
        invalid();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      if (!options.dryRun) {
        await withLoopStateLock(root, async () => {
          try {
            await lstat(path.join(root, DEFAULT_STATE_PATH));
            invalid();
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
          await writeLoopState(root, state);
        });
      }
      return emitDecision(io, decisionFor(state));
    }

    if (command === 'status') {
      await resolveExistingPathWithinRoot(root, DEFAULT_STATE_PATH);
      return emitDecision(io, decisionFor(await readLoopState(root)));
    }

    const transition = async (): Promise<number> => {
      await resolveExistingPathWithinRoot(root, DEFAULT_STATE_PATH);
      const state = await readLoopState(root);
      let decision: Decision = decisionFor(state);
      if (command === 'preflight') decision = evaluatePreflight(state, parsePreflight(input));
      else if (command === 'record-validation') decision = recordValidation(state, parseValidation(input));
      else if (command === 'request-repair') decision = requestRepair(state, parseRepairStrategy(input));
      else if (command === 'record-review') decision = recordReview(state, parseReview(input));
      else if (command === 'authorize-publication') {
        const verification = await (io.verifyAuthorization ?? ((current) => verifyAuthorizationLive(root, current)))(state);
        decision = authorizePublication(state, parsePublicationReadiness(input), verification);
      }
      else if (command === 'record-publication') {
        const publication = parsePublication(input);
        const verification = await (io.verifyPublication ?? ((current, evidence) => verifyPublicationLive(root, current, evidence)))(state, publication);
        decision = recordPublication(state, publication, verification);
      } else if (command === 'accept-iteration') {
        const publication = state.publication;
        if (publication === null) throw new Error('Invalid input');
        const verification = await (io.verifyPublication ?? ((current, evidence) => verifyPublicationLive(root, current, evidence)))(state, publication);
        decision = acceptIteration(state, verification);
      }
      else invalid();

      if (!options.dryRun) await writeLoopState(root, decision.state);
      return emitDecision(io, decision);
    };

    return await (options.dryRun ? transition() : withLoopStateLock(root, transition));
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
