# Iteration 007 result: supported Next.js security patch

Date: 2026-07-27
Branch: `feat/loop-engineering-7-next-security-patch`
Baseline: `f155463`

## Change

- Pinned Next and eslint-config-next from 16.2.10 to stable 16.2.12.
- Regenerated the npm lock normally. Churn is limited to Next, @next/env, the
  Next ESLint packages, and eight platform SWC lock records.
- Preserved React/React DOM 19.2.3, NextAuth, all product source, Prisma, and
  every financial/API contract.
- Set `images.unoptimized: true` because the project has no Next image
  optimizer consumer. Ordinary public assets remain direct.
- Added an exact manifest/lock/config regression contract.
- Kept supported transitive sharp 0.34.5 with no direct dependency or override.

## TDD evidence

The RED run failed two of three cases: the manifest/lock still used 16.2.10 and
image optimization remained enabled. After the normal package update and
native config mitigation, the focused framework/proxy/OCR/auth run passes 5
suites and 58 tests.

The version contract now pins Next, eslint-config-next, @next/env, the Next
ESLint plugin, every recorded platform SWC package, React/React DOM, the
supported sharp boundary, and disabled optimizer configuration.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Lock reproducibility | `npm ci` | Pass: 674 packages installed; Prisma generated |
| Dependency tree | `npm ls next eslint-config-next @next/env @next/eslint-plugin-next sharp --all` | Pass: coherent 16.2.12 tree; sharp 0.34.5 only via Next |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Focused tests | Framework, proxy, OCR build/route, and auth config Jest | Pass: 5 suites, 58 tests |
| Full tests | `npm test -- --runInBand` | Pass: 46 suites, 297 tests |
| Production build | `npm run build` | Pass on Next 16.2.12, including OCR trace verification |
| Trusted sharp transform | In-memory 1x1 PNG | Pass: sharp 0.34.5/libvips 8.17.3, 91 bytes |
| Prisma migration status | `npm run db:status` | Environment-blocked: direct MySQL host returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Production audit | `npm audit --omit=dev --json` | 0 Critical, 2 High; Next via only sharp, sharp GHSA remains |
| Diff whitespace | `git diff --check` | Pass |

## Production runtime smoke

With temporary localhost Auth.js origin/trust settings matching port 3107:

- `/login` returned 200 with CSP, HSTS, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.
- `/dashboard`, `/accounts`, `/budget`, `/goals`, `/analytics`, and `/settings`
  returned 307 login redirects.
- `/file.svg` returned 200.
- `/_next/image?url=%2Ffile.svg&w=640&q=75` returned 404 with security headers.
- `/api/health/live` and `/api/health/ready` returned 200/no-store.
- Anonymous export and OCR returned 401; export remained private/no-store.
- Invalid cron bearer returned the existing private/no-store 401.
- The corrected Auth.js origin run emitted no server error.

The first smoke inherited a port-3000 Auth.js URL while listening on 3107 and
logged `UntrustedHost`; rerunning with matching temporary localhost settings
removed that environment mismatch. No repository credential/config was changed.

Authenticated OCR/export/UI writes were deliberately not executed against real
data. Target Linux native binaries and isolated review-only OCR remain
deployment gates.

## Security result

GitHub's reviewed Next proxy advisory affects versions below 16.2.11; the
resolved 16.2.12 is outside that range. Post-patch audit contains no direct
Next advisory object: `next.via` is exactly `["sharp"]`.

The remaining sharp High is not called resolved or waived. Stable Next 16.2.12
declares `sharp ^0.34.5`, which excludes fixed 0.35.x. Disabling the unused
optimizer makes the observed `/_next/image` input surface unavailable, but the
installed dependency remains a monitored residual until stable Next supports
the patched line. npm's proposed Next 14 downgrade, force fixes, overrides,
canary, and preview versions are rejected.

## Independent review

- Product approved the dependency-only patch and no-user-visible optimizer
  policy after verifying no image consumer.
- Finance approved unchanged financial, identity, privacy, cache, OCR, export,
  recurring, investment, notification, and cross-user contracts.
- Security approved cleared direct advisories, 404 optimizer mitigation,
  truthful residual audit, and absence of unsupported overrides.
- QA approved exact lock coherence, full gates, and explicit 2 High/0 Critical
  classification.
- Release approved local reproducibility and requires target-platform native
  binary/runtime gates before deployment.

No introduced Critical, High, or Medium code finding remains. The known
sharp-derived High is an explicitly visible, mitigated dependency residual.

## Release and rollback

On the target Linux image, run `npm ci`, build, production start, protected
redirect/private API/security-header checks, public asset 200, optimizer 404,
OCR trace, and an isolated review-only OCR smoke. Local macOS evidence does not
prove target SWC/sharp binaries.

Rollback restores the previous artifact, `package.json`, `package-lock.json`,
and `next.config.ts` together and rebuilds with `npm ci`. No database,
config-data, or secret restore is required. Rollback reintroduces the direct
Next vulnerabilities and optimizer surface, so prefer a forward fix and use
rollback only for a material runtime regression.

## Quality score

Score: 94/100. Direct framework remediation, deterministic install, tests,
build, local production runtime, OCR tracing, and independent reviews pass.
The supported-range sharp residual and unavailable target-platform/DB replay
keep it below 95.

## Next recommendation

Monitor stable Next releases for declared sharp 0.35.x support. Do not spend
another loop forcing the current stable graph.
