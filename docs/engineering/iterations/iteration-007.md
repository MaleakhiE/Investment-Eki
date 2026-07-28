# Iteration 007: supported Next.js security patch

Date: 2026-07-27
Branch: `feat/loop-engineering-7-next-security-patch`
Baseline: `f155463`

## Selection

The production lock resolves Next.js 16.2.10. Current reviewed advisories mark
16.2.11 as the patched floor for multiple App Router, proxy, Server Action,
rewrite, cache, and image-optimizer vulnerabilities. Stable 16.2.12 is the
current patch release and keeps the project’s Node and React compatibility.

This repository relies on the Next proxy as its authenticated-page boundary,
so the proxy-bypass fix is directly relevant. It has no `next/image`,
`ImageResponse`, custom image loader, remote image pattern, Server Action,
custom rewrite, or custom redirect consumer.

## Supported boundary

- Pin `next` and `eslint-config-next` together at stable `16.2.12`.
- Regenerate the npm lock normally and require `npm ci` reproducibility.
- Keep React and React DOM at 19.2.3 and NextAuth unchanged.
- Set `images.unoptimized: true`. With no optimizer consumer, the native config
  removes the unused `/_next/image` processing surface while ordinary public
  assets remain available.
- Do not install or override sharp 0.35.x. Stable Next 16.2.12 still declares
  optional `sharp ^0.34.5`; forcing 0.35 crosses an unsupported minor boundary.
- Keep the transitive sharp 0.34.5 residual visible. Do not suppress the audit
  or claim that the dependency graph is clean.

Current Next canary/preview metadata accepts sharp 0.35.3, but production must
wait for a stable Next release with that declared range.

## Security evidence

- GitHub reviewed advisory `GHSA-6gpp-xcg3-4w24` affects Next >=16.0.0 and
  <16.2.11 and identifies 16.2.11 as patched.
- GitHub reviewed advisory `GHSA-f88m-g3jw-g9cj` affects sharp <0.35.0 and
  identifies 0.35.0 as patched.
- Registry metadata on 2026-07-27 reports Next 16.2.12 as latest stable and
  sharp 0.35.3 as latest stable.
- `npm audit fix --dry-run` proposes only Next/@next 16.2.12 changes and still
  reports the sharp-derived high findings. It is evidence, not an authorized
  automated rewrite.
- Official Next documentation supports patch-level upgrades and requires Node
  >=20.9.0; the local runtime is Node 24.12.0.

## TDD seams

1. Manifest and lock pin Next and eslint-config-next at 16.2.12.
2. Lock resolves @next/env, the installed platform SWC, and the Next ESLint
   plugin at 16.2.12.
3. React/React DOM stay 19.2.3.
4. No direct sharp dependency or sharp override is introduced; the lock keeps
   Next’s supported sharp range and current residual version.
5. Image optimization is globally disabled and the project continues to have
   no Next image consumer.
6. Proxy/auth, global headers, OCR route, OCR output tracing, exports, and full
   application behavior remain regression-covered.

## Validation

- RED version/config test before package changes, then GREEN.
- `npm ci`, dependency tree inspection, and lockfile-diff review.
- Prisma generate/validate, TypeScript, lint, focused Jest, full Jest, and
  production build including OCR trace verification.
- Production `next start` smoke: public pages, protected redirects, private API
  401s, security headers, public SVG 200, and `/_next/image` 404.
- In-memory sharp transform confirms the still-installed supported transitive
  binary remains operational while residual risk is documented.
- Audit JSON must show the direct fixed Next advisories gone; only sharp-derived
  Next/sharp findings may remain. Zero Critical is required.

## Scope exclusions

- No React, NextAuth, Prisma, source feature, schema, migration, API, copy,
  layout, canary/preview, `npm audit fix --force`, or unsupported sharp override.
- No authenticated OCR, export, scheduler, SMTP, financial write, or migration
  operation against real data solely for this patch.

## Release and rollback

Deploy only after the production-start smoke on the target platform. Rollback
restores the previous application artifact, `package.json`, `package-lock.json`,
and `next.config.ts` together, then rebuilds with `npm ci`; there is no
database/config-data restoration.

## Acceptance criteria

1. The supported direct Next vulnerabilities are outside the resolved version
   range and framework/lint packages remain coherent.
2. Auth/proxy, privacy headers, OCR tracing, and production runtime behavior
   pass without product changes.
3. The unused optimizer route returns 404 while public assets still work.
4. The sharp residual is mitigated, visible, and not falsely waived.
5. Independent product, finance, security, QA, and release reviews confirm
   zero Critical findings, cleared direct Next advisories, and explicit
   mitigation/acceptance of the unsupported-to-fix sharp-derived High.
