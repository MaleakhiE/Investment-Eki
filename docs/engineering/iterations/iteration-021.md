# Iteration 021 plan: accessible mobile More navigation

## Problem

The mobile More menu used a hand-built overlay with duplicated dialog and
backdrop behavior instead of the shared native dialog lifecycle.

## Scope

- Migrate only the mobile More menu to `AccessibleDialog`.
- Preserve navigation items, sign-out confirmation, copy, and mobile layout.
- Remove the now-unused overlay layer rule.

## Acceptance criteria

- More opens as a labelled native modal dialog.
- Escape/backdrop close and focus/scroll restoration use the shared component.
- Close receives initial focus and remains a 44px-compatible control.
- No navigation or sign-out behavior changes.
