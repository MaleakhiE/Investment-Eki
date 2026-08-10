export type TerminalState = 'accepted' | 'completed' | 'blocked' | 'unsafe' | 'exhausted' | 'escalated';
export type ValidationStatus = 'Passed' | 'Failed' | 'Blocked by environment' | 'Not applicable';
export type FailureClassification = 'introduced' | 'pre-existing' | 'environment-related' | 'invalid-command' | 'external-service' | 'unknown';
export type Phase = 'preflight' | 'execute' | 'validate' | 'repair' | 'review' | 'publish' | 'stopped';
export type NextAction = 'preflight' | 'execute' | 'validate' | 'repair' | 'review' | 'publish' | 'next-iteration' | 'stop';

export type Limits = Readonly<{
  maxRepairAttempts: number;
  maxIterations: number;
  maxElapsedMinutes: number;
  validationTimeoutMinutes: number;
  maxNetworkRetries: number;
  maxChildAgents: number;
  maxStackDepth: number;
  maxChangedLines: number;
  maxChangedFiles: number;
}>;

export const DEFAULT_LIMITS: Limits = Object.freeze({
  maxRepairAttempts: 3,
  maxIterations: 18,
  maxElapsedMinutes: 120,
  validationTimeoutMinutes: 30,
  maxNetworkRetries: 2,
  maxChildAgents: 6,
  maxStackDepth: 1,
  maxChangedLines: 2_000,
  maxChangedFiles: 30,
});

export const ACCEPTANCE_CONTRACT_HASH = '77bc377a2d8a3f0f9d06208d25bd0a589d98a2c25547981dd5650037ebfa5c7d';

export const REQUIRED_VALIDATION_COMMANDS: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(['npx', 'prisma', 'format']),
  Object.freeze(['npx', 'prisma', 'validate']),
  Object.freeze(['npx', 'tsc', '--noEmit']),
  Object.freeze(['npm', 'run', 'lint']),
  Object.freeze(['npm', 'test', '--', '--runInBand']),
  Object.freeze(['npm', 'run', 'build']),
  Object.freeze(['npm', 'run', 'db:status']),
  Object.freeze(['npm', 'run', 'db:verify']),
  Object.freeze(['git', 'diff', '--check']),
  Object.freeze(['npm', 'audit', '--omit=dev', '--audit-level=critical']),
]);

export type ValidationRecord = Readonly<{
  command: readonly string[];
  required: boolean;
  status: ValidationStatus;
  classification: FailureClassification;
  repairable: boolean;
  summary: string;
}>;

export type ReviewEvidence = Readonly<{
  independent: boolean;
  approved: boolean;
  baseCommitIsAncestor: boolean;
  summary: string;
}>;

export type PublicationEvidence = Readonly<{
  commit: string;
  pullRequestUrl: string;
  pullRequestState: 'OPEN' | 'DRAFT' | 'MERGED' | 'CLOSED';
}>;

export type LoopState = Readonly<{
  schemaVersion: number;
  runId: string;
  targetIteration: number;
  latestCompletedIteration: number;
  currentIteration: number;
  branch: string;
  baseBranch: string;
  baseCommit: string;
  phase: Phase;
  terminalState: TerminalState | null;
  nextAction: NextAction;
  repairAttempts: number;
  iterationsAcceptedThisRun: number;
  startedAt: string;
  deadlineAt: string;
  limits: Limits;
  acceptanceContractHash: string;
  lastRepairStrategyHash: string | null;
  lastFailure: FailureClassification | null;
  validations: readonly ValidationRecord[];
  review: ReviewEvidence | null;
  authorizedCommit: string | null;
  publication: PublicationEvidence | null;
  blocker: string | null;
}>;

export type PreflightEvidence = Readonly<{
  worktreeInventoried: boolean;
  detached: boolean;
  fetchSucceeded: boolean;
  baseCommitIsAncestor: boolean;
  stateMatchesRepository: boolean;
  duplicateCompletedIteration: boolean;
  targetAuthorized: boolean;
  headMatchesOriginMain: boolean;
  secretsRisk: boolean;
  productionTarget: boolean;
  unsafeMigration: boolean;
  ownerDecisionRequired: boolean;
  elapsedMinutes: number;
  networkRetries: number;
  childAgents: number;
  stackDepth: number;
  changedLines: number;
  changedFiles: number;
}>;

export type ValidationInput = ValidationRecord & Readonly<{ elapsedMinutes?: number }>;

export type PublicationReadiness = Readonly<{
  requiredValidationsPassed: boolean;
  noUnresolvedIntroducedFailure: boolean;
  review: ReviewEvidence | null;
}>;

