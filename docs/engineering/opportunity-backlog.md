# Evidence-backed opportunity backlog

Scores use a 95-point maximum:

`User value×3 + Correctness×3 + Security×3 + UX×2 + Architecture×2 + Testability×2 + Delivery confidence×2 + Maintenance + Dependency`.

Maintenance and dependency values are reverse-scored: 5 means low ongoing cost/risk.

| Priority | Opportunity | Score | Effort | Recommended iteration |
| ---: | --- | ---: | --- | --- |
| Done | Make investment snapshot and generated expense atomic and retry-safe | 83 | Small–medium | 001 |
| Done | Prevent concurrent encrypted goal additions from overwriting each other | 81 | Small | 008 |
| 1 | Define and enforce canonical finite IDR boundaries across transaction, budget, and goal writes | 83 | Medium | Needs owner policy decision |
| Done | Patch direct reviewed Next.js production advisories | 80 | Small | 007 |
| Blocked | Remove the transitive sharp 0.34.5 advisory | 80 | Small–medium | First stable Next release supporting sharp >=0.35 |
| Done | Protect all navigable authenticated pages consistently | 78 | Small | 002 |
| Done | Add account-aware scoped export with explicit backup semantics | 78 | Small–medium | 003 |
| Done | Remove per-user metadata from monthly cron responses | 77 | Small | 004 |
| Done | Honor explicit monthly reminder/summary opt-outs | 77 | Small | 005 |
| Done | Migrate the read-only Cashflow history to a native accessible dialog | 70 | Small | 006 |
| 4 | Define and enforce notification timing and alert semantics | 77 | Medium | Needs product policy decision |
| 5 | Replace prescriptive investment recommendations with explainable descriptive insights | 82 | Medium | Requires product/API contract decision |
| 6 | Add duplicate transaction review and exact retry idempotency | 76 | Medium | After amount policy |
| 7 | Continue accessible dialog migration for forms and mobile navigation | 70 | Medium | After native-dialog staging smoke |
| 8 | Unify transaction-ledger cashflow and legacy monthly aggregates | 74 | Large | Staged architecture work |

## 1. Atomic investment snapshot accounting (completed in 001)

- Historical problem: `src/services/investment.service.ts` committed an investment/snapshot and then called `createTransaction()` separately. Iteration 001 moved both writes into one retry-safe serializable transaction.
- Affected users: anyone creating or updating monthly gold or mutual-fund snapshots.
- Outcome: one serializable Prisma transaction contains snapshot state and any generated expense, with bounded write-conflict retry.
- Score inputs: `5,5,3,2,5,5,5,5,5` → 83.
- Risks/dependencies: no schema or package change; preserve encryption, response contract, and opt-out behavior. MySQL concurrency integration cannot be replayed without disposable Docker.
- Validation: service tests for transaction-client use, rollback propagation, no-expense branch, and P2034 retry; focused route regression; full suite/build.

## Atomic encrypted goal additions (completed in 008)

- Historical problem: goal contributions decrypted a shared balance and wrote
  it back without coordination, so concurrent accepted additions could
  overwrite one another.
- Outcome: one ownership-scoped conditional write compares the full mutable
  encrypted goal snapshot, retries from fresh state on comparison/P2034
  conflicts, and rejects structurally unsafe Add Amount input at both server
  boundaries.
- Score inputs: `5,5,4,2,4,5,4,4,5` → 81.
- Residuals: mocked orchestration does not prove InnoDB contention; ambiguous
  HTTP retries are not idempotent; absolute edit/add precedence and canonical
  IDR rules need explicit product/schema decisions.
- Validation: focused 30-test RED/GREEN suite, 96.2% changed-statement
  coverage, full 48-suite/327-test regression, build/OCR trace, and five
  independent approvals.

## 2. Canonical IDR input boundary

- Problem: transaction validation accepts `NaN`/`Infinity`; budget and goal paths do not share finite, sign, scale, or maximum rules. Budget output hides overage by clamping.
- Affected users: all users entering money.
- Outcome: one documented IDR policy and shared validation with signed overage semantics.
- Score inputs: `5,5,3,3,5,5,4,5,5` → 83.
- Risks/dependencies: existing decimal data and product semantics require an explicit compatibility decision.
- Validation: zero, negative, fractional, maximum-safe, non-finite, encryption round-trip, and route-envelope tests.

