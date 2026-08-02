# Iteration 043 — Accessible cashflow entry and filters

## Problem and evidence

Cashflow entry labels were visually adjacent but not programmatically associated with their controls. The Expense/Income choice exposed selection only through color, and history search/type/category filters had no accessible names. Evidence: `src/app/cashflow/page.tsx`.

## User story

As a keyboard or screen-reader user, I want transaction entry and filtering controls to announce their purpose and selected state so I can record and find activity independently.

## Scope and design

- Associate visible labels with date, category, amount, description, and account controls using stable IDs.
- Expose Expense/Income selection with `aria-pressed`.
- Give history search and both filters unique accessible names.
- Increase touched compact type and filter controls to a 44px minimum height.
- Preserve copy, request payloads, calculations, filtering, and persistence.

## Exclusions and safety

No API, service, authentication, authorization, financial calculation, schema, migration, or stored data changes. OCR remains review-first.

## Acceptance criteria and public seam

- A colocated source regression test proves field associations, type state, and filter names.
- Existing behavior and full validation remain green where environment configuration permits.
- Keyboard order remains DOM order; touched controls retain visible browser/project focus treatment.
- No new mobile horizontal constraint is introduced by fixed widths.

## Validation limitations

Authenticated browser, screen-reader, and responsive visual checks require a configured runtime and remain release gates rather than claimed evidence.
