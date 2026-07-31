# Investment-Eki current state

Date: 2026-07-31
Baseline commit: `876ded1`
Iteration branch: `feat/loop-engineering-29-goal-delete-id-boundary`

## Product and architecture

Investment-Eki is a Next.js 16.2.12/React 19 personal-finance application backed by Prisma 6/MySQL. It supports credential and Google authentication, dashboard analytics, encrypted cashflow and transactions, financial accounts and transfers, receipt OCR, budgets, recurring transactions, goals, investments, exports, notifications, password reset, and superadmin SMTP configuration.

Routes live in `src/app`, domain services in `src/services`, cross-cutting server helpers in `src/lib`, and forward-only schema changes in `prisma/migrations`. API handlers use the envelope from `src/lib/api-response.ts`.

The identity boundary retains internal BIGINT relational keys while JWT/session/API identity uses `users.public_id`. `src/lib/auth-session.ts` resolves public UUIDs; `session_version` invalidates old JWTs after password reset. Existing accounts/transfers, recurring occurrence idempotency, hardened review-first OCR, fail-closed cron auth, private exports, and CSV formula neutralization must not be duplicated or weakened. JSON export is now explicitly a versioned, non-restorable data export; CSV supports owned-account and inclusive date filters with transfer-aware signed deltas.

Auth.js now receives one explicit `AUTH_SECRET`/`NEXTAUTH_SECRET` resolution in
both the proxy and Node handlers. Production must replace the example secret,
set the real `AUTH_URL`/`NEXTAUTH_URL`, use identical values across instances,
and clear old cookies after rotation. Browser and multi-instance validation
remain deployment gates because the configured MySQL is unreachable here.

Goal create and update boundaries now share finite monetary validation and
strict goal-field validation. Explicit goal names, categories, priorities, and
deadlines fail before persistence; explicit deadline clearing remains
supported. The configured Test-Eki MySQL currently reports all nine migrations
up to date.

Goal DELETE now shares the canonical signed-BIGINT ID boundary with PATCH and
rejects malformed IDs before the scoped delete service.

The read-only Cashflow history overlay now uses a labelled native modal dialog
with reversible focus and scroll lifecycle wiring. Budget/Goal forms and the
mobile More sheet retain their existing hand-built overlay implementations.

The Budget create form now also uses the shared labelled native dialog with
associated controls and reversible focus/scroll lifecycle. Goal forms and the
mobile More sheet remain separate follow-up slices.

The mobile More sheet now also uses the shared native dialog lifecycle while
preserving its navigation and sign-out behavior.

The Goal create/edit form now uses the shared labelled native dialog with
associated controls and reversible focus/scroll lifecycle. The remaining
dialog migration backlog is now subject to browser/staging smoke evidence.

Goal Add Amount writes now use an ownership-scoped encrypted compare-and-swap
with bounded fresh-state retries. The API/service reject non-finite and
non-positive additions, malformed bodies, invalid IDs, and non-finite results
before persistence. Exact HTTP retry idempotency and absolute-edit precedence
remain separate product/schema decisions.

All newly persisted bcrypt passwords now enforce the algorithm's inclusive
72-byte UTF-8 input boundary across registration, password reset, and
superadmin seed configuration. Registration/reset pages use the same shared
validator. Credential login intentionally remains permissive for compatibility
with historical hashes created from over-limit input.

Transaction create/update/transfer and recurring-rule create/update now share a
finite-positive amount boundary and strict real `YYYY-MM-DD` parsing within
MySQL's supported date range. Accepted dates persist at UTC midnight; valid
fractions remain unchanged. Recurring end-date clearing and all scheduler
cadence/idempotency behavior remain unchanged.

All monetary write paths now share the same compatibility-preserving IDR
boundary: finite values only, at most two decimal places, and a maximum of
90,000,000,000,000. Positive domains reject zero; cashflow components,
non-negative account opening balances, and goal current amounts may be zero.
Budget and goal routes return validation responses before encryption or
persistence. Existing encrypted values are not rewritten.

Transaction creation now accepts an optional `Idempotency-Key` header. The key
is user-scoped and unique; exact retries replay the original transaction,
changed payloads return a conflict, and concurrent key races reconcile by
reading the winner. Requests without a key remain compatible with the prior
create behavior. The migration must be deployed before clients rely on this.

The deployment recurring scheduler now returns only explicitly allowlisted
aggregate counts with private/no-store headers on every outcome. Its top-level
and shared per-rule posting failures log fixed events plus closed-taxonomy
codes, never raw errors or internal rule IDs. `P2002` duplicate occurrence
claims remain silent idempotent skips.

The session-authenticated recurring collection and item APIs now return
private/no-store headers on every outcome. Their unexpected catches reuse the
closed recurring error taxonomy and never log raw request, financial, route,
user, rule, account, session, or database details. Existing owner DTOs, manual
processing output, statuses, messages, and service scoping are unchanged.

Recurring rules now enforce exact financial type/frequency discriminators and
integer cadence requirements at the shared service boundary. PATCH preserves
omitted cadence while rejecting explicit null when the resulting frequency
requires that field. New invalid rules and legacy transfer or malformed-cadence
rows fail closed before scheduler materialization and expose no misleading
`next_run`.

