# Iteration 002: protected-page boundary completion

Date: 2026-07-27
Branch: `feat/loop-engineering-2-protected-page-boundary`
Baseline: `d843742`

## Problem and evidence

`src/lib/auth.config.ts` protects most private pages at the NextAuth proxy boundary but omits `/accounts`, `/budget`, and `/goals`. Those routes are exposed by authenticated navigation and immediately call authenticated APIs, so signed-out or invalidated sessions can render the private shell and misleading error/empty states before the APIs correctly return 401.

This is a boundary-consistency and UX hardening gap, not a demonstrated data-access bypass: the affected APIs already fail closed.

## User story

As a signed-out user or a user whose session was revoked, direct navigation or refresh on any private FinTrack page should enter the login flow before private UI or API-failure states render.

## Scope

- Add `/accounts`, `/budget`, and `/goals` to the existing protected route list.
- Add callback-level regression coverage for anonymous, authenticated, and invalidated sessions.
- Preserve current API authorization, auth-route redirects, public routes, and session-version revocation.

## Exclusions

- No protected-layout rewrite, new auth abstraction, role-policy change, API/schema change, migration, or dependency.
- No canonical IDR policy; fractional scale, maximum, rounding, sign, and compatibility semantics require owner confirmation.
- No auth throttling, registration-enumeration, or superadmin page-boundary work.

## Failure modes and test seam

The public seam is `authConfig.callbacks.authorized`.

- Anonymous or invalidated session on a protected page: callback returns `false`.
- Valid session on a protected page: callback returns `true`.
- Authenticated user on an auth page: existing redirect remains unchanged.
- Unrelated public page: remains allowed.

## Security, data, and recovery

The API remains the authoritative data-access boundary; this change adds earlier page-level rejection. No financial values, identity representation, persistence, or response contract changes. Rollback is a code revert.

## Acceptance criteria

1. Anonymous access to `/accounts`, `/budget`, and `/goals` is rejected by the centralized callback.
2. Invalidated sessions are rejected and valid sessions remain allowed on every navigable private page.
3. Existing auth/public route behavior remains compatible.
4. Focused tests, Prisma validation, TypeScript, lint, full Jest suite, production build, and diff checks pass.
5. Independent security, finance, and release review finds no unresolved high-severity regression.