## 3. Production dependency patch (direct Next completed in 007)

- Historical direct problem: Next.js 16.2.10 was below the reviewed 16.2.11
  patched floor for proxy and other App Router vulnerabilities.
- Completed outcome: Next and eslint-config-next are pinned to 16.2.12 with
  coherent @next packages, reproducible `npm ci`, passing build/runtime gates,
  and the unused image optimizer disabled.
- Residual problem: stable Next 16.2.12 still declares optional
  `sharp ^0.34.5`, while the sharp advisory is fixed only in 0.35.x.
- Affected users: all deployed users.
- Remaining outcome: upgrade normally when a stable Next release declares
  sharp >=0.35; do not use a direct dependency, override, canary, downgrade, or
  audit force to manufacture a green report.
- Score inputs: `4,4,5,1,5,5,5,5,4` → 80.
- Risks/dependencies: target-platform native SWC/sharp binaries and future
  stable Next compatibility.
- Validation completed: exact package/lock contract, npm ci, audit
  classification, full tests/build, proxy/auth/private API headers, public
  asset and disabled optimizer runtime, sharp trusted-input transform, and OCR
  production trace.

## 4. Protected-page boundary completion

- Problem: `/accounts`, `/budget`, and `/goals` are navigable authenticated pages but absent from the proxy protected-route list.
- Affected users: signed-out visitors and users with expired sessions.
- Outcome: redirect before private shell/API failure rendering.
- Score inputs: `4,3,3,4,5,5,5,5,5` → 78.
- Risks/dependencies: low; APIs already fail closed, so this is boundary consistency rather than a data-access bypass.
- Validation: callback cases for anonymous, valid, and invalidated sessions plus unauthenticated navigation smoke.

## 5. Account-aware scoped export (completed in 003)

- Historical problem: “finance backup” omitted accounts, recurring rules, settings, and transfer context; it had no date/account filters.
- Affected users: users reconciling, auditing, or moving data.
- Outcome: a versioned non-restorable JSON data export, owned account/inclusive date CSV filters, and transfer-aware rows with account-relative deltas.
- Product agent score: 78.
- Residual risk: exports remain buffered; add quotas/streaming only after measuring production dataset and heap limits.
- Validation: ownership, archived accounts, empty exports, transfer representation, CSV injection, strict date/BIGINT boundaries, no-store responses, and explicit safe selects.

## 6. Notification response privacy and explicit opt-outs (completed in 004–005)

- Historical privacy problem: cron results serialized internal numeric user IDs and per-user activity/delivery metadata.
- Privacy outcome: the service and API return aggregate counts only, scheduler responses are private/no-store, raw failure logs are sanitized, and the user batch selects only required columns.
- Consent outcome: the scheduler honors explicit false reminder/summary flags before any delivery side effect; missing settings retain enabled defaults.
- Remaining correctness problem: reminder-day, end-of-month, low-balance, and custom-alert semantics are not defined or enforced.
- Affected users: notification users and operators.
- Remaining outcome: an agreed timing/alert policy determines the delivery cadence and non-monthly alert behavior.
- Score inputs: `4,4,4,4,4,4,4,4,5` → 77.
- Risks/dependencies: reminder and summary timing plus custom-alert/low-balance semantics need product definition.
- Validation completed in 004: aggregate-only contract, fail-closed auth, no-store responses, sanitized logs, and retry claim regressions.
- Validation completed in 005: both explicit opt-outs, missing-settings defaults, type-specific gating, pre-claim short-circuiting, and retry regressions.
- Future validation: Jakarta timing/cadence and low-balance/custom-alert semantics.

## Deferred opportunities

- Explainable non-prescriptive insights scored 82, but changing its API/copy requires explicit product compatibility acceptance.
- Duplicate transaction review scored 76; false-positive and idempotency semantics need design.
- Cashflow’s read-only history dialog completed the first accessible-dialog
  slice in 006 using the native top layer without changing financial content.
  Budget/Goal form dialogs and the mobile More sheet remain follow-ups after a
  staging keyboard/mobile smoke proves the primitive.
- Ledger-backed goals, account reconciliation, recurring UI, OCR quotas, bcrypt byte limits, auth throttling, quote coalescing, CI/MySQL concurrency, and full browser accessibility remain valuable follow-ups.
