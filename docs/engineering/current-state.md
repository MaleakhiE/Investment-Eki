# Investment-Eki current state

Date: 2026-07-27
Baseline commit: `24ee7d9`
Iteration branch: `feat/loop-engineering-3-account-aware-export`

## Product and architecture

Investment-Eki is a Next.js 16/React 19 personal-finance application backed by Prisma 6/MySQL. It supports credential and Google authentication, dashboard analytics, encrypted cashflow and transactions, financial accounts and transfers, receipt OCR, budgets, recurring transactions, goals, investments, exports, notifications, password reset, and superadmin SMTP configuration.

Routes live in `src/app`, domain services in `src/services`, cross-cutting server helpers in `src/lib`, and forward-only schema changes in `prisma/migrations`. API handlers use the envelope from `src/lib/api-response.ts`.

The identity boundary retains internal BIGINT relational keys while JWT/session/API identity uses `users.public_id`. `src/lib/auth-session.ts` resolves public UUIDs; `session_version` invalidates old JWTs after password reset. Existing accounts/transfers, recurring occurrence idempotency, hardened review-first OCR, fail-closed cron auth, private exports, and CSV formula neutralization must not be duplicated or weakened. JSON export is now explicitly a versioned, non-restorable data export; CSV supports owned-account and inclusive date filters with transfer-aware signed deltas.

## Tool inventory used

- Local shell/Git, npm, Jest, TypeScript, ESLint, Next.js, and Prisma CLI.
- Codex multi-agent collaboration with five read-only discovery agents.

## Baseline validation

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm ci` | Pass; two upstream deprecation warnings |
| Prisma generate | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Tests | `npm test -- --runInBand` | Pass: 44 suites, 278 tests |
| Build | `npm run build` | Pass, including OCR trace verification |
| Migration replay | `npm run db:verify` | Environment-related failure: Docker daemon unavailable |
| Dependency audit | `npm audit --omit=dev --audit-level=high` | Pre-existing failure: 2 high advisories in Next.js and transitive sharp |

## Runtime and UI evidence

Local HTTP smoke confirms protected pages redirect anonymous users and `/api/export` returns a private, non-cacheable `401` before any export query. Authenticated export/UI smoke remains unavailable because the configured MySQL host is unreachable from this environment.

Authenticated visual, responsive, focus-order, keyboard, and live accessibility checks remain unverified.

## Main integrity and security risks

- Investment snapshot and generated-expense writes are atomic for new writes; historical decreases, deletes, and prior divergence remain separate design/reconciliation work.
- Transaction-derived cashflow and independently writable `MonthlyCashflow` can disagree.
- Several money boundaries accept non-finite or insufficiently defined IDR values; goals have a concurrent lost-update path.
- Next.js 16.2.10 and transitive sharp currently produce two high audit findings.
- Login/registration throttling and registration account-enumeration behavior need a separate auth-hardening slice.

## Operational gaps

There is no GitHub Actions workflow, browser E2E stack, axe coverage, enforced coverage threshold, or successful disposable migration replay in this environment. `.env.example` also omits the `CRON_SECRET` required by scheduler authorization.
