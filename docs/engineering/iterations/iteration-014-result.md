# Iteration 014 result: recurring route input structure

Date: 2026-07-28
Branch: `feat/loop-engineering-14-recurring-route-inputs`
Baseline: `87e4d96`

## Change

- Authenticate before awaiting recurring item params or reading request bodies.
- Require POST/PATCH JSON to be a non-null, non-array object.
- Accept item IDs only as canonical positive decimal strings within signed
  MySQL BIGINT range.
- Return exact private, unlogged standard validation envelopes for invalid JSON
  bodies and recurring IDs.
- Validate PATCH IDs before reading JSON.

Only invalid authenticated requests change: generic 500, alias, or inconsistent
handling becomes terminal 400. Valid create, manual process, update, missing/
foreign 404, and idempotent delete behavior is unchanged.

## TDD evidence

The RED run had 27 failing route cases plus the intentionally absent helper:

- malformed/non-object collection bodies still returned 500 or the misleading
  missing-fields response;
- malformed/non-object item bodies still returned 500;
- invalid IDs threw, aliased valid rows, or reached services;
- no canonical signed-BIGINT/object-shape helper existed.

The final focused run passes 5 suites and 169 tests: the new helper, recurring
collection/item routes, recurring service, and scheduler route. The three
directly changed suites pass 68 tests with 100% statements, branches, functions,
and lines across both routes and the helper.

The matrix covers:

- auth-before-params/body and invalid-ID-before-PATCH-body precedence;
- malformed JSON plus null, array, string, number, and boolean bodies;
- empty/populated object compatibility;
- zero, aliases, signs, whitespace, leading zeros, decimal/exponent/hex,
  Unicode, text, overflow, and oversized IDs;
- canonical `1` and `9223372036854775807`;
- unchanged create/manual-process mapping, PATCH `{}`, 404, domain 400,
  idempotent delete 200, generic safe-code 500, route privacy, and Loop 13
  transfer/cadence integrity.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Focused RED/GREEN | Helper, collection/item routes, recurring service, scheduler route | Pass: 5 suites, 169 tests |
| Changed production coverage | Direct route/helper Jest coverage | Pass: 100% statements, branches, functions, and lines |
| Prisma generation | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Full tests | `npm test -- --runInBand` | Pass: 54 suites, 532 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Production audit | `npm audit --omit=dev` | 0 Critical, 2 known High; Next only via transitive sharp |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Loop 13 target audit | Read-only aggregate query | Not run; mandatory zero-result deployment gate remains open |
| Diff whitespace | `git diff --check` | Pass |

## Independent review

- Product approved the exact validation envelopes, precedence, supported
  clients, and unchanged valid request contracts.
- Finance verified objects and IDs reach the same owner-scoped services without
  cloning, coercion, normalization, financial, cadence, or encryption changes.
- Security verified no unauthenticated parsing oracle, input/identifier leak,
  unexpected logging, or authorization change.
- QA independently reran 5 suites/169 tests and verified 100% changed production
  coverage plus the full invalid/boundary matrix.
- Release independently reran 5 suites/169 tests and required cumulative audit,
  mixed-replica, and rollback wording; all are recorded below.

No introduced Critical, High, Medium, or Low code finding remains.

## Limitations and cumulative deployment stop

Field-level type/frequency/cadence/text/account-ID schemas, unknown-key policy,
empty PATCH behavior, content-type/body-size policy, CSRF/rate limiting, and
public recurring IDs remain separate work.

Production deployment of the cumulative Loop 13/14 artifact is blocked until
Loop 13's target read-only aggregate audit returns zero malformed recurring
transfer/cadence rows. `P1001` and unavailable Docker do not satisfy that gate.
Any hit requires owner-approved remediation; Loop 14 neither weakens nor
bypasses this requirement.

## Release and rollback

After the cumulative audit gate is satisfied, deploy as an application-only
change and drain old replicas promptly. Mixed Loop 14 replicas can classify the
same invalid authenticated request as 400 or 500. If Loops 13/14 ship together,
pre-13 replicas can additionally accept or materialize corrupt rules until
drained. Valid traffic remains order-independent.

A Loop-14-only rollback needs no database restore and restores invalid-request
500/alias/inconsistent behavior. Rolling back the combined Loop 13/14 artifact
also reopens one-sided recurring transfers and malformed-cadence
materialization; it does not repair stored rows or waive the target audit.

Safe runtime smoke remains signed-out only. Authenticated invalid-input and
canonical max-ID checks belong in isolated staging; never smoke valid
create/update/delete/manual processing against production financial data.

## Quality score

Score: 94/100. The invalid-input boundary has complete focused coverage, the
full build and five reviews pass, and no valid financial behavior changed. The
open cumulative target audit and unavailable isolated MySQL evidence keep it
below 95 and block deployment, not the local artifact.

## Next recommendation

Assess the remaining recurring field-level boundary as separate, explicit
compatibility slices; do not combine text, account-ID, and schedule policies.
