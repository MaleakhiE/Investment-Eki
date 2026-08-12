# Iteration 076 — Restore cashflow account availability state

## Category

Reliability / UX repair

## Problem and evidence

The merge of Iterations 074 and 075 left `fetchAccounts` calling `setAccountsError` without declaring the state, causing the Next.js production build to fail with `Cannot find name 'setAccountsError'`. The account unavailable alert was also absent from the merged page.

## Scope

Restore the missing account error state declaration and the existing accessible account retry alert. No API, database, financial calculation, or dependency changes.

## Acceptance criteria

- TypeScript and production build pass.
- Account request failures remain distinct from valid empty account lists.
- Account retry remains keyboard accessible and announced with `role="alert"`.
- Existing transaction and summary retry behavior remains unchanged.

## Review and validation

This is a focused post-merge repair. Fallback architecture, security, financial, reliability, UX/accessibility, test-adequacy, and adversarial reviews found no unresolved Critical/High issue. Visual validation is limited to static review.

## Rollback

Revert the repair commit; this restores the pre-repair build failure and is not recommended after owner review.
