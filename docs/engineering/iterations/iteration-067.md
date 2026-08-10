# Iteration 067 — merged-evidence regression coverage

## Category

Testing / governance reliability

## Objective

Lock the fail-closed contract for merged-publication reconciliation after Iteration 066 introduced the recovery transition.

## Evidence and scope

Review identified that successful reconciliation was covered but mismatched commit, PR URL, and non-merged state cases were not. This iteration adds only those policy regressions; no runtime application or database code changes.

## Acceptance criteria

- Wrong authorized commit is blocked.
- Wrong PR URL is blocked.
- OPEN evidence cannot use the merged reconciliation transition.
- Existing successful reconciliation remains accepted.

## Validation and review

Focused loop-control tests and the full release matrix are required before publication. Independent review is required by the loop controller.

## Rollback

Revert the focused test commit; no production migration or runtime rollback is required.
