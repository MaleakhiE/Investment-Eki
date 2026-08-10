# Iteration 063 — shared decision context and accessible financial evidence

## Category

Product trust, accessibility, and financial presentation.

## Executive summary

This iteration turns the market research recommendation into a small shared UI contract. Dashboard recurring rules, Analytics cashflow, and Investments gold pricing now identify the source and whether the context is verified, manual, or unavailable. Analytics also exposes a concise text summary alongside the visual trend while retaining its structured table.

## User problem and repository evidence

Users need to know whether a financial value is live, manually recorded, or unavailable before acting on it. The app had page-specific source copy and chart text alternatives, but no reusable decision-context presentation. Existing recurring rules are planning data, not investment execution.

## Scope

- Add `DecisionContext` for source, state, observation time, and non-advice descriptions.
- Add a pure cashflow trend summarizer with explicit empty-data behavior.
- Reuse the context on Dashboard recurring planning, Analytics cashflow, and Investments gold pricing.
- Keep existing calculations, routes, storage, and provider boundaries unchanged.
- Preserve the Hallmark Split Studio tokens and responsive rules.

## Non-goals

No bank credential aggregation, trade execution, new market-data provider, new database table, individualized recommendation, or full-app CSS rewrite.

## Acceptance criteria

- Verified/manual/unavailable states are communicated with text and a non-color indicator.
- Source and observed time are visible when supplied.
- Empty trend data produces an explicit unavailable summary rather than zero values.
- Existing investment, analytics, and responsive tests remain green.
- No display-formatted value is used as a calculation input.

## Implementation details

- `src/components/finance/DecisionContext.tsx` provides the shared semantic `<section>` and `<dl>` contract.
- `src/components/finance/chart-summary.ts` provides deterministic cashflow summary text.
- `src/app/analytics/page.tsx` adds the summary and shared context to the cashflow visual.
- `src/app/investments/page.tsx` replaces page-specific source markup with the shared context.
- `src/app/dashboard/page.tsx` labels recurring rules as planning-only context.
- `src/services/analytics.service.ts` returns decrypted income, total expense, and net cashflow fields matching the chart contract.
- `src/app/globals.css` adds compact context styling using existing tokens.

## Security, financial correctness, and compatibility

No new trust boundary or persistence path was introduced. Source values are descriptive only. The summarizer consumes numeric domain values before formatting. Existing user ownership, session checks, API envelopes, and encrypted storage are unchanged.

## Accessibility and responsive behavior

The context uses a labelled section and definition list, keeps source/status text available to assistive technology, and preserves the existing chart table. Layout uses flex wrapping and existing mobile overflow rules; no new fixed-width control is introduced.

## Validation

- Focused Jest (3 suites, 6 tests): Passed, including the analytics service contract and decision-context parser.
- Full Jest (105 suites, 1033 tests): Passed.
- `npx tsc --noEmit`: Passed.
- `npm run lint`: Passed with one pre-existing warning in `src/lib/loop-control/state.test.ts`.
- `npm run build` plus OCR trace: Passed.
- `npx prisma format` and `npx prisma validate`: Passed.
- `npm run db:status` and `npm run db:verify`: Passed against disposable MySQL 8.4.
- `npm audit --omit=dev --audit-level=critical`: Passed at the critical threshold; existing high/moderate advisories remain.
- `git diff --check`: Passed.

## Rollback and follow-up

Rollback is a frontend-only revert; no data migration is required. Follow-up candidates are duplicate-aware CSV import and fee/cost-basis provenance, each as separate bounded iterations.
