# Iteration 025 plan: preserve transfer mutation invariants

## Problem

Generic transaction updates accepted existing `TRANSFER` rows and rewrote them
as ordinary income or expense records, risking loss of the balanced source and
destination relationship.

## Scope

- Reject generic updates for transfer records before encryption, account lookup,
  or persistence.
- Preserve dedicated atomic transfer creation and deletion behavior.

## Exclusions

No transfer-edit workflow or schema change.
