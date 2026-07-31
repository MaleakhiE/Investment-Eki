# Iteration 034: auth configuration stability

Date: 2026-07-31
Branch: `feat/loop-engineering-34-auth-config-stability`
Baseline: `d01cf80`

## Problem

Authentication currently passes an invalid or missing secret through to Auth.js.
That can make an otherwise successful login fail on the next request when the
runtime cannot persist or verify the session cookie. Branch 16 changed only
recurring description capacity and does not touch authentication.

## Acceptance criteria

- Preserve `AUTH_SECRET`/`NEXTAUTH_SECRET` and `AUTH_URL`/`NEXTAUTH_URL` aliases.
- Reject missing, placeholder, or short secrets before Auth.js is initialized.
- Keep the error actionable without exposing secret values.
- Preserve valid local/test configuration and existing session-version revocation.
- Add focused regression coverage, then run the full verification gates.

## Limits

No cookie migration, session revocation change, database migration, dependency
change, or production deployment claim. A secret mismatch between running
instances still requires deployment/operator verification.
