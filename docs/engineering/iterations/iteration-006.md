# Iteration 006: accessible cashflow history dialog

Date: 2026-07-27
Branch: `feat/loop-engineering-6-cashflow-dialog`
Baseline: `fc0bf00`

## Selection

The Cashflow “All transactions” overlay is a read-only financial surface with
visual modal styling but no dialog semantics, Escape behavior, focus
containment/restoration, or background modality. It is the safest first
consumer for a content-dialog boundary because opening and closing it performs
no write and changes no financial state.

Higher-ranked remaining opportunities are not selected: IDR boundaries need
an owner policy, dependency advisories need a reviewed upstream patch,
notification timing and insights need product contracts, and duplicate
transactions depend on amount policy.

## Contract

- Replace only the Cashflow history overlay with a small native `<dialog>`
  wrapper. Use the browser top layer and existing React/DOM support; add no
  package or custom dialog framework.
- The visible “All transactions” heading is the accessible name.
- Opening places focus on the existing Tutup action. Native modal behavior contains keyboard focus
  and makes the application background non-interactive.
- Escape, Tutup, and a direct backdrop press call the same close callback.
  Presses inside the panel do not dismiss it.
- Closing restores focus to the connected “View all” trigger and restores the
  previous body overflow value.
- Preserve transaction order, categories, descriptions, account labels,
  income/expense/transfer signs, count, net, max height, and internal scrolling.
- Opening, keyboard interaction, and closing make no API request or mutation.

## TDD seams

1. Closed dialog renders nothing.
2. Open dialog has `role=dialog`, `aria-modal=true`, and matching
   `aria-labelledby`.
3. The primitive owns native `showModal`, cancel/Escape, target-only backdrop,
   scroll lock/restoration, and connected-trigger focus restoration.
4. Cashflow uses the primitive, links the title, and marks Tutup as initial
   focus without changing the transaction body/count/net.
5. Existing FeedbackModal, Budget, Goals, and Sidebar implementations remain
   untouched.

Static Node/Jest tests can prove markup and wiring but not browser top-layer
focus behavior. A real browser smoke is required when an authenticated
runtime with transaction fixtures is available; otherwise the limitation must
be recorded rather than overstated.

## Scope exclusions

- No Budget/Goal form migration, form-label cleanup, mobile More-sheet change,
  FeedbackModal refactor, destructive-confirmation policy, portal, dialog
  stack manager, dependency, API, service, schema, or financial calculation
  change.
- No new DOM test dependency solely for this slice.

## Acceptance criteria

1. The Cashflow history surface is a labelled native modal dialog with the
   documented dismissal and focus lifecycle.
2. Its rendered transaction values, signs, count, net, and scrolling layout
   are unchanged.
3. Focused tests are RED before implementation and GREEN afterward.
4. Full TypeScript, lint, Jest, build, audit, Prisma, diff, and independent
   review evidence is recorded.
5. No unresolved High or Critical finding remains.
