# Iteration 023 plan: strict decrypted-number parsing

## Problem

`decryptNumber()` used `parseFloat()`, so decrypted strings such as `100junk`
silently became `100`, and only `NaN` was rejected. Corrupted or legacy
encrypted monetary data could masquerade as valid money.

## Scope

- Replace `parseFloat()` in `decryptNumber()` with strict full-string signed
  decimal validation plus a finiteness guard.
- No caller, schema, or encryption-format change.

## Exclusions

No re-encryption of existing values and no change to `encrypt`/`decrypt`.

## Acceptance criteria

- Canonical signed decimals round-trip unchanged.
- Trailing suffixes, hex, `Infinity`, `NaN`, and empty strings throw.
- Surrounding whitespace from legacy writers is tolerated.
