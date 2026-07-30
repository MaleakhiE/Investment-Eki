# Iteration 017 result: recurring category and aggregation integrity

Date: 2026-07-28
Branch: `feat/loop-engineering-17-recurring-category-integrity`
Baseline: `83f10a3`

## Change

- Require recurring categories to be non-whitespace strings through 50 Unicode
  code points while preserving accepted text exactly.
- Preserve owner-first PATCH lookup, omission, deactivation, and correction
  semantics; reject activation with an unchanged invalid legacy category.
- Fail due invalid legacy categories before a transaction and expose no
  misleading `next_run`.
- Use `Map` plus `Object.fromEntries` in both expense-category summary paths so
  `__proto__`, `constructor`, `toString`, and ordinary names remain exact
  numeric own properties through JSON serialization.

No category is trimmed, normalized, mapped, blacklisted, or truncated.

## TDD evidence

The RED run had 39 failures. Invalid categories reached persistence or silently
no-op'd, legacy categories remained schedulable, and both summary paths dropped
or coerced Object-prototype-reserved category names.

The final focused run passes 9 suites and 390 tests. The complete suite passes
55 suites and 681 tests. All 26 changed production statements execute.

The matrix covers runtime types, empty/ASCII/Unicode whitespace, 50/51 ASCII and
astral code points, exact accepted text, owner-first PATCH, legacy activation/
deactivation/correction, pre-transaction failure, exact scheduled copying,
reserved-key repeated sums, own-property checks, JSON serialization, savings,
and export regressions.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused category/reporting matrix | 9 service/route/report/export suites | Pass: 390 tests |
| Changed production coverage | Focused Jest coverage | Pass: 26/26 statements |
| Prisma generation | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 55 suites, 681 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev` | 0 Critical, 2 known High from transitive sharp; force-fix downgrade rejected |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `docker info` prerequisite | Environment-blocked: Docker daemon unavailable |
| Loop 13/16/17 target audits | Schema plus aggregate-only queries | Not run; all three zero-result gates remain open |
| Diff whitespace | `git diff --check` | Pass |

## Independent review

- Product approved exact text, route/PATCH compatibility, legacy behavior, and
  unchanged JSON response contracts.
- Finance approved category financial meaning, exact totals, atomic posting,
  and idempotency.
- Security approved bounded validation, ownership/privacy, injection defenses,
  and both aggregation fixes.
- QA independently verified recurring, reporting, savings, and export seams.
- Release approved the implementation and required the audit, mixed-version,
  and rollback record below.

No introduced Critical, High, Medium, or Low code finding remains.

## Exact target audit and evidence restriction

Verify through `information_schema.columns` that
`recurring_transactions.category` and `transactions.category` are both
utf8mb4-compatible `VARCHAR(50) NOT NULL`.

The application whitespace set is ECMAScript `TrimString`:
`U+0009..U+000D`, `U+0020`, `U+00A0`, `U+1680`, `U+2000..U+200A`,
`U+2028`, `U+2029`, `U+202F`, `U+205F`, `U+3000`, and `U+FEFF`.
Before auditing data, validate the target MySQL ICU predicate against one value
for every listed code point plus non-whitespace controls. Do not assume
`[[:space:]]` is equivalent. A predicate mismatch is a deployment stop.

Using that validated predicate, aggregate all recurring rows and return only:
over-50 reason count, whitespace-only reason count, and combined invalid total/
active/inactive counts. Every invalid count must be zero. Only counts and
schema metadata may leave the target—never category text, IDs, user IDs,
descriptions, amounts, or ciphertext. Any hit requires owner-approved
correction/deactivation/deletion, notification, and reporting-history policy;
never mutate automatically.

Production remains blocked until Loop 13, 16, and 17 audits pass. `P1001` and
unavailable Docker satisfy none.

## Release and rollback

This is application-only: no schema, stored-data, dependency, environment, or
secret change. Old writers may accept whitespace, silently ignore falsy PATCH
values, or return a database/private 500; new writers return 400. Old summary
readers can misaggregate prototype-reserved names while new readers return
correct numeric own properties. Ordinary valid categories are mixed-version
safe, but drain promptly or use blue/green deployment.

Pause the scheduler; confirm all three predeploy audits are zero; deploy and
drain old readers/writers; rerun all three audits; resume only while every
post-drain result remains zero.

A validation-only rollback needs no database restore but restores invalid
acceptance and falsy PATCH no-op; old-writer rows persist. Retain the Map
aggregation hardening during such a rollback. Reverting it separately reopens
incorrect financial summaries for existing and future prototype-reserved
categories and requires explicit acceptance plus a reserved-name count.
Combined Loop 13–17 rollback reopens prior recurring failures and waives no
audit.

## Quality score

Score: 94/100. The end-to-end category path has complete changed-statement
coverage, full regression/build evidence, and five independent approvals.
Unavailable target-data and isolated-MySQL evidence block production, not the
local artifact.

## Next recommendation

Assess the next safe evidence-backed item. Canonical IDR amount limits,
notification timing, recommendation semantics, retry idempotency, and
historical category regrouping still require owner/product policy.
