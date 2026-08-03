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
  if (!classifyCommand(validation.command).allowed) {
    return decide(state, 'unsafe', 'stop', 'Validation command is prohibited.');
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
  const changes = { validations, lastFailure: validation.status === 'Failed' ? validation.classification : null };

  if (validation.status === 'Failed') {
    if (validation.classification === 'introduced' && validation.repairable) {
      return decide(state, null, 'repair', null, { ...changes, phase: 'validate' });
    }
    return decide(state, 'blocked', 'stop', 'Validation failure cannot be repaired automatically.', changes);
  }
  if (validation.status === 'Blocked by environment' && validation.required) {
    return decide(state, 'blocked', 'stop', 'Required validation is blocked by the environment.', changes);
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

export const authorizePublication = (state: LoopState, readiness: PublicationReadiness): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (!readiness.requiredValidationsPassed || !readiness.noUnresolvedIntroducedFailure || !readiness.review
    || !readiness.review.independent || !readiness.review.approved || !readiness.review.baseCommitIsAncestor) {
    return decide(state, 'blocked', 'stop', 'Publication evidence is incomplete.');
  }
  return decide(state, null, 'publish', null, { phase: 'publish', review: readiness.review });
};

export const acceptIteration = (state: LoopState): Decision => {
  const prior = stopped(state);
  if (prior) return prior;
  if (state.phase !== 'publish' || state.nextAction !== 'publish' || !state.review?.independent
    || !state.review.approved || !state.review.baseCommitIsAncestor
    || !state.publication?.commit || !state.publication.pullRequestUrl.trim()) {
    return decide(state, 'blocked', 'stop', 'Acceptance evidence is incomplete.');
  }
  const terminalState: TerminalState = state.currentIteration >= state.targetIteration ? 'completed' : 'accepted';
  const nextAction: NextAction = terminalState === 'completed' ? 'stop' : 'next-iteration';
  return decide(state, terminalState, nextAction, null);
};

const includesSequence = (argv: readonly string[], sequence: readonly string[]): boolean => sequence.every(
  (argument, index) => argv[index] === argument,
);

export const classifyCommand = (argv: readonly string[]): CommandClassification => {
  const normalized = argv.map((argument) => argument.trim()).filter(Boolean);
  const denied = [
    ['npm', 'run', 'db:migrate'], ['npm', 'run', 'db:deploy'], ['npm', 'run', 'db:seed'],
    ['npm', 'run', 'admin:promote'], ['npm', 'run', 'smtp:import'],
    ['npx', 'prisma', 'migrate', 'reset'], ['npx', 'prisma', 'migrate', 'dev'],
    ['npx', 'prisma', 'migrate', 'deploy'], ['npx', 'prisma', 'db', 'seed'],
    ['git', 'push', '--force'], ['git', 'push', '-f'], ['git', 'reset', '--hard'], ['git', 'clean'], ['git', 'merge'],
  ];
  const allowed = [
    ['npm', 'test'], ['npm', 'run', 'lint'], ['npm', 'run', 'build'],
    ['npm', 'run', 'db:status'], ['npm', 'run', 'db:verify'],
    ['npx', 'jest'], ['npx', 'tsc'], ['npx', 'prisma', 'format'], ['npx', 'prisma', 'validate'],
  ];
  const shell = new Set(['sh', 'bash', 'zsh', 'cmd', 'powershell', 'pwsh']);
  if (shell.has(normalized[0] ?? '') || denied.some((command) => includesSequence(normalized, command))) {
    return { allowed: false, reason: 'Command is outside the engineering-loop allowlist.' };
  }
  return allowed.some((command) => includesSequence(normalized, command))
    ? { allowed: true, reason: null }
    : { allowed: false, reason: 'Command is outside the engineering-loop allowlist.' };
};
