# Iteration 020 plan: accessible Budget form dialog

## Problem

The Budget create form used a hand-built overlay without native dialog
semantics, shared focus restoration, or a reliable labelled form boundary.

## Scope

- Replace only the Budget create overlay with the existing native
  `AccessibleDialog` component.
- Add a stable title, associated labels, and safe initial focus on Cancel.
- Preserve form state, save/delete behavior, copy, and responsive layout.
- Extend `CurrencyInput` only with an `id` passthrough required for its label.

## Exclusions

No Budget API, schema, financial calculation, dependency, or Goal UI change.

## Acceptance criteria

- The form renders inside a labelled native modal dialog.
- Escape/backdrop close and focus/scroll restoration use the shared component.
- Category, amount, and period labels are associated with controls.
- Existing focused and full regression suites pass.
