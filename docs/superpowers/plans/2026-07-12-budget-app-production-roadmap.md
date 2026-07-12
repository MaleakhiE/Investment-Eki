# Budget App Production Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current tracker into a trustworthy budget application by stabilizing production operations first, then introducing real accounts, balances, transfers, reliable recurring transactions, and unified budget periods.

**Architecture:** Work is split into deployable vertical slices. Phase 0 makes the current application reproducible and secure; Phase 1 introduces the account ledger that all later budgeting features depend on; Phase 2 makes recurring postings idempotent; Phase 3 unifies budgeting periods; Phase 4 adds import/reconciliation and scale controls.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6/MySQL, NextAuth JWT, AES-256-GCM, Jest/fast-check, Nodemailer.

## Global Constraints

- Do not start Phase 1 until the SMTP/password-reset diff is committed, a baseline migration replays successfully on an empty MySQL database, and the remote database reports no pending/failed migration.
- Preserve encrypted monetary storage and the standard API response envelope.
- Every write must be user-owned, idempotent where jobs can retry, and covered by a failing test before implementation.
- All financial periods use `Asia/Jakarta` semantics and explicit start/end boundaries.
- Do not add bank synchronization, AI chat, multi-currency, loans, tax, or shared household accounts in this roadmap.
- Do not use decorative icons, emoji, icon-only buttons, or pictograms in the application UI; use text labels, typography, spacing, borders, and color with accessible names.

---

## Phase -1: Finish Current Release

### Task 0: Remove icon-driven UI and finish SMTP/reset release

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: all user-facing `src/app/**/page.tsx` files containing emoji, SVG icons, or icon-only controls
- Modify: current SMTP/password-reset files already present in the working tree
- Test: existing Jest suites plus production build

- [ ] Replace navigation icons with text-only navigation and active-state typography/borders.
- [ ] Replace icon-only edit/delete/close/export/scan controls with compact text labels and accessible names.
- [ ] Remove decorative emoji and SVGs while preserving data visualizations such as charts and progress rings.
- [ ] Verify the current SMTP/password-reset release, commit it, and establish a clean Phase 0 starting point.

## Phase 0: Production Foundations

### Task 1: Reproducible Prisma migration chain

**Files:**
- Create: `prisma/migrations/20260710000000_baseline/migration.sql`
- Modify: `package.json`
- Modify: `scripts/prisma-with-url.js`
- Create: `scripts/verify-migrations.sh`
- Create: `docs/runbooks/database-migrations.md`

**Interfaces:**
- Produces: `npm run db:status`, `npm run db:deploy`, and a baseline that creates the pre-OCR schema before later migrations run.

- [ ] Introspect the current remote schema into a temporary Prisma schema and generate a reviewed baseline from empty to the pre-OCR data model.
- [ ] Verify the baseline contains `CREATE TABLE transactions` and excludes `account`, `receipt_image`, `application_smtp_settings`, and `password_reset_tokens`.
- [ ] Replace `spawn(..., { shell: true })` with a non-shell Prisma invocation and add deploy/status scripts.
- [ ] Add a disposable-MySQL verification script that applies every migration from empty and runs `prisma migrate status`.
- [ ] Mark only the baseline applied on the existing database, run `migrate deploy`, then verify the OCR and SMTP/reset migrations applied.

Verification:

```bash
npm run db:status
npm run db:deploy
bash scripts/verify-migrations.sh
```

### Task 2: Fail-closed scheduled jobs

**Files:**
- Modify: `src/app/api/notifications/send-monthly/route.ts`
- Create: `src/lib/cron-auth.ts`
- Create: `src/lib/cron-auth.test.ts`
- Create: `src/app/api/notifications/send-monthly/route.test.ts`

**Interfaces:**
- Produces: `verifyCronBearer(request: Request): boolean` using constant-time comparison and rejecting missing `CRON_SECRET`.

- [ ] Test missing, malformed, and incorrect secrets return 401 without executing notification work.
- [ ] Test a correct secret executes once and returns the existing response envelope.
- [ ] Implement fail-closed authorization and remove the current optional-secret behavior.
- [ ] Add an idempotency key `(user_id, month, notification_type)` so scheduler retries do not send duplicate monthly mail.

