# Financial Accounts and Transfers Design

## Goal

Add user-owned bank accounts and wallets with opening balances, transaction-linked balances, and internal transfers, while repairing dashboard layouts that allow mobile text to crowd or overflow its card.

## Decisions

- Use a first-class `FinancialAccount` model rather than free-form account labels.
- Calculate each balance as opening balance plus income, minus expenses, plus incoming transfers, minus outgoing transfers.
- Represent a transfer as one `TRANSFER` transaction with source and destination account IDs.
- Exclude transfers from income, expense, budget, savings-rate, and category reporting.
- Backfill distinct legacy account labels into accounts and map unlabeled transactions to a per-user `Cash` wallet.
- Keep the legacy `transactions.account` text during this release for rollback compatibility.

## Data Model

`FinancialAccount` belongs to a user and contains a unique user-scoped name, an account type (`BANK`, `WALLET`, or `CASH`), an encrypted optional opening balance, an optional presentation color, and an archive flag. A user can own many accounts.

`Transaction` gains nullable source `account_id` and nullable `destination_account_id` relations. Income and expense transactions require a source account in new writes. Transfer transactions require both accounts and reject identical source and destination IDs.

The migration creates accounts from normalized legacy labels. Empty or null labels become `Cash`. Opening balances for migrated accounts are null and interpreted as zero because SQL migrations cannot safely create application-key ciphertext.

## Service and API Design

- `GET /api/accounts` returns active accounts with calculated balances.
- `POST /api/accounts` creates an account after validating ownership-scoped name uniqueness and a non-negative opening balance.
- `PUT /api/accounts/:id` edits the name, type, color, and opening balance.
- `DELETE /api/accounts/:id` archives the account; it does not delete history.
- `POST /api/accounts/transfer` validates ownership of both accounts and creates one transfer transaction atomically.
- Existing transaction APIs accept `account_id` and return account identity and name. The legacy `account` string remains in responses during compatibility migration.

All account lookups include `user_id` in their predicate. Amounts and opening balances remain encrypted at rest using the existing encryption module. API errors use the existing response envelope and return user-safe validation messages.

## Interface Design

The dashboard loads accounts alongside its existing summaries. It shows the combined available balance and a horizontally scrollable account-card rail with individual balances. Each card has bounded text, `min-width: 0`, truncation for long names, and a fixed mobile-friendly width.

The quick-action layout becomes two columns on narrow mobile screens and four columns once sufficient width exists. Labels use wrapping-safe line height and bounded padding so `Investments` cannot leave its card.

A dedicated `/accounts` screen provides account creation, editing, archiving, and transfers. The cashflow form loads account options from the account API instead of hardcoded presets, links every new income or expense to an account, and shows source-to-destination labels for transfers.

## Failure Handling

- Reject missing, inaccessible, archived, or duplicate accounts.
- Reject zero/negative amounts and same-account transfers.
- Never classify a transfer as an expense when producing summaries.
- Keep account archival non-destructive so historic balances and transactions remain explainable.
- If account loading fails, retain the existing dashboard summary and show an account-specific retry state.

## Testing and Verification

Use test-first cycles for balance calculation, input validation, transfer behavior, API ownership, and mobile class behavior. Run targeted Jest tests during each cycle, then the complete Jest suite, ESLint, Prisma validation/generation, and the production build.
