# Investment-Eki current state

Date: 2026-07-24
Baseline commit: `bae25c1`
Iteration branch: `featengineering-harness/2026-07-24-iteration-001`

## Product and architecture

Investment-Eki is a Next.js 16/React 19 personal-finance application backed by Prisma 6/MySQL. It supports credential and Google authentication, dashboard analytics, encrypted cashflow and transactions, financial accounts and transfers, receipt OCR, budgets, recurring transactions, goals, investments, exports, notifications, password reset, and superadmin SMTP configuration.

Routes live in `src/app`, domain services in `src/services`, cross-cutting server helpers in `src/lib`, and forward-only schema changes in `prisma/migrations`. API handlers use the envelope from `src/lib/api-response.ts`.

The identity boundary retains internal BIGINT relational keys while JWT/session/API identity uses `users.public_id`. `src/lib/auth-session.ts` resolves public UUIDs; `session_version` invalidates old JWTs after password reset. Existing accounts/transfers, recurring occurrence idempotency, hardened review-first OCR, fail-closed cron auth, private exports, and CSV formula neutralization must not be duplicated or weakened.

## Tool inventory used

- Local shell/Git, npm, Jest, TypeScript, ESLint, Next.js, Prisma CLI, and Codex CLI 0.139.0.
- Codex multi-agent collaboration with six read-only discovery agents.
- GitHub connector for commits, historical PRs, open issues, and commit status.
- Current Codex manual for project config and custom-agent schemas.
- Context7 Prisma 6.19 documentation for interactive transaction, `TransactionClient`, serializable isolation, and P2034 retry behavior.
- Browser tooling was callable but no browser instance was available to the UX agent.

## Baseline validation

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm ci` | Pass; two upstream deprecation warnings |
| Prisma generate | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Tests | `npm test -- --runInBand` | Pass: 43 suites, 212 tests |
| Build | `npm run build` | Pass, including OCR trace verification |
| Migration status | `npm run db:status` | Pass: remote `Test-Eki` reports 8 migrations and current schema |
| Migration replay | `npm run db:verify` | Environment-related failure: Docker daemon unavailable |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | Pre-existing failure: Next.js and transitive sharp advisories |
| Skill validation | `quick_validate.py .agents/skills/investment-eki-loop` | Pass |
| Codex config parsing | `codex --strict-config exec --help` | Pass |

## Runtime and UI evidence

The UX agent started Next.js 16.2.10, received 200 from `/login` and `/register`, and confirmed `/dashboard` redirects unauthenticated users. Five focused UI suites passed (9 tests). No browser instance was available, so authenticated visual, responsive, focus-order, keyboard, and live accessibility claims remain unverified.

Source inspection found silent API-failure-to-empty-state behavior, inaccessible hand-built dialogs, labels not associated with inputs, insufficient light-card text contrast, and inconsistent Indonesian/English copy.

## Main integrity and security risks

- `saveSnapshot()` upserts a portfolio snapshot before separately posting its expense. Failure creates an unreconciled portfolio/ledger state; retry may not repair it.
- Transaction-derived cashflow and independently writable `MonthlyCashflow` can disagree.
- Several money boundaries accept non-finite or insufficiently defined IDR values; goals have a concurrent lost-update path.
- Next.js 16.2.10 and transitive sharp currently produce two high audit findings.
- Bcrypt accepts passwords beyond its 72-byte effective boundary without warning.
- Login/registration throttling, OCR fairness/dimension limits, and outbound quote-request coalescing need hardening.

## Operational gaps

There is no GitHub Actions workflow, browser E2E stack, axe coverage, enforced coverage threshold, or successful disposable migration replay in this environment. `.env.example` also omits the `CRON_SECRET` required by scheduler authorization.