### Task 3: Session revocation after password reset

**Files:**
- Modify: `prisma/schema.prisma`
- Create: next additive migration under `prisma/migrations/`
- Modify: `src/services/password-reset.service.ts`
- Modify: `src/lib/auth.config.ts`
- Modify: `src/lib/auth.ts`
- Test: `src/services/password-reset.service.test.ts`
- Create: `src/lib/auth-session.test.ts`

**Interfaces:**
- Adds: `User.session_version Int @default(1)`.
- Produces: reset increments `session_version`; protected API authorization rejects JWTs with an older version.

- [ ] Test reset atomically updates the password, consumes the token, and increments session version.
- [ ] Test an existing JWT is rejected after the version increments.
- [ ] Add version to newly issued JWTs and verify it on protected server/API access.
- [ ] Document that password reset signs out all devices.

### Task 4: Security and recovery baseline

**Files:**
- Modify: `next.config.ts`
- Modify: `src/app/api/export/route.ts`
- Modify: `src/services/export.service.ts`
- Create: `src/app/api/health/live/route.ts`
- Create: `src/app/api/health/ready/route.ts`
- Create: `.github/workflows/ci.yml`
- Create: `docs/runbooks/backup-restore.md`

- [ ] Add CSP, HSTS in production, `nosniff`, frame restrictions, Referrer-Policy, and Permissions-Policy.
- [ ] Add `Cache-Control: no-store, private` to decrypted exports and neutralize CSV cells beginning with `=`, `+`, `-`, or `@`.
- [ ] Add liveness and readiness endpoints; readiness checks database access and global SMTP row presence without sending mail.
- [ ] Add CI gates for clean install, Prisma generation/validation, typecheck, lint, tests, production build, dependency audit, and migration replay.
- [ ] Document provider backups, point-in-time recovery, retention, and a quarterly restore drill.

Phase 0 exit gate:

```bash
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npx prisma validate
npx next build --webpack
bash scripts/verify-migrations.sh
```

---

## Phase 1: Account Ledger and Transfers

### Task 5: Account domain model and legacy-tag migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: additive account migration under `prisma/migrations/`
- Create: `src/services/account.service.ts`
- Create: `src/services/account.service.test.ts`
- Modify: `src/services/transaction.service.ts`

**Interfaces:**

```ts
type AccountType = 'CASH' | 'BANK' | 'EWALLET' | 'CREDIT_CARD';
interface AccountRecord { id: string; name: string; type: AccountType; opening_balance: number; current_balance: number; archived: boolean; }
```

- [ ] Add `Account` with user-scoped unique name, encrypted opening balance, type, and archived flag.
- [ ] Add nullable `Transaction.account_id` while retaining the legacy `account` string during migration.
- [ ] Backfill one account per distinct `(user_id, account)` value and attach transactions.
- [ ] Reject cross-user account IDs and archived accounts on new transactions.
- [ ] Calculate current balance as opening balance plus income minus expense plus transfer effects.

### Task 6: Atomic transfer semantics

**Files:**
- Modify: `prisma/schema.prisma`
- Create: additive transfer migration under `prisma/migrations/`
- Create: `src/services/transfer.service.ts`
- Create: `src/services/transfer.service.test.ts`
- Create: `src/app/api/transfers/route.ts`

**Interfaces:**

```ts
interface TransferInput { from_account_id: string; to_account_id: string; amount: number; date: string; description?: string; }
```

- [ ] Add `Transfer` linking source and destination accounts with encrypted amount.
- [ ] Test same-account, non-positive, archived, and cross-user transfers fail.
- [ ] Create transfers atomically without counting them as income or expense.
- [ ] Ensure account balances reflect transfer outflow/inflow and cashflow analytics exclude transfers.

### Task 7: Account management and reconciliation UI

