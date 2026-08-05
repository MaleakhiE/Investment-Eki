# Iteration 055 — Dashboard and budget UX clarity

## Category

User-facing product UX, visual design, and accessibility.

## Executive summary

Iteration 055 improves the dashboard and budget onboarding experience without changing financial calculations or persistence. The dashboard hero now identifies the displayed amount as the current-period net cashflow rather than the ambiguous `Sisa Uang`, labels it as a net balance, and shows the active salary-period dates directly beneath the amount. New-user dashboard and no-budget states now use consistent visual hierarchy, accessible decorative icons, explanatory copy, and prominent action buttons.

## User or operational problem

The dashboard's primary metric used the label `Sisa Uang`, which could be interpreted as an account balance even though the underlying value is the salary-period net cashflow. The period badge did not expose the actual dates next to the metric. The dashboard and budget empty states were also visually sparse and provided less guidance than the surrounding product surfaces.

## Repository evidence

- `src/app/dashboard/page.tsx` computed `net` from `summary.net_cashflow` but presented it as `Sisa Uang`.
- The active period dates existed in `periodLabel` but were only shown in the page greeting, separated from the metric they qualify.
- The new-user dashboard state had an empty decorative container and mixed-language CTA text (`Add transaction Pertama`).
- The budget empty state was one plain paragraph directing users to a separate header button.

## Root cause

The dashboard evolved from a compact summary into a broader financial workspace without revisiting its metric vocabulary and onboarding hierarchy. Empty states were implemented as placeholders rather than as complete first-use journeys.

## Scope

- Clarify the dashboard hero metric as current-period cashflow/net balance.
- Place the active salary-period dates next to the net amount, with a safe loading fallback.
- Replace the dashboard's empty decorative block with a visible, accessibility-hidden clock icon and consistent CTA copy.
- Upgrade the budget empty state to a complete icon, heading, explanation, and in-context CTA.
- Add source-level regression tests for metric copy, period placement, and onboarding states.

## Non-goals

- No financial calculation, period boundary, or API behavior change.
- No redesign of populated budget cards or dashboard data modules.
- No new design-system dependency.
- No database, authentication, authorization, or migration work.

## Acceptance criteria

- The dashboard no longer calls net cashflow `Sisa Uang` or uses the `Periode Gajian` badge.
- The hero card identifies the metric as current-period cashflow and labels it `Net balance`.
- Salary-period dates render below the amount; a stable fallback appears before dates are available.
- Dashboard and budget empty states each include a clear heading, explanatory text, and direct CTA.
- Decorative icons are hidden from assistive technology.
- Focused UX/controller tests, TypeScript, lint, and whitespace checks pass.

## Implementation details

`src/app/dashboard/page.tsx` now renders `Cashflow periode ini`, a `Net balance` badge, and `{periodLabel || 'Periode gajian aktif'}` under the formatted amount. The dashboard's new-user state gains a visible clock icon, consistent text sizing, improved line height, a high-contrast CTA, and corrected English action copy.

`src/app/budget/page.tsx` replaces the single-line no-budget message with a structured onboarding card. Its primary action opens the existing accessible budget dialog rather than navigating elsewhere.

`src/app/dashboard/dashboard-ux-clarity.test.ts` verifies the removed ambiguous copy, metric-period relationship, dashboard onboarding state, and budget onboarding CTA.

## Product and UX impact

The most prominent dashboard number now describes what it is and which dates it covers. First-time users receive clearer guidance and can begin entering a transaction or creating a budget from the state where the absence is visible.

## Accessibility impact

The new inline SVG icons use `aria-hidden="true"` because their meaning is already expressed in nearby headings. Action labels are visible and descriptive. Existing dialog keyboard/focus behavior is reused. Important state is communicated with text, not color alone.

## Graph Engineering impact

### Product capability graph

Financial awareness → understand current-period results → clearly labelled dashboard net cashflow → dashboard presentation module → UX regression tests → fewer metric misinterpretations.

### Domain relationship graph

No entity, ownership, aggregate, or financial invariant changes. Existing summary and budget response data are rendered differently only.

### Module dependency graph

Dashboard/budget pages → existing API response state → existing Tailwind design tokens → new source-level UX tests. No service, Prisma, auth, encryption, SMTP, or OCR dependency changes.

### Data-flow graph

Existing API responses → existing client state → clarified labels and onboarding presentation. Input validation, authentication, authorization, calculation, and persistence are unchanged.

### User-journey graph

Dashboard entry → identify net cashflow and covered dates → understand next action when no data exists → navigate to transaction entry or open budget creation.

### Engineering task graph

Repository UX assessment → ambiguous metric and sparse empty-state evidence → focused dashboard/budget edits → regression tests → validation → review-ready PR.

## Security impact

No authentication, authorization, sensitive-data handling, logging, or network behavior changes.

## Financial correctness impact

No calculation changes. The iteration only corrects the label presented for the existing `net_cashflow` value and exposes the already-computed period label nearby.

## Database impact

None.

## Compatibility impact

No public API or data-schema changes. Existing dashboard and budget routes remain compatible.

## Validation commands and results

- `npx jest --runTestsByPath src/app/dashboard/dashboard-ux-clarity.test.ts src/app/dashboard/dashboard-responsive.test.ts src/app/dashboard/dashboard-availability.test.ts src/lib/loop-control/policy.test.ts src/lib/loop-control/state.test.ts src/lib/loop-control/cli.test.ts --runInBand`: passed (6 suites, 107 tests).
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed with zero errors and one existing `state.test.ts` warning.
- `git diff --check`: passed.

## Subagent or fallback review results

Dedicated specialist subagents were unavailable. The orchestrator completed separate product/UX, accessibility, security, financial-correctness, responsive-layout, and adversarial diff-review passes. These are structured fallback reviews and are not represented as independent multi-agent approval.

## Visual validation

Static structure and responsive classes were inspected. An authenticated browser session with representative financial data was not available in this environment, so populated-state screenshot validation was limited. The changed states use existing responsive primitives and card/CTA styles already present in the application.

## Deployment notes

No migration or environment-variable change is required. Deploy with the normal application release.

## Rollback procedure

Revert the focused Iteration 055 commit. No data rollback is required.

## Known limitations

- Product copy still mixes Indonesian and English elsewhere; this iteration only resolves the ambiguous hero metric and the affected onboarding CTAs.
- The hero period remains a salary-cycle period (25th through 24th), matching existing behavior.

## Follow-up work

Perform a broader language-consistency pass and authenticated visual regression review of populated dashboard and budget states.

## Pull-request reference

Pending publication.