export type AuthorizationVerification = Readonly<{
  currentCommit: string;
  branchMatches: boolean;
  headDescendsFromBase: boolean;
  checkedAt: string;
}>;

export type PublicationVerification = Readonly<{
  baseCommitIsAncestor: boolean;
  commitIsHead: boolean;
  branchMatches: boolean;
  repositoryMatches: boolean;
  livePullRequestMatches: boolean;
  checkedAt: string;
}>;

export type CommandClassification = Readonly<{ allowed: boolean; reason: string | null }>;
export type Decision = Readonly<{
  state: LoopState;
  terminalState: TerminalState | null;
  nextAction: NextAction;
  reason: string | null;
}>;

const copyState = (state: LoopState, changes: Partial<LoopState> = {}): LoopState => ({
  ...state,
  ...changes,
  limits: { ...state.limits },
  validations: (changes.validations ?? state.validations).map((validation) => ({
    ...validation,
    command: [...validation.command],
  })),
  review: changes.review === undefined ? (state.review ? { ...state.review } : null) : (changes.review ? { ...changes.review } : null),
  publication: changes.publication === undefined
    ? (state.publication ? { ...state.publication } : null)
    : (changes.publication ? { ...changes.publication } : null),
  authorizedCommit: changes.authorizedCommit === undefined ? state.authorizedCommit : changes.authorizedCommit,
});

const decide = (
  state: LoopState,
  terminalState: TerminalState | null,
  nextAction: NextAction,
  reason: string | null,
  changes: Partial<LoopState> = {},
): Decision => {
  const isAcceptedTransition = terminalState === 'accepted' && nextAction === 'next-iteration';
  const stopped = terminalState !== null && !isAcceptedTransition;
  const nextState = copyState(state, {
    ...changes,
    phase: stopped ? 'stopped' : changes.phase ?? state.phase,
    terminalState,
    nextAction: stopped ? 'stop' : nextAction,
    blocker: stopped ? reason : changes.blocker ?? null,
  });

  return { state: nextState, terminalState, nextAction: nextState.nextAction, reason };
};

const stopped = (state: LoopState): Decision | null => state.terminalState === null
  ? null
  : {
    state: copyState(state),
    terminalState: state.terminalState,
    nextAction: state.nextAction,
    reason: state.blocker,
  };

export const isCommitSha = (value: string): boolean => /^[0-9a-f]{40}$/i.test(value);

export const isDirectGitHubPullRequestUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' && url.port === ''
      && url.username === '' && url.password === '' && url.search === '' && url.hash === ''
      && /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/[1-9]\d*$/.test(url.pathname);
  } catch {
    return false;
  }
};

const commandKey = (command: readonly string[]): string => JSON.stringify(command);
const commandsEqual = (left: readonly string[], right: readonly string[]): boolean => commandKey(left) === commandKey(right);

const latestValidations = (state: LoopState): ReadonlyMap<string, ValidationRecord> => {
  const latest = new Map<string, ValidationRecord>();
  state.validations.forEach((validation) => latest.set(commandKey(validation.command), validation));
  return latest;
};

export const hasPassedAcceptanceContract = (state: LoopState): boolean => {
  if (state.acceptanceContractHash !== ACCEPTANCE_CONTRACT_HASH || state.lastFailure !== null) return false;
  const latest = latestValidations(state);
  const unresolvedIntroducedFailure = [...latest.values()].some(
    (validation) => validation.status === 'Failed' && validation.classification === 'introduced',
  );
  return !unresolvedIntroducedFailure && REQUIRED_VALIDATION_COMMANDS.every((command) => {
    const validation = latest.get(commandKey(command));
    return validation?.required === true && validation.status === 'Passed';
  });
};

const exhausted = (state: LoopState, evidence: PreflightEvidence): string | null => {
  if (state.iterationsAcceptedThisRun >= state.limits.maxIterations) return 'Iteration budget exhausted.';
  if (evidence.elapsedMinutes >= state.limits.maxElapsedMinutes) return 'Elapsed-time budget exhausted.';
  if (evidence.networkRetries >= state.limits.maxNetworkRetries) return 'Network-retry budget exhausted.';
  if (evidence.childAgents >= state.limits.maxChildAgents) return 'Child-agent budget exhausted.';
  if (evidence.stackDepth >= state.limits.maxStackDepth) return 'Stack-depth budget exhausted.';
  if (evidence.changedLines >= state.limits.maxChangedLines) return 'Changed-line budget exhausted.';
  if (evidence.changedFiles >= state.limits.maxChangedFiles) return 'Changed-file budget exhausted.';
  return null;
};

