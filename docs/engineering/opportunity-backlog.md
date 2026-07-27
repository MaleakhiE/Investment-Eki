# Evidence-backed opportunity backlog

Scores use a 95-point maximum:

`User value×3 + Correctness×3 + Security×3 + UX×2 + Architecture×2 + Testability×2 + Delivery confidence×2 + Maintenance + Dependency`.

Maintenance and dependency values are reverse-scored: 5 means low ongoing cost/risk.

| Priority | Opportunity | Score | Effort | Recommended iteration |
| ---: | --- | ---: | --- | --- |
| Done | Make investment snapshot and generated expense atomic and retry-safe | 83 | Small–medium | 001 |
| 1 | Define and enforce canonical finite IDR boundaries across transaction, budget, and goal writes | 83 | Medium | Needs owner policy decision |
| 2 | Patch reviewed Next.js/sharp production advisories | 80 | Small–medium | Security maintenance |
| Done | Protect all navigable authenticated pages consistently | 78 | Small | 002 |
| 3 | Add account-aware scoped export with explicit backup semantics | 78 | Small–medium | Product slice |
| 4 | Enforce notification preferences and remove internal IDs from cron results | 77 | Medium | Correctness/privacy slice |
| 5 | Replace prescriptive investment recommendations with explainable descriptive insights | 82 | Medium | Requires product/API contract decision |
| 6 | Add duplicate transaction review and exact retry idempotency | 76 | Medium | After amount policy |
| 7 | Add accessible dialog primitives and migrate hand-built overlays | 70 | Medium | Accessibility slice |
| 8 | Unify transaction-ledger cashflow and legacy monthly aggregates | 74 | Large | Staged architecture work |

## 1. Atomic investment snapshot accounting (completed in 001)

- Historical problem: `src/services/investment.service.ts` committed an investment/snapshot and then called `createTransaction()` separately. Iteration 001 moved both writes into one retry-safe serializable transaction.
- Affected users: anyone creating or updating monthly gold or mutual-fund snapshots.
- Outcome: one serializable Prisma transaction contains snapshot state and any generated expense, with bounded write-conflict retry.
- Score inputs: `5,5,3,2,5,5,5,5,5` → 83.
- Risks/dependencies: no schema or package change; preserve encryption, response contract, and opt-out behavior. MySQL concurrency integration cannot be replayed without disposable Docker.
- Validation: service tests for transaction-client use, rollback propagation, no-expense branch, and P2034 retry; focused route regression; full suite/build.

## 2. Canonical IDR input boundary

- Problem: transaction validation accepts `NaN`/`Infinity`; budget and goal paths do not share finite, sign, scale, or maximum rules. Budget output hides overage by clamping.
- Affected users: all users entering money.
- Outcome: one documented IDR policy and shared validation with signed overage semantics.
- Score inputs: `5,5,3,3,5,5,4,5,5` → 83.
- Risks/dependencies: existing decimal data and product semantics require an explicit compatibility decision.
- Validation: zero, negative, fractional, maximum-safe, non-finite, encryption round-trip, and route-envelope tests.

## 3. Production dependency patch

- Problem: audit reports high findings in Next.js 16.2.10 and sharp 0.34.5.
- Affected users: all deployed users.
- Outcome: compatibility-reviewed patch versions with unchanged behavior.
- Score inputs: `4,4,5,1,5,5,5,5,4` → 80.
- Risks/dependencies: framework/lockfile regression and OCR image pipeline compatibility.
- Validation: audit, full tests, build, proxy/auth smoke, OCR trace/runtime smoke.

## 4. Protected-page boundary completion

- Problem: `/accounts`, `/budget`, and `/goals` are navigable authenticated pages but absent from the proxy protected-route list.
- Affected users: signed-out visitors and users with expired sessions.
- Outcome: redirect before private shell/API failure rendering.
- Score inputs: `4,3,3,4,5,5,5,5,5` → 78.
- Risks/dependencies: low; APIs already fail closed, so this is boundary consistency rather than a data-access bypass.
- Validation: callback cases for anonymous, valid, and invalidated sessions plus unauthenticated navigation smoke.

## 5. Account-aware scoped export

- Problem: “finance backup” omits accounts, recurring rules, settings, and transfer context; it has no date/account filters.
- Affected users: users reconciling, auditing, or moving data.
- Outcome: explicit data-export semantics, account/date filters, and transfer-aware rows.
- Product agent score: 78.
- Risks/dependencies: avoid excess sensitive data and preserve no-store/formula defenses.
- Validation: ownership, archived accounts, empty/large exports, transfer representation, CSV injection, date boundaries.

## 6. Notification preference enforcement

- Problem: settings persist reminder/summary/low-balance preferences, but monthly delivery does not read them; cron results serialize internal numeric user IDs.
- Affected users: notification users and operators.
- Outcome: schedule/preferences determine delivery and operational responses return aggregate, public-safe data.
- Score inputs: `4,4,4,4,4,4,4,4,5` → 77.
- Risks/dependencies: ambiguous custom-alert/low-balance semantics need product definition.
- Validation: Jakarta scheduling, opt-out, summary/reminder selection, retry claim, response privacy.

## Deferred opportunities

- Explainable non-prescriptive insights scored 82, but changing its API/copy requires explicit product compatibility acceptance.
- Duplicate transaction review scored 76; false-positive and idempotency semantics need design.
- Accessible dialogs scored 70 and should reuse `FeedbackModal` focus behavior.
- Ledger-backed goals, account reconciliation, recurring UI, OCR quotas, bcrypt byte limits, auth throttling, quote coalescing, CI/MySQL concurrency, and full browser accessibility remain valuable follow-ups.
