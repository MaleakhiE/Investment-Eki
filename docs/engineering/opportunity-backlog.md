# Evidence-backed opportunity backlog

Scores use a 95-point maximum:

`User value×3 + Correctness×3 + Security×3 + UX×2 + Architecture×2 + Testability×2 + Delivery confidence×2 + Maintenance + Dependency`.

Maintenance and dependency values are reverse-scored: 5 means low ongoing cost/risk.

| Priority | Opportunity | Score | Effort | Recommended iteration |
| ---: | --- | ---: | --- | --- |
| Done | Make investment snapshot and generated expense atomic and retry-safe | 83 | Small–medium | 001 |
| Done | Prevent concurrent encrypted goal additions from overwriting each other | 81 | Small | 008 |
| Done | Enforce bcrypt's 72-byte UTF-8 boundary for every new password hash | 84 | Small | 009 |
| Done | Reject non-finite amounts and normalized dates at direct transaction sources | 82 | Small | 010 |
| Done | Make recurring deployment-scheduler responses and logs private | 78 | Small | 011 |
| Done | Make session recurring API responses and logs private | 77 | Small | 012 |
| Done | Prevent invalid recurring cadence and one-sided transfer materialization | 87 | Small | 013 |
| Done | Validate recurring JSON structure and canonical item IDs | 73 | Small | 014 |
| Done | Enforce canonical optional recurring linked-account IDs | 76 | Small | 015 |
| Done | Prevent recurring description materialization overflow | 82 | Small | 016 |
| Done | Enforce recurring category and aggregation integrity | 84 | Small–medium | 017 |
| Done | Define and enforce canonical finite IDR boundaries across transaction, budget, and goal writes | 83 | Medium | 018 |
| Done | Patch direct reviewed Next.js production advisories | 80 | Small | 007 |
| Blocked | Remove the transitive sharp 0.34.5 advisory | 80 | Small–medium | First stable Next release supporting sharp >=0.35 |
| Done | Protect all navigable authenticated pages consistently | 78 | Small | 002 |
| Done | Add account-aware scoped export with explicit backup semantics | 78 | Small–medium | 003 |
| Done | Remove per-user metadata from monthly cron responses | 77 | Small | 004 |
| Done | Honor explicit monthly reminder/summary opt-outs | 77 | Small | 005 |
| Done | Migrate the read-only Cashflow history to a native accessible dialog | 70 | Small | 006 |
| 2 | Define and enforce notification timing and alert semantics | 77 | Medium | Needs product policy decision |
| 3 | Replace prescriptive investment recommendations with explainable descriptive insights | 82 | Medium | Requires product/API contract decision |
| Done | Add exact transaction retry idempotency | 76 | Medium | 019 |
| 4 | Add duplicate transaction review | 76 | Medium | After idempotency |
| Done | Migrate Budget form to the shared accessible dialog | 70 | Small | 020 |
| Done | Migrate mobile More navigation to the shared accessible dialog | 70 | Small | 021 |
| Done | Migrate Goal form to the shared accessible dialog | 70 | Small | 022 |
| Done | Enforce goal update field integrity before persistence | 82 | Small | 028 |
| Done | Enforce canonical goal DELETE identifiers | 79 | Small | 029 |
| Done | Consolidate account mutation ID boundaries | 79 | Small | 030 |
| Done | Enforce canonical budget DELETE identifiers | 78 | Small | 031 |
| Done | Enforce canonical investment snapshot DELETE identifiers | 78 | Small | 032 |
| Done | Consolidate shared bounded database ID parsing | 76 | Small | 033 |
| Done | Fail closed on invalid Auth.js session configuration | 81 | Small | 034 |
| Done | Sanitize transaction API error logging | 80 | Small | 035 |
| 5 | Continue accessible dialog migration for forms and mobile navigation | 70 | Medium | After native-dialog staging smoke |
| 6 | Unify transaction-ledger cashflow and legacy monthly aggregates | 74 | Large | Staged architecture work |

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

## Bcrypt new-password byte boundary (completed in 009)

- Historical problem: registration, reset, and superadmin bootstrap accepted
  passwords beyond bcrypt's effective 72 UTF-8 bytes, so distinct visible
  suffixes could authenticate as the same credential.
