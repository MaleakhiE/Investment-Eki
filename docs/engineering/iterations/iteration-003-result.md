# Iteration 003 result: account-aware data export

Date: 2026-07-27
Branch: `feat/loop-engineering-3-account-aware-export`
Baseline: `24ee7d9`

## Selected opportunity

Loop 3 replaced the misleading “JSON backup” contract with a versioned
plaintext data export and added a scoped transaction CSV. The higher-ranked
canonical IDR boundary remains gated by owner policy decisions. The reviewed
Next.js/sharp advisories remain gated because the latest stable Next.js
release is still in the reported vulnerable range.

## Change

- JSON now exports allowlisted account source records and transfer-aware
  transactions without internal IDs, receipt images, credentials, or
  ciphertext.
- The JSON contract is versioned, names notable exclusions, and is explicitly
  described as plaintext and non-restorable.
- CSV accepts optional inclusive `from`, `to`, and owned active/archived
  `accountId` filters.
- Account-scoped rows include a signed delta: income/incoming transfers are
  positive; expenses/outgoing transfers are negative.
- Strict route validation covers civil dates, signed-BIGINT account bounds,
  reversed ranges, unsupported formats, JSON filters, and summary/filter
  ambiguity.
- The settings UI exposes native date/account filters, detailed failures,
  account-catalog retry state, secure-storage guidance, minimum touch targets,
  and visible focus treatment.
- Prisma reads use explicit selects and deterministic transaction ordering;
  receipt-image amplification is removed.

The CSV schema intentionally changes from five to eight positional columns:
`Date`, `Type`, `Category`, `Description`, `Amount`, `Source Account`,
`Destination Account`, and `Account Delta`.

## TDD evidence

The first focused run failed 30 export tests for the missing service and route
contract. Review follow-ups added RED cases for the MySQL date floor, signed
BIGINT maximum, notable exclusions, and summary/filter ambiguity. The final
focused run passes 39 tests.

Changed-boundary coverage is:

| Metric | Coverage |
| --- | ---: |
| Statements | 98.21% |
| Branches | 88.09% |
| Functions | 100% |
| Lines | 100% |

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm ci` | Pass: 674 packages |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint -- --max-warnings=0` | Pass |
| Focused tests | `npm test -- --runInBand src/services/export.service.test.ts src/app/api/export/route.test.ts` | Pass: 2 suites, 39 tests |
| Focused coverage | Jest coverage for export service and route | Pass: all aggregate metrics above 80% |
| Full tests | `npm test -- --runInBand` | Pass: 44 suites, 278 tests |
| Production build | `npm run build` | Pass, including OCR trace verification |
| Runtime API smoke | Anonymous filtered `GET /api/export` | Pass: private, non-cacheable `401` |
| Runtime page smoke | Anonymous private-page requests | Pass: `307` login redirects |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL host returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Production audit | `npm audit --omit=dev` | Pre-existing fail: 2 high Next.js/transitive sharp advisories |
| Diff whitespace | `git diff --check` | Pass |

Authenticated settings/export runtime verification was not possible without
the configured database. The service/route integration boundary is covered by
tests and the production build.

## Independent review

- Product: approved after plaintext secure-storage guidance, truthful
  `notable_exclusions`, summary retry state, and summary/filter rejection.
- Finance: no critical/high findings; transfer inclusion and signed deltas
  match account balance semantics.
- Security: approved with no unresolved implementation-level medium finding;
  auth scoping, indistinguishable foreign/missing accounts, safe selects,
  formula neutralization, and no-store behavior were verified.
- QA: account bounds, touch targets, focus visibility, summary failure state,
  and ambiguous query behavior were addressed.
- Release: approved after remediation; no critical, high, or medium acceptance
  blocker remains.

## Remaining risks

- Export generation remains buffered in memory. Receipt payloads are no longer
  loaded; introduce quotas/streaming only after measuring production dataset
  and heap limits.
- Monetary values retain the existing JavaScript `number` precision boundary.
  Canonical IDR scale, maximum, rounding, sign, and compatibility policy still
  require owner decisions.
- JSON is a live multi-query data export, not an atomic point-in-time snapshot
  or database restore artifact.
- Account filter tokens remain internal account IDs scoped by ownership; user
  and relational IDs are absent from downloaded artifacts.
- Next.js/transitive sharp retain two pre-existing high audit advisories with
  no reviewed stable fully remediated Next.js release.

## Release and rollback

There is no schema, migration, dependency, lockfile, environment, or secret
change. Rollback is an application-code rollback; no database restore is
appropriate.

## Quality score

Score: 94/100. The slice meets its behavior, coverage, security, finance, UI,
documentation, and release acceptance criteria. Unavailable authenticated
runtime/database verification and accepted buffered-export/upstream advisory
risks keep it below 95.

## Next recommendation

Take a narrowly scoped notification privacy/correctness slice only after
separating the safe internal-ID response fix from product decisions about
reminder, summary, low-balance, and custom-alert semantics.
