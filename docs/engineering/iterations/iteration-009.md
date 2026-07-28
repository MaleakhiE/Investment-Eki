# Iteration 009: bcrypt UTF-8 byte boundary

Date: 2026-07-28
Branch: `feat/loop-engineering-9-bcrypt-byte-boundary`
Baseline: `5d94054`

## Problem

The shared password validator enforces only an eight-character minimum.
Registration, password reset, and superadmin bootstrap therefore accept
passwords whose UTF-8 encoding exceeds bcrypt's effective input.

Official `node.bcrypt.js` documentation states that bcrypt uses only the first
72 bytes and ignores the remainder. Local bcrypt 6 evidence confirms that a
hash of 72 ASCII bytes plus one suffix accepts a different suffix, and the
same collision occurs after 18 four-byte emoji.

Source:
<https://github.com/kelektiv/node.bcrypt.js/blob/master/README.md#security-issues-and-concerns>

## Supported boundary

- Keep the existing minimum lengths: eight characters for user passwords and
  twelve characters for superadmin bootstrap.
- Accept at most 72 UTF-8 bytes, inclusive, using a browser/Node-native byte
  count rather than JavaScript character count or HTML `maxLength`.
- Apply the rule before every new bcrypt hash: registration, password reset,
  and superadmin seed configuration.
- Reuse the shared validation in registration and reset UI so users receive the
  same actionable error before a request.
- Leave credential comparison unchanged. Existing accounts created with
  over-limit input must remain able to sign in and replace their password.

## TDD seams

1. Exactly 72 ASCII or multibyte UTF-8 bytes pass; 73 bytes fail.
2. The eight-character minimum and accepted 8–72-byte behavior remain
   unchanged; no normalization or truncation occurs.
3. Registration rejects before email lookup, hashing, user creation, or public
   identity backfill.
4. Password reset rejects before token lookup, consumption, hashing, user
   update, or session-version increment.
5. Seed configuration rejects before encryption, hashing, or upsert.
6. Registration/reset routes keep their shared 400 validation envelope and
   never echo password material.
7. Registration/reset pages use byte-aware shared validation; login keeps
   sending the original password to bcrypt comparison for legacy compatibility.

## Acceptance criteria

1. No new or replacement bcrypt password can contain ignored suffix bytes.
2. Existing login, OAuth-only account, reset token, session revocation,
   bootstrap ownership, API success shape, and navigation behavior remain
   unchanged.
3. Password plaintext is never logged, returned, stored, normalized, or
   silently truncated.
4. Changed production code has at least 80% statement coverage and focused/full
   tests, Prisma validation, TypeScript, lint, build/OCR tracing, audit
   classification, and diff checks pass.
5. Independent product, finance, security, QA, and release reviews report no
   unresolved finding.

## Explicit exclusions

- Legacy over-72-byte credential migration or forced reset.
- Applying the new-password validator during login.
- Bcrypt cost or algorithm migration, Argon2, composition rules, password
  history, breach checks, Unicode normalization, or whitespace changes.
- Registration enumeration/P2002 response parity, credential timing
  equalization, login/registration throttling, or reset-request abuse policy.
- Schema, migration, dependency, financial, scheduler, UI redesign, or
  external-service changes.

## Release and rollback

This is an application-only validation change. Deploy only after registration,
reset, and seed fail-fast tests plus a production build. Rollback restores
acceptance of ambiguous new credentials and needs no database restore. Existing
hashes are not rewritten in either direction.