- Outcome: one shared inclusive byte boundary protects every reachable new
  local-password hash; client pages use the same rule, while login remains
  compatible with historical hashes.
- Score inputs: `4,5,5,2,4,5,5,5,5` → 84.
- Residuals: legacy over-limit hashes need an explicit remediation policy;
  registration enumeration, credential timing, and distributed throttling are
  separate contracts.
- Validation: official bcrypt documentation plus local collision proof,
  focused 7-suite/30-test RED/GREEN, 100% changed executable boundary
  statements, seed import smoke, full 51-suite/343-test regression,
  build/OCR trace, and five independent approvals.

## Strict financial write inputs (completed in 010)

- Historical problem: transaction create/update accepted non-finite amounts,
  and transaction, transfer, and recurring inputs allowed impossible dates to
  normalize before persistence. Recurring partial update also treated explicit
  invalid runtime values as omitted.
- Outcome: one shared finite-positive amount and exact real MySQL-range calendar
  boundary protects transaction create/update/transfer and recurring
  create/update before encryption or downstream writes.
- Score inputs: `5,5,4,2,4,5,5,5,5` → 82.
- Residuals: valid fractions remain supported because integer/scale/max rules
  need owner policy; historical malformed recurring ciphertext can still be
  materialized by the scheduler and needs separate reconciliation.
- Validation: focused 3-suite/75-test RED/GREEN, 100% of 29 changed production
  statements, full 51-suite/391-test regression, build/OCR trace, and five
  independent approvals.

## Recurring deployment-scheduler privacy (completed in 011)

- Historical problem: the deployment cron response lacked an explicit
  private/no-store policy, passed its service result object through directly,
  and logged raw top-level/per-rule errors plus an internal recurring ID.
- Outcome: every cron outcome is private/no-store, only the existing three
  aggregate counts cross the response boundary, and logs contain fixed events
  plus closed-taxonomy codes. Same-date `P2002` retry remains a silent skip.
- Score inputs: `4,4,5,2,4,5,5,5,5` → 78.
- Residuals: external cache/log/ingress behavior is a deployment control.
- Validation: focused 3-suite/52-test RED/GREEN, 100% of 15 changed production
  statements, full 51-suite/409-test regression, build/OCR trace, and five
  independent approvals.

## Session recurring API privacy (completed in 012)

- Historical problem: owner-facing recurring responses lacked explicit
  private/no-store headers, and all four route catches logged raw errors.
- Outcome: every collection/item outcome is private/no-store; unexpected logs
  contain only fixed operation labels plus closed-taxonomy codes. Statuses,
  bodies, owner DTOs, manual processing results, ownership, and financial
  behavior are unchanged.
- Score inputs: `4,4,5,2,4,5,5,5,5` → 77.
- Residuals: runtime request schemas and malformed JSON/BigInt status policy are
  separate work; proxy/CDN/access-log and prior-data handling remain deployment
  controls.
- Validation: focused 4-suite/63-test RED/GREEN, 100% of 25 changed production
  statements, full 53-suite/426-test regression, build/OCR trace, and five
  independent approvals.

## Recurring cadence integrity (completed in 013)

- Historical problem: runtime `TRANSFER` rules could later create one-sided
  transfers, while null/coerced cadence values could make weekly rules post
  daily, monthly rules default to day 1, or yearly rules never fire.
- Outcome: the shared service enforces exact type/frequency and integer cadence
  contracts, PATCH distinguishes omission from explicit null, and scheduler
  execution plus `next_run` fail closed for malformed legacy rows.
- Score inputs: `5,5,5,2,5,5,4,5,5` → 87.
- Residuals: the mandatory target aggregate audit is open because MySQL
  returned `P1001`; production deployment stops until it returns zero. Any hit
  requires owner-approved remediation. No automatic data rewrite is included.
- Validation: focused 4-suite/118-test RED/GREEN, 95% of 40 changed production
  statements, full 53-suite/481-test regression, build/OCR trace, and five
  independent approvals.

## Recurring route input structure (completed in 014)

- Historical problem: malformed/non-object JSON and noncanonical/out-of-range
  item IDs entered generic 500, alias, or inconsistent missing/no-op behavior.
