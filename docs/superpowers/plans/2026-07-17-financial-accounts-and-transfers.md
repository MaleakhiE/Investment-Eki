# Financial Accounts and Transfers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multiple bank accounts and wallets with computed balances and transfers, migrate existing account labels, and prevent dashboard text overflow on mobile.

**Architecture:** Introduce a user-owned `FinancialAccount` model and link transactions to source and optional destination accounts. A transfer is one transaction and balance calculation treats it as an internal movement, while financial summaries continue counting only income and expenses.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6, MySQL, Jest, Tailwind CSS 4

## Global Constraints

- Opening balances and transaction amounts must remain encrypted at rest.
- Every account query and mutation must enforce current-user ownership.
- Transfers must never inflate income, expenses, budgets, or savings metrics.
- Existing non-empty account labels must migrate automatically; unlabeled transactions must map to `Cash`.
- Preserve `transactions.account` during this compatibility release.
- Mobile content must remain inside its card at 320 CSS pixels and wider.

---

### Task 1: Account schema and legacy-data migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260717000000_add_financial_accounts_and_transfers/migration.sql`

**Interfaces:**
- Produces: Prisma `FinancialAccount`, `FinancialAccountType`, `TransactionType.TRANSFER`, `Transaction.account_id`, and `Transaction.destination_account_id`.

- [ ] **Step 1: Add schema relations and migration SQL**

Define the account model, source/destination relation names, unique `(user_id, name)`, balance-query indexes, and foreign keys. Backfill with `COALESCE(NULLIF(TRIM(account), ''), 'Cash')` and leave migrated `opening_balance` null.

- [ ] **Step 2: Validate the schema**

Run: `npx prisma format && npx prisma validate`

Expected: schema formatting completes and validation exits 0.

- [ ] **Step 3: Generate the Prisma client**

Run: `npx prisma generate`

Expected: Prisma Client generation exits 0 with the new account types.

### Task 2: Account domain service with computed balances

**Files:**
- Create: `src/services/account.service.test.ts`
- Create: `src/services/account.service.ts`

**Interfaces:**
- Produces: `validateAccountInput`, `calculateAccountBalance`, `getAccounts`, `createAccount`, `updateAccount`, and `archiveAccount`.
- Consumes: generated Prisma account types and `encryptNumber`/`decryptNumber`.

- [ ] **Step 1: Write failing validation and balance tests**

Cover trimmed names, duplicate names, negative opening balances, ownership, and the equation `opening + income - expense + incoming transfer - outgoing transfer`.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/services/account.service.test.ts --runInBand`

Expected: FAIL because `account.service` does not exist.

- [ ] **Step 3: Implement the minimal account service**

Use immutable response objects, encrypted persistence, user-scoped predicates, and grouped transaction aggregation. Interpret a null migrated opening balance as zero.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/services/account.service.test.ts --runInBand`

Expected: all account service tests pass.

### Task 3: Transfer and linked-transaction behavior

**Files:**
- Modify: `src/services/transaction.service.test.ts`
- Modify: `src/services/transaction.service.ts`

**Interfaces:**
- Produces: `TransactionInput.account_id`, `TransferInput`, and `createTransfer`.
- Consumes: account ownership validation from `account.service`.

- [ ] **Step 1: Write failing tests**

Test required source accounts, valid source/destination ownership, same-account rejection, atomic transfer creation, and transfer exclusion from monthly summaries.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/services/transaction.service.test.ts --runInBand`

Expected: FAIL on missing transfer behavior.

- [ ] **Step 3: Implement linked transactions and transfers**

Keep legacy account strings synchronized with the selected account name for compatibility. Ensure summary branches explicitly process `INCOME` and `EXPENSE`, ignoring `TRANSFER`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/services/transaction.service.test.ts --runInBand`

Expected: all transaction tests pass.

### Task 4: Account and transfer API routes

**Files:**
- Create: `src/app/api/accounts/route.ts`
- Create: `src/app/api/accounts/[id]/route.ts`
- Create: `src/app/api/accounts/transfer/route.ts`
- Create: `src/app/api/accounts/route.test.ts`
- Modify: `src/app/api/transactions/route.ts`
- Modify: `src/app/api/transactions/[id]/route.ts`
- Modify: `src/app/api/transactions/summary-range/route.ts`

**Interfaces:**
- Produces: authenticated CRUD and transfer endpoints using the existing API response envelope.
- Consumes: account and transaction services from Tasks 2 and 3.

- [ ] **Step 1: Write failing route tests**

Cover unauthenticated access, ownership isolation, validation failures, serializable BigInt IDs, and transfer success.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/app/api/accounts/route.test.ts --runInBand`

Expected: FAIL because account routes do not exist.

- [ ] **Step 3: Implement route handlers and update summaries**

Parse request bodies defensively, delegate business rules to services, and make summary calculation ignore transfer records explicitly.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/app/api/accounts/route.test.ts src/app/api/transactions --runInBand`

Expected: all targeted API tests pass.

### Task 5: Account management and cashflow interface

**Files:**
- Create: `src/app/accounts/page.tsx`
- Modify: `src/app/cashflow/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Create: `src/components/accounts/account-ui.test.tsx`

**Interfaces:**
- Consumes: `/api/accounts`, `/api/accounts/:id`, `/api/accounts/transfer`, and account-linked transaction APIs.

- [ ] **Step 1: Write failing interface tests**

Assert account cards expose names and balances, transfer controls expose source and destination labels, and long names use truncation-safe classes.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/components/accounts/account-ui.test.tsx --runInBand`

Expected: FAIL because the account UI does not exist.

- [ ] **Step 3: Build account management and update cashflow**

Provide mobile-first create/edit/archive forms, a transfer form, API feedback states, account-driven transaction selects, and transfer presentation in transaction history.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/components/accounts/account-ui.test.tsx --runInBand`

Expected: account UI tests pass.

### Task 6: Dashboard account rail and responsive overflow repair

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/dashboard-responsive.test.tsx`

**Interfaces:**
- Consumes: `GET /api/accounts` account summaries.

- [ ] **Step 1: Write a failing responsive test**

Assert the quick actions use two mobile columns and four wider columns, labels have bounded wrapping, and account cards use a scrollable rail with truncated names.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/app/dashboard/dashboard-responsive.test.tsx --runInBand`

Expected: FAIL on the current four-column-only mobile layout.

- [ ] **Step 3: Implement responsive dashboard cards**

Load accounts, render combined and individual balances, use `grid-cols-2 sm:grid-cols-4`, add `min-w-0` and `break-words`, and retain usable states when account loading fails.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/app/dashboard/dashboard-responsive.test.tsx --runInBand`

Expected: responsive dashboard tests pass.

### Task 7: Full verification

**Files:**
- Modify only files required by defects revealed during verification.

- [ ] **Step 1: Verify generated schema and migrations**

Run: `npx prisma validate && npx prisma generate`

Expected: both commands exit 0.

- [ ] **Step 2: Run the full test suite**

Run: `npm test -- --runInBand`

Expected: all suites pass with zero failures.

- [ ] **Step 3: Run static checks**

Run: `npm run lint`

Expected: ESLint exits 0.

- [ ] **Step 4: Run the deployment-equivalent build**

Run: `npm run build`

Expected: Prisma generation, Next.js production build, type checking, and OCR trace verification all exit 0.

- [ ] **Step 5: Review migration safety and working tree**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intentional implementation files plus pre-existing unrelated `.superpowers` state changes are present.
