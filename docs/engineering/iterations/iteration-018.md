# Iteration 018: Auth.js session configuration

Date: 2026-07-30
Branch: `feat/loop-engineering-18-auth-session-persistence`

## Problem

Login succeeded, but a subsequent protected-page navigation could appear to
log the user out. Branch 16 changed recurring data only; the auth boundary was
already using JWTs, public UUIDs, and database-backed `session_version` checks.
The checkout's `.env` contains the literal example secret and localhost URL.
Multiple deployments must also not resolve different Auth.js secret aliases.

## Change

- Resolve `AUTH_SECRET`/`AUTH_URL` first, with `NEXTAUTH_*` compatibility aliases.
- Pass the resolved secret explicitly through the shared Auth.js config used by
  both the Node handlers and Next.js proxy.
- Add a pure environment check that rejects missing, short, or example secrets.
- Update `.env.example` to use the canonical Auth.js names.

The application does not print secret values. Production still requires the
operator to set one high-entropy identical secret and the real public URL in
every instance, then clear old cookies after changing either value.

## Verification

- Auth environment and callback tests: 39 passing.
- Full Jest suite: 56 suites / 684 tests passing.
- TypeScript and lint passing.

Database reachability remains unavailable in this environment (`P1001`), so a
real multi-instance cookie/browser smoke test is still a deployment gate.