- Outcome: authentication-first object parsing and canonical signed-BIGINT IDs
  return private, unlogged standard 400 validation envelopes for client faults,
  while valid objects/IDs and owner-scoped service contracts remain unchanged.
- Score inputs: `3,4,4,2,4,5,4,5,5` → 73.
- Residuals: field-level text compatibility remains separate. Linked-account
  validation was completed separately in 015. Cumulative
  production deployment is still blocked until Loop 13's mandatory
  target aggregate audit returns zero; `P1001`/Docker do not satisfy it.
- Validation: focused 5-suite/169-test regression, 100% changed production
  coverage, full 54-suite/532-test regression, build/OCR trace, and five
  independent approvals.

## Recurring linked-account identity (completed in 015)

- Historical problem: service-level `BigInt` coercion accepted account aliases
  and unsafe runtime values, while false/zero could silently clear a link.
- Outcome: one bounded parser accepts only canonical positive signed-BIGINT
  strings, preserves optional/clear semantics, and reuses the exact bigint for
  owned-active lookup and persistence.
- Score inputs: `4,5,4,2,4,5,5,5,5` → 76.
- Residuals: category policy remains separate. Description materialization
  capacity was completed in 016. Production remains blocked by the mandatory
  Loop 13 and Loop 16 target audits.
- Validation: focused 5-suite/225-test regression, 18/18 changed production
  statements, full 54-suite/588-test regression, build/OCR trace, and five
  independent approvals.

## Recurring description materialization capacity (completed in 016)

- Historical problem: both description columns allowed 512 characters, but
  automatic posting added `[Auto] ` and could repeatedly fail rules containing
  506 through 512 characters.
- Outcome: a prefix-derived 505-code-point boundary preserves text losslessly;
  legacy oversized rules fail before a database transaction and expose no
  misleading next run while remaining correctable/deactivatable.
- Score inputs: `5,5,4,3,4,5,5,5,5` → 82.
- Residuals: category integrity was completed in 017. Production requires
  zero-result Loop 13, 16, and 17 aggregate audits, with owner-approved handling
  for any historical hit.
- Validation: focused 5-suite/258-test regression, 24/24 changed production
  statements, full 54-suite/621-test regression, build/OCR trace, and five
  independent approvals.

## Recurring category and aggregation integrity (completed in 017)

- Historical problem: recurring category runtime values reached Prisma or
  silently no-op'd, invalid legacy categories remained schedulable, and plain
  object accumulators corrupted prototype-reserved financial grouping keys.
- Outcome: exact non-whitespace categories through 50 Unicode code points are
  enforced; legacy invalid rules fail closed; both summary paths use Map-based
  aggregation and preserve every exact numeric own JSON key.
- Score inputs: `5,5,5,3,4,5,5,5,5` → 84.
- Residuals: taxonomy, normalization, historical regrouping, and direct
  transaction width policy require separate decisions. Production requires
  zero-result Loop 13, 16, and 17 target audits.
- Validation: focused 9-suite/390-test regression, 26/26 changed production
  statements, full 55-suite/681-test regression, build/OCR trace, and five
  independent approvals.

## Canonical IDR input boundary

- Problem: budget, goal, and other money paths do not share canonical sign,
  scale, rounding, integer, or maximum rules. Budget output hides overage by
  clamping. Transaction/recurring non-finite rejection was completed in 010.
- Affected users: all users entering money.
- Outcome: one documented IDR policy and shared validation with signed overage semantics.
- Score inputs: `5,5,3,3,5,5,4,5,5` → 83.
- Risks/dependencies: existing decimal data and product semantics require an explicit compatibility decision.
- Validation: zero, negative, fractional, maximum-safe, non-finite, encryption round-trip, and route-envelope tests.

Completed in 018. The compatibility policy preserves fractions through two
decimal places, caps new monetary inputs at 90,000,000,000,000 IDR, and keeps
zero valid only for non-negative domains such as cashflow components, account
opening balances, and goal current amounts. No rounding, migration, or
historical rewrite was introduced.

## Exact transaction retry idempotency

Completed in 019. An optional user-scoped `Idempotency-Key` prevents duplicate
creates after network retries, returns exact replays, rejects changed payloads,
and reconciles concurrent unique-key races. Requests without a key retain the
legacy behavior. The migration must be deployed before clients depend on the
header.

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
- Ledger-backed goals, account reconciliation, recurring UI, OCR quotas,
  legacy over-limit credential remediation, auth throttling, quote coalescing,
  CI/MySQL concurrency, and full browser accessibility remain valuable
  follow-ups.