Recurring POST/PATCH transport now accepts only JSON objects, while item routes
accept only canonical positive signed-BIGINT IDs. Authentication precedes all
input access, item ID validation precedes PATCH body parsing, and expected
structural faults return private, unlogged standard 400 validation envelopes.
Valid objects and IDs still reach the same owner-scoped services unchanged.

Optional recurring linked-account IDs now accept only canonical positive
signed-BIGINT strings at the shared service boundary. Create omission/null/
empty means no account; PATCH omission is unchanged and null/empty clears.
Owned-active lookup and persistence reuse the same parsed bigint.

Recurring descriptions now preserve exact text through 505 Unicode code points,
the lossless capacity remaining after the shared `[Auto] ` prefix. Oversized
legacy rows fail before posting transactions, count as failed, and expose no
`next_run`; they remain readable, correctable, and deactivatable.

Recurring categories now require exact preserved non-whitespace strings through
50 Unicode code points. Invalid legacy categories fail before posting and have
no `next_run`. Both expense-category summary paths use key-safe Map aggregation,
so prototype-reserved names remain correct numeric JSON properties.

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
| Tests | `npm test -- --runInBand` | Pass: 55 suites, 681 tests |
| Build | `npm run build` | Pass, including OCR trace verification |
| Migration status | `npm run db:status` | Environment-related failure: configured MySQL returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-related failure: Docker daemon unavailable |
| Dependency audit | `npm audit --omit=dev --json` | Partial remediation: 0 Critical, 2 High; Next is affected only via residual transitive sharp |

## Runtime and UI evidence

Local HTTP smoke confirms protected pages redirect anonymous users, `/api/export` returns a private non-cacheable `401`, and the monthly scheduler returns a private non-cacheable `401` for an invalid cron credential without invoking delivery. Authenticated export/UI and valid scheduler smoke remain unavailable; the configured MySQL host is unreachable, and a valid scheduler request can mutate claims and send real email.

The Next 16.2.12 production smoke also confirms `/login` returns 200, ordinary
public SVG assets return 200, the unused `/_next/image` endpoint returns 404,
protected pages return 307, live/readiness checks return 200, and representative
private APIs return 401 with their existing privacy/security headers. The
corrected localhost Auth.js origin run emitted no server errors.

Authenticated visual, responsive, focus-order, keyboard, and live
accessibility checks remain unverified. The isolated Cashflow dialog browser
smoke also could not run because this session exposed no browser backend;
native top-layer, keyboard, mobile overflow, and focus restoration remain a
staging release gate.

## Main integrity and security risks

- Investment snapshot and generated-expense writes are atomic for new writes; historical decreases, deletes, and prior divergence remain separate design/reconciliation work.
- Transaction-derived cashflow and independently writable `MonthlyCashflow` can disagree.
- Goal additions no longer use the known last-writer-wins path: their
  ownership-scoped CAS compares the complete mutable snapshot and retries from
  fresh encrypted state. Real InnoDB contention remains a deployment gate;
  ambiguous HTTP retries can still duplicate a contribution, and absolute
  edits still need an explicit conflict policy.
- Transaction and recurring write inputs now reject non-finite values. Other
  money boundaries still lack one canonical rounding, scale, integer, sign,
  and maximum policy.
- Historical malformed recurring ciphertext is not reconciled; the scheduler
  can still copy such a legacy value into a transaction. Detection and repair
  need a separate data-handling policy and staging evidence.
- New recurring transfer and malformed-cadence writes are rejected, and legacy
  transfer or malformed-cadence rows fail closed during processing/read
  presentation. The required target aggregate audit could not run because
  MySQL is unreachable; deployment must stop until it returns zero, with any
  hit requiring owner-approved remediation.
- New recurring descriptions cannot exceed the materializable 505-code-point
  capacity. A second target audit must verify both description columns and
  return zero total/active/inactive rows above 505 characters. Production
  remains stopped until both Loop 13 and Loop 16 audits pass; `P1001` and
  unavailable Docker satisfy neither.
- New recurring categories fit both 50-character columns and cannot be blank.
  A third target audit must verify both category columns, validate the target
  whitespace predicate against the ECMAScript `TrimString` matrix, and return
  zero invalid total/active/inactive rows. Production remains stopped until
  Loop 13, 16, and 17 audits all pass.
- Next.js is patched to 16.2.12, clearing the direct reviewed framework
  advisories. Audit still reports two High package entries because Next's
  supported optional `sharp ^0.34.5` resolves vulnerable sharp 0.34.5. The
  unused optimizer surface is disabled; do not force sharp 0.35 until a stable
  Next release declares compatibility.
- New bcrypt hashes can no longer contain silently ignored suffix bytes.
  Historical over-72-byte credentials remain compatible but need an explicit
  remediation/reset policy.
- Login/registration throttling, credential timing, and registration
  account-enumeration behavior need separate auth-hardening contracts.
- Notification delivery honors explicit reminder and summary opt-outs for the
  derived monthly type. Reminder-day, end-of-month, low-balance, and
  custom-alert delivery semantics still require a product contract.
- Recurring JSON structure, item IDs, linked-account IDs, description capacity,
  and category integrity are validated before persistence. Prototype-reserved
  categories aggregate safely. Unknown keys and empty PATCH remain
  intentionally supported.

## Operational gaps

There is no GitHub Actions workflow, browser E2E stack, axe coverage, enforced coverage threshold, or successful disposable migration replay in this environment.
