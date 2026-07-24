# Iteration 001 result: atomic investment snapshot accounting

Date: 2026-07-24
Branch: `featengineering-harness/2026-07-24-iteration-001`
Baseline: `bae25c1`

## Selected opportunity

The iteration selected the top-ranked backlog item: make investment snapshot persistence and its generated expense transaction atomic and retry-safe.

Before this change, `saveSnapshot()` could commit an `InvestmentSnapshot` and then fail while creating the generated expense. A retry would then read the committed snapshot as the previous amount and skip the expense, leaving the portfolio ahead of the ledger.

## Implemented change

- Wrapped investment lookup/create, snapshot lookup/upsert, and optional generated expense creation in one Prisma interactive transaction.
- Requested serializable transaction isolation and bounded retries for Prisma `P2034` write conflicts.
- Extended `createTransaction()` with an optional Prisma transaction client so the generated expense uses the same transaction as the snapshot write.
- Treated an unsuccessful generated transaction result as a transaction failure, causing the snapshot attempt to roll back.
- Preserved the existing public API, DTO shape, encryption boundary, user ownership checks, positive-delta behavior, and `createTransaction: false` behavior.

## Changed files

- `src/services/investment.service.ts`
- `src/services/investment.service.test.ts`
- `src/services/transaction.service.ts`
- `src/services/transaction.service.test.ts`
- `AGENTS.md`
- `.codex/config.toml`
- `.codex/agents/*.toml`
- `.agents/skills/investment-eki-loop/**`
- `docs/engineering/current-state.md`
- `docs/engineering/opportunity-backlog.md`
- `docs/engineering/iterations/iteration-001.md`
- `docs/engineering/iterations/iteration-001-result.md`

## Test-first evidence

Focused service tests cover the public seams needed for this slice:

- one serializable transaction is requested;
- the Prisma callback client is used for investment, snapshot, account lookup, and transaction creation;
- only the positive invested-amount delta creates an expense;
- generated transaction failure rejects from inside the transaction;
- `createTransaction: false`, unchanged amount, and decreased amount skip generated expense creation;
- `P2034` conflicts retry and return the successful third attempt.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Prisma generate | `npm run db:generate` | Pass, Prisma Client 6.19.3 generated |
| Prisma validation | `npx prisma validate` | Pass |
| Diff whitespace | `git diff --check` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 44 suites, 220 tests |
| Build | `npm run build` | Pass, including OCR trace verification |
| Migration status | `npm run db:status` | Pass: remote `Test-Eki` has 8 migrations and is up to date |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | Pre-existing fail: Next.js and sharp high advisories |
| Skill validation | `python3 .../quick_validate.py .agents/skills/investment-eki-loop` | Pass |

## Review notes

Financial correctness improved for new snapshot writes by making the snapshot and generated cash outflow commit or fail together. The persisted source of truth remains `InvestmentSnapshot` for monthly portfolio state and `Transaction` for generated cash outflow. Monetary values remain encrypted before persistence; this iteration does not change accepted sign, scale, maximum value, rounding behavior, date semantics, or historical correction rules.

The main residual financial limitation is intentional scope: this does not create reversal transactions when invested amount decreases, link snapshots to generated transactions with an idempotency key, delete old generated expenses, or repair previously diverged data.

Security-sensitive behavior remains server-side only. The public UUID/session boundary and internal `bigint` ownership checks are unchanged, and no dependency, logging, credential, route, or response-field surface was added.

## Accessibility and UX

No UI markup changed. Existing save-error feedback remains the user-visible failure path. Authenticated browser, responsive, focus-order, keyboard, and live accessibility checks remain unverified in this environment because no browser instance was available during discovery.

## Performance and operations

The change adds one interactive database transaction around a snapshot save and retries only database write-conflict errors up to three total attempts. No migration or backfill is required. Rollback is a code revert because the schema is unchanged.

## Remaining risks

- Existing production divergence, if any, still requires a separate read-only reconciliation report before repair.
- The dependency audit still reports high advisories in Next.js 16.2.10 and sharp 0.34.5; that is a separate security-maintenance slice.
- Disposable migration replay and real MySQL contention replay were unavailable because Docker is not running.
- Global service-file coverage is below 80 percent due unrelated legacy methods, but the changed slice has focused public-seam coverage.

## Quality score

Score: 88/100.

Breakdown: acceptance 19/20, automated tests 13/15, financial correctness 12/15, security/privacy 14/15, UX/accessibility 13/15, maintainability 8/10, performance 5/5, documentation/operations 4/5.

This clears the 85-point repair threshold. It is not scored higher because real database contention replay, Docker-backed migration replay, dependency-audit remediation, and authenticated browser accessibility evidence are still missing.

## Next recommendation

Run the Codex Security diff scan on this frozen tree. After that, create logical commits and a draft pull request if the scan has no unresolved diff-introduced high-severity findings.