- Recurring category and description integrity are complete, subject to their
  mandatory target audits.

## Goal update field integrity (completed in 028)

- Historical problem: goal PATCH updates validated amounts only. Explicit
  invalid names, categories, priorities, and dates could be ignored, persisted,
  or normalized by JavaScript before the database boundary.
- Outcome: create/update use the same finite priority predicate; update fields
  reject before reads/writes, while valid partial edits and deadline clearing
  remain compatible.
- Score inputs: `5,5,4,3,5,5,5,5,5` → 82.
- Residuals: product-defined notification timing/recommendation semantics,
  browser/staging smoke, and historical recurring audits remain separate.
- Validation: RED/GREEN service and route matrix, full 65-suite/768-test
  regression, build/OCR trace, Prisma validation, and current migration status.

## Goal DELETE identifier boundary (completed in 029)

- Historical problem: DELETE coerced arbitrary route IDs with `BigInt`, causing
  generic failures and inconsistent handling compared with PATCH.
- Outcome: authentication-first canonical positive signed-BIGINT parsing now
  returns a private 400 before deletion; valid IDs and ownership semantics are
  unchanged.
- Score inputs: `5,4,4,3,5,5,5,5,5` → 79.
- Residuals: other route-specific ID boundaries and product-defined semantics
  remain separate opportunities.
- Validation: RED/GREEN route matrix, full regression, build/OCR trace, Prisma
  validation, migration status, and private-error assertions.

## Account mutation ID boundary (completed in 030)

- Historical problem: account PUT/DELETE used unbounded `BigInt` coercion and
  accepted noncanonical identifiers or generic-failure paths.
- Outcome: both mutations reuse `parseDatabaseId`; malformed IDs fail before
  service calls, while valid IDs retain ownership and response behavior.
- Score inputs: `5,4,4,3,5,5,5,5,5` → 79.
- Residuals: investment snapshot, budget, and other route-specific IDs require
  separate bounded slices; no broad rewrite is included.
- Validation: focused PUT/DELETE matrix, collection regressions, full
  66-suite/802-test regression, build/OCR trace, Prisma checks, and diff checks.

## Budget DELETE identifier boundary (completed in 031)

- Historical problem: budget DELETE directly coerced arbitrary route IDs and
  logged raw service errors.
- Outcome: shared bounded parsing returns private 400 responses before service
  access, and failures log only allowlisted codes; valid scoped deletion is
  unchanged.
- Score inputs: `5,4,4,3,5,5,5,5,5` → 78.
- Residuals: investment snapshot and other route-specific ID boundaries remain
  separate; no broad parser rewrite is included.
- Validation: focused route matrix, full 67-suite/814-test regression,
  build/OCR trace, Prisma checks, migration status, and diff checks.

## Investment snapshot DELETE identifier boundary (completed in 032)

- Historical problem: snapshot DELETE directly coerced arbitrary IDs and logged
  raw service failures.
- Outcome: shared bounded parsing and sanitized error-code logging now protect
  the route before service access; valid success/not-found behavior is intact.
- Score inputs: `5,4,4,3,5,5,5,5,5` → 78.
- Residuals: service-level concurrent deletion behavior and remaining product
  decisions are separate.
- Validation: focused route matrix, full 68-suite/827-test regression,
  build/OCR trace, Prisma checks, migration status, and diff checks.

## Shared bounded database ID parsing (completed in 033)

- Historical problem: goal and export routes duplicated signed-BIGINT parsing,
  creating drift risk after neighboring routes adopted the shared helper.
- Outcome: both callers use `parseDatabaseId`; existing messages, ownership,
  filtering, and response behavior remain unchanged.
- Score inputs: `4,4,4,3,5,5,5,5,5` → 76.
- Residuals: notification/recommendation product semantics, historical audits,
  and the blocked transitive sharp advisory remain.
- Validation: focused 62-test parser/export/goal matrix, full 68-suite/827-test
  regression, build/OCR trace, Prisma checks, migration status, and diff checks.
