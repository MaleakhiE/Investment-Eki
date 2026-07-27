# Iteration 002 result: protected-page boundary completion

Date: 2026-07-27
Branch: `feat/loop-engineering-2-protected-page-boundary`
Baseline: `d843742`

## Selected opportunity

Loop 2 completed the centralized page authorization boundary for `/accounts`, `/budget`, and `/goals`. These private navigation destinations previously returned `200` to anonymous direct navigation, then rendered private-shell API error or misleading empty states. Their APIs already returned 401, so no data-access bypass was found.

The higher-scoring canonical IDR policy was deferred because fractional scale, maximum, rounding, sign, and existing-data compatibility require an explicit owner decision.

## Change

- Added the three omitted paths to the existing Auth.js protected-route list.
- Added a route matrix covering every current private page for anonymous, invalidated, and valid sessions.
- Covered anonymous auth/public pages and the existing authenticated-login redirect.
- Added no abstraction, dependency, API/schema change, migration, or page-level redirect effect.

## TDD evidence

The focused test first failed in six cases: anonymous and invalidated access to each omitted page returned `true`. After the three route entries were added, all 36 focused authorization tests passed.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Install | `npm ci` | Pass |
| Prisma generate | `npm run db:generate` | Pass |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Focused tests | `npm test -- --runInBand src/lib/auth.config.test.ts` | Pass: 36 tests |
| Full tests | `npm test -- --runInBand` | Pass: 44 suites, 253 tests |
| Production build | `npm run build` | Pass, including OCR trace verification |
| Runtime smoke | Anonymous GET `/accounts`, `/budget`, `/goals` | Pass: 307 to `/login?callbackUrl=...` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Production audit | `npm audit --omit=dev --audit-level=high` | Pre-existing fail: 2 high Next.js/sharp advisories |
| Diff whitespace | `git diff --check` | Pass |

One intermediate full-suite run raced concurrently with Prisma generation and temporarily could not read the generated client. The required sequential rerun passed all 253 tests; this was a validation-command ordering error, not a product failure.

## Review

- Security: no new exposure; the change adds defense in depth and consistent private-page UX while API authorization remains authoritative.
- Finance: no financial source of truth, money behavior, encryption, user scoping, or persistence changed.
- UX/accessibility: anonymous redirect behavior is verified by HTTP smoke; authenticated visual, keyboard, responsive, and live accessibility behavior was not browser-tested.
- Release: no migration or deployment sequencing is required; rollback is a code revert.

## Remaining risks

- Next.js and transitive sharp retain two high production advisories.
- Login/registration throttling, registration enumeration, and password-reset limiter denial-of-service need a separate auth-hardening slice.
- Canonical IDR policy and concurrent goal contribution integrity remain financial follow-ups requiring explicit semantics.
- Docker-backed migration replay was unavailable.

## Quality score

Score: 93/100. The slice meets its acceptance criteria with focused matrix coverage, full regression tests, a production build, runtime anonymous redirect evidence, and independent reviews. Missing authenticated browser/accessibility evidence and the pre-existing dependency advisories keep it below 95.

## Next recommendation

Patch the reviewed Next.js/sharp advisories in a compatibility-tested security-maintenance slice. After that, resolve the owner decisions for canonical IDR boundaries before implementing the next financial slice.