export const evaluatePreflight = (state: LoopState, evidence: PreflightEvidence): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (evidence.secretsRisk || evidence.productionTarget || evidence.unsafeMigration) {
    return decide(state, 'unsafe', 'stop', 'Unsafe secret, production, or migration evidence.');
  }
  if (evidence.ownerDecisionRequired) return decide(state, 'escalated', 'stop', 'Owner decision required.');
  const exhaustedReason = exhausted(state, evidence);
  if (exhaustedReason) return decide(state, 'exhausted', 'stop', exhaustedReason);
  if (!evidence.worktreeInventoried || evidence.detached || !evidence.fetchSucceeded || !evidence.baseCommitIsAncestor
    || !evidence.stateMatchesRepository || evidence.duplicateCompletedIteration || !evidence.targetAuthorized
    || (state.branch === state.baseBranch && !evidence.headMatchesOriginMain)) {
    return decide(state, 'blocked', 'stop', 'Preflight evidence is stale, missing, or ambiguous.');
  }
  return decide(state, null, 'execute', null, { phase: 'execute' });
};

export const recordValidation = (state: LoopState, validation: ValidationInput): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  const validTransition = (state.phase === 'execute' && state.nextAction === 'execute')
    || (state.phase === 'repair' && state.nextAction === 'validate')
    || (state.phase === 'review' && state.nextAction === 'review');
  if (!validTransition) return decide(state, 'blocked', 'stop', 'Validation is not allowed in the current phase.');
  if (!classifyCommand(validation.command).allowed) {
    return decide(state, 'unsafe', 'stop', 'Validation command is prohibited.');
  }
  const contractCommand = REQUIRED_VALIDATION_COMMANDS.some((command) => commandsEqual(command, validation.command));
  if (contractCommand && !validation.required) {
    return decide(state, 'blocked', 'stop', 'Acceptance-contract validation cannot be optional.');
  }
  if ((validation.elapsedMinutes ?? 0) >= state.limits.validationTimeoutMinutes) {
    return decide(state, 'exhausted', 'stop', 'Validation-time budget exhausted.');
  }

  const stored: ValidationRecord = {
    command: [...validation.command],
    required: validation.required,
    status: validation.status,
    classification: validation.classification,
    repairable: validation.repairable,
    summary: validation.summary,
  };
  const validations = [...state.validations, stored];
  const changes = { validations, lastFailure: validation.status === 'Failed' ? validation.classification : null, review: null };

  if (validation.status === 'Failed') {
    if (validation.classification === 'introduced' && validation.repairable) {
      return decide(state, null, 'repair', null, { ...changes, phase: 'validate' });
    }
    return decide(state, 'blocked', 'stop', 'Validation failure cannot be repaired automatically.', changes);
  }
  return decide(state, null, 'review', null, { ...changes, phase: 'review' });
};

export const requestRepair = (state: LoopState, strategyHash: string): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (state.phase !== 'validate' || state.lastFailure !== 'introduced' || state.validations.at(-1)?.repairable !== true) {
    return decide(state, 'blocked', 'stop', 'No repairable introduced failure is recorded.');
  }
  if (!strategyHash.trim() || strategyHash === state.lastRepairStrategyHash) {
    return decide(state, 'blocked', 'stop', 'Repair strategy must be non-empty and changed.');
  }
  if (state.repairAttempts >= state.limits.maxRepairAttempts) {
    return decide(state, 'exhausted', 'stop', 'Repair-attempt budget exhausted.');
  }
  return decide(state, null, 'validate', null, {
    phase: 'repair',
    repairAttempts: state.repairAttempts + 1,
    lastRepairStrategyHash: strategyHash,
  });
};

const reviewMatches = (left: ReviewEvidence | null, right: ReviewEvidence | null): boolean => left === null || right === null
  ? left === right
  : left.independent === right.independent && left.approved === right.approved
    && left.baseCommitIsAncestor === right.baseCommitIsAncestor && left.summary === right.summary;

const isBeforeDeadline = (state: LoopState, checkedAt: string): boolean => {
  const timestamp = Date.parse(checkedAt);
  return !Number.isNaN(timestamp) && timestamp <= Date.parse(state.deadlineAt);
};