**Files:**
- Create: `src/app/accounts/page.tsx`
- Create: `src/app/api/accounts/route.ts`
- Create: `src/app/api/accounts/[id]/route.ts`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/app/cashflow/page.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] Add account create/edit/archive, opening balance, and current balance cards.
- [ ] Replace transaction free-text account entry with account IDs while showing migrated account names.
- [ ] Add transfer entry and a balance-adjustment reconciliation action with a required reason.
- [ ] Change dashboard “Sisa Uang” to actual liquid-account balance and keep period cashflow as a separate metric.

Phase 1 exit gate: opening balances, transactions, and transfers reconcile exactly per account; transfer totals never change income or expense.

---

## Phase 2: Reliable Recurring Transactions

### Task 8: Idempotent occurrence engine

**Files:**
- Modify: `prisma/schema.prisma`
- Create: recurring-occurrence migration under `prisma/migrations/`
- Rewrite: `src/services/recurring.service.ts`
- Create: `src/services/recurring.service.test.ts`

**Interfaces:**
- Adds a unique occurrence key `(recurring_transaction_id, scheduled_date)`.
- Produces: `processDueRecurrings(asOf: Date): Promise<ProcessResult>`.

- [ ] Test concurrent/retried processing creates one transaction per occurrence.
- [ ] Define explicit timezone, month-end, leap-year, yearly month/day, and catch-up behavior.
- [ ] Store account association and validate ownership.
- [ ] Create the transaction and occurrence record in one database transaction.

### Task 9: Scheduler and recurring management UI

**Files:**
- Create: `src/app/api/jobs/process-recurring/route.ts`
- Create: `src/app/api/jobs/process-recurring/route.test.ts`
- Create: `src/app/recurring/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] Protect the job with the fail-closed cron helper.
- [ ] Add create/edit/pause/delete recurring rules and show next/last occurrence.
- [ ] Surface failed occurrences without silently losing them.

---

## Phase 3: Unified Budget Cycles

### Task 10: Shared period service and correct overage

**Files:**
- Create: `src/services/period.service.ts`
- Create: `src/services/period.service.test.ts`
- Modify: `src/services/budget.service.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/budget/page.tsx`
- Modify: `src/services/savings-suggestion.service.ts`

- [ ] Add user-configurable cycle start day, defaulting to 25.
- [ ] Use one period boundary implementation for dashboard, budgets, and suggestions.
- [ ] Return signed `remaining = budget - spent`; never clamp it to zero.
- [ ] Display exact overage and forecast required daily allowance through the period end.

Rollover is intentionally excluded until two complete cycles of correct budget data exist.

---

## Phase 4: Import, Reconciliation, and Scale

### Task 11: Safe CSV import with review

**Files:**
- Create: `src/services/import.service.ts`
- Create: `src/services/import.service.test.ts`
- Create: `src/app/api/import/preview/route.ts`
- Create: `src/app/api/import/commit/route.ts`
- Create: `src/app/import/page.tsx`

- [ ] Parse CSV into a preview without writes, validate dates/amounts/accounts, and compute duplicate fingerprints.
- [ ] Require explicit user confirmation before committing.
- [ ] Make commit idempotent and report accepted, duplicate, and rejected rows.

### Task 12: Server-side transaction query controls

**Files:**
- Modify: `src/app/api/transactions/route.ts`
- Modify: `src/services/transaction.service.ts`
- Modify: `src/app/cashflow/page.tsx`
- Create: `src/services/transaction-query.test.ts`

- [ ] Add cursor pagination, account/category/type filters, and bounded search.
- [ ] Keep default page size at 50 and maximum at 200.
- [ ] Move monthly client-side filtering to the server and preserve deterministic ordering by date then ID.

## Explicitly Deferred

- Bank Open API synchronization: defer until manual reconciliation is proven.
- AI chatbot: current deterministic insights are safer and cheaper.
- Multi-currency: defer until account ledger invariants are stable.
- Debt, loan amortization, tax, and household sharing: separate products with distinct security and accounting models.

## Recommended Execution Order

1. Finish and deploy the current SMTP/password-reset work.
2. Execute Phase 0 as its own branch and deployment.
3. Execute Phase 1 as the next product release.
4. Run Phase 2 and Phase 3 as separate releases.
5. Start Phase 4 only after real usage shows import volume or query latency warrants it.
