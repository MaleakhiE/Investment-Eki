# Iteration 066 — merged-publication reconciliation

## Category

Reliability / developer experience

## Executive summary

Adds a fail-closed controller transition for the recovery case where GitHub merged a PR before durable acceptance was recorded. Normal publication ordering remains unchanged: authorize, publish while OPEN/DRAFT, accept, then merge.

## User or operational problem

Iteration 065 merged successfully, but the controller could only represent OPEN/DRAFT publication states and could not reconcile the verified merge. This left durable state contradictory to GitHub reality and prevented safe progression.

## Scope and non-goals

The change is limited to loop-control parsing, live PR verification, merged-publication reconciliation, and regression tests. It does not bypass review, authorization, branch protection, or merge checks, and it does not implement product functionality.

## Acceptance criteria

- Normal `record-publication` still accepts only OPEN/DRAFT PRs.
- A verified MERGED PR can be reconciled only when it matches the authorized commit, branch, repository, and base ancestry.
- `accept-iteration` can finalize the reconciled state.
- Invalid or mismatched merged evidence fails closed.

## Implementation details

- Added `reconcile-publication` CLI transition.
- Added MERGED live-state verification and durable-state parsing.
- Added policy regression coverage for post-merge reconciliation.

## Graph engineering impact

GitHub PR state → live verification → loop-controller reconciliation → accepted durable state → next iteration resolution.

## Security and compatibility

The transition requires the existing authorized HEAD and verified repository/branch/base ancestry. Existing OPEN/DRAFT publication and acceptance paths remain unchanged. No database, schema, secret, or runtime application behavior changes.

## Validation

- Loop-control Jest suites: passed — 3 suites, 100 tests.
- TypeScript: passed.
- ESLint: passed with the existing `_branch` warning.
- Diff check: passed.

## Review and rollback

Independent review is required before publication. Rollback is a revert of the controller and focused test changes; no migration rollback is required.

## Pull request

To be created after authorization.