export const authorizePublication = (
  state: LoopState,
  readiness: PublicationReadiness,
  verification: AuthorizationVerification,
): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (!isBeforeDeadline(state, verification.checkedAt)) {
    return decide(state, 'exhausted', 'stop', 'Publication deadline expired.');
  }
  const validationsPassed = hasPassedAcceptanceContract(state);
  const noUnresolvedIntroducedFailure = state.lastFailure === null
    && ![...latestValidations(state).values()].some(
      (validation) => validation.status === 'Failed' && validation.classification === 'introduced',
    );
  const inputMatchesDurableState = readiness.requiredValidationsPassed === validationsPassed
    && readiness.noUnresolvedIntroducedFailure === noUnresolvedIntroducedFailure
    && reviewMatches(readiness.review, state.review);
  if (!inputMatchesDurableState || state.phase !== 'review' || state.nextAction !== 'review' || !validationsPassed
    || !noUnresolvedIntroducedFailure
    || !state.review?.independent || !state.review.approved || !state.review.baseCommitIsAncestor
    || !isCommitSha(verification.currentCommit) || verification.currentCommit === state.baseCommit
    || !verification.branchMatches || !verification.headDescendsFromBase
    || state.iterationsAcceptedThisRun >= state.limits.maxIterations
    || state.publication !== null) {
    return decide(state, 'blocked', 'stop', 'Publication evidence is incomplete.');
  }
  return decide(state, null, 'publish', null, { phase: 'publish', authorizedCommit: verification.currentCommit });
};

export const recordPublication = (
  state: LoopState,
  publication: PublicationEvidence,
  verification: PublicationVerification,
): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (!isBeforeDeadline(state, verification.checkedAt)) {
    return decide(state, 'exhausted', 'stop', 'Publication deadline expired.');
  }
  if (state.phase !== 'publish' || state.nextAction !== 'publish' || state.publication !== null
    || state.authorizedCommit !== publication.commit
    || !state.review?.independent || !state.review.approved || !state.review.baseCommitIsAncestor
    || !hasPassedAcceptanceContract(state) || !verification.baseCommitIsAncestor || !verification.commitIsHead
    || !verification.branchMatches || !verification.repositoryMatches || !verification.livePullRequestMatches
    || !isCommitSha(publication.commit) || publication.commit === state.baseCommit
    || !isDirectGitHubPullRequestUrl(publication.pullRequestUrl)
    || !['OPEN', 'DRAFT'].includes(publication.pullRequestState)) {
    return decide(state, 'blocked', 'stop', 'Publication record is invalid.');
  }
  return decide(state, null, 'publish', null, { publication });
};

export const reconcileMergedPublication = (
  state: LoopState,
  publication: PublicationEvidence,
  verification: PublicationVerification,
): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (state.phase !== 'publish' || state.nextAction !== 'publish' || !state.publication
    || state.publication.commit !== publication.commit || state.publication.pullRequestUrl !== publication.pullRequestUrl
    || publication.pullRequestState !== 'MERGED' || state.authorizedCommit !== publication.commit
    || !verification.baseCommitIsAncestor || !verification.commitIsHead || !verification.branchMatches
    || !verification.repositoryMatches || !verification.livePullRequestMatches) {
    return decide(state, 'blocked', 'stop', 'Merged publication reconciliation is invalid.');
  }
  return decide(state, null, 'publish', null, { publication });
};

export const acceptIteration = (state: LoopState, verification: PublicationVerification): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (!isBeforeDeadline(state, verification.checkedAt)) return decide(state, 'exhausted', 'stop', 'Publication deadline expired.');
  if (state.phase !== 'publish' || state.nextAction !== 'publish' || !hasPassedAcceptanceContract(state) || !state.review?.independent
    || !state.review.approved || !state.review.baseCommitIsAncestor
    || !state.publication || state.publication.commit !== state.authorizedCommit
    || !isCommitSha(state.publication.commit)
    || !verification.baseCommitIsAncestor || !verification.commitIsHead || !verification.branchMatches
    || !verification.repositoryMatches || !verification.livePullRequestMatches
    || !isDirectGitHubPullRequestUrl(state.publication.pullRequestUrl)
    || !['OPEN', 'DRAFT', 'MERGED'].includes(state.publication.pullRequestState)) {
    return decide(state, 'blocked', 'stop', 'Acceptance evidence is incomplete.');
  }
  const terminalState: TerminalState = state.currentIteration >= state.targetIteration ? 'completed' : 'accepted';
  const nextAction: NextAction = terminalState === 'completed' ? 'stop' : 'next-iteration';
  return decide(state, terminalState, nextAction, null);
};

export const classifyCommand = (argv: readonly string[]): CommandClassification => {
  const normalized = argv.map((argument) => argument.trim()).filter(Boolean);
  const allowed: readonly (readonly string[])[] = [
    ...REQUIRED_VALIDATION_COMMANDS,
    ['npm', 'test'],
    ['npx', 'jest', '--runTestsByPath', 'src/lib/loop-control/policy.test.ts', 'src/lib/loop-control/state.test.ts', 'src/lib/loop-control/cli.test.ts', '--runInBand'],
  ];
  return allowed.some((command) => commandsEqual(normalized, command))
    ? { allowed: true, reason: null }
    : { allowed: false, reason: 'Command is outside the engineering-loop allowlist.' };
};
