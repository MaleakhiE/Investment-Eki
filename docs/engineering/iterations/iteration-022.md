# Iteration 022 plan: accessible Goal form dialog

## Problem

The Goal create/edit form still used a hand-built overlay, leaving its
financial form controls outside the shared native dialog and focus lifecycle.

## Scope

- Replace only the Goal create/edit overlay with `AccessibleDialog`.
- Add stable title/control IDs and associated labels.
- Preserve create/edit state, API calls, add-amount behavior, copy, and
  responsive layout.

## Exclusions

No goal calculation, concurrency, API, schema, or financial policy change.

## Acceptance criteria

- Create and edit use a labelled native modal dialog.
- Escape/backdrop close and focus/scroll restoration use the shared component.
- Name, target, current, category, priority, and deadline labels are associated
  with controls.
- Existing goal behavior and regression tests remain green.
