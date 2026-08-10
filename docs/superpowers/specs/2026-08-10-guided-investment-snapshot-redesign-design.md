# Guided investment snapshot redesign

Date: 2026-08-10
Iteration: 062
Status: Approved for planning

## Problem

The Investments page gives every surface similar visual weight. The provenance panel dominates the first viewport, zero-value summaries appear as positive green performance, and the snapshot form exposes calculation details before the user understands the core workflow. On desktop the result is spacious but slow to scan; on mobile the useful history and empty-state guidance fall too far below the form.

## Audience, job, and tone

- Audience: beginner Indonesian investors tracking gold and mutual-fund positions manually.
- Primary job: record or update one dated investment snapshot with confidence.
- Tone: soft-utilitarian—calm, trustworthy, direct, and free of trading-app urgency.

## Selected approach

Use a guided snapshot workspace. Preserve the existing route, APIs, authentication, calculations, snapshot history, and delete/update behavior. Restructure only the presentation and interaction hierarchy.

Hallmark direction:

- Macrostructure: Split Studio, replacing the current Workbench hierarchy.
- Theme: retain FinTrack's mint brand tokens while reducing decorative surface colour.
- Enrichment: none; this is an application workflow and function carries the page.
- Motion: limited to existing form/status transitions with reduced-motion support.

## Information architecture

1. Compact page header: title, purpose, and a factual portfolio total.
2. Portfolio overview: gold and mutual-fund summaries with neutral empty states; zero is never styled as a gain.
3. Asset selector: explicit Gold / Mutual Fund choice with the selected context carried through the form.
4. Snapshot workspace:
   - capital and month;
   - optional calculator inputs for the selected asset;
   - compact source and update-time metadata next to the live value;
   - review band containing current value and gain/loss before save.
5. History: loading, unavailable, empty, and populated states remain visible and reachable after the workspace.

The large standalone provenance panel is removed. Its facts move beside the values they qualify, so provenance remains visible without competing with the primary task.

## Component and file boundaries

- Modify `src/app/investments/page.tsx` for semantic structure, copy, state presentation, and accessible relationships.
- Modify `src/app/globals.css` only for page-scoped Investments styles and required shared design tokens; preserve the Tailwind import and existing application styles.
- Add or update focused `.test.ts` files using the repository's existing static-render/source-contract conventions.
- Update `.hallmark/log.json` and add `.hallmark/preflight.json`.
- Add `tokens.css` only if the Hallmark token audit proves the existing global token block cannot safely serve the page; otherwise reuse the existing token system to avoid duplicate sources of truth.
- Add the market report and Iteration 062 engineering documentation.
- Delete no production files.

## Data flow

No endpoint or persistence contract changes.

`existing snapshot APIs -> existing component state -> selected asset workspace -> existing POST/DELETE handlers -> refresh histories -> existing feedback provider`

Gold-price provenance remains derived from `/api/gold-price`. Mutual-fund provenance remains user-entered per snapshot. Calculations retain their current numeric behavior in this iteration; display changes must not become calculation inputs.

## Interaction and accessibility

- Use one visible page heading and hierarchical section headings.
- Associate every label, helper, and validation message with its control.
- Keep native month/select controls and the existing accessible toggle.
- Use text plus tone for positive, negative, zero, loading, stale, and unavailable states.
- Keep every interactive target at least 44px at mobile widths.
- Preserve keyboard order and visible `:focus-visible` treatment.
- Prevent submission while saving and expose progress text.
- Verify 320, 375, 414, 768, and desktop widths with no horizontal overflow.

## Error and edge states

- Snapshot request failure: retain the existing explicit unavailable state and retry action.
- Gold price unavailable: calculator remains understandable and identifies the value as unavailable; no hidden fallback is presented as live market data.
- Empty portfolio: show onboarding guidance rather than positive zero returns.
- Zero invested amount: gain/loss is neutral and percentage is unavailable, not `+0%`.
- Long provider/product names and large IDR values must wrap or truncate without obscuring the amount.
- Saving/deleting failure continues through the shared feedback provider.

## Market-informed follow-up

The research report ranks investment reconciliation with valuation and fee provenance as a strong page-adjacent feature, but it requires additive schema and financial calculation work. It is explicitly excluded from this visual iteration. The recommended next feature slice adds optional fees, valuation date/source, and reconciliation status with server-derived net gain.

## Testing and validation

- Focused Investments rendering/source-contract tests for neutral empty performance, relocated provenance, semantic headings, and accessible labels.
- Existing investment-history parser tests.
- TypeScript, ESLint, full Jest, production build, Prisma validation, migration status/replay, dependency audit, and `git diff --check` per repository policy.
- Browser validation at required responsive widths when the environment permits authenticated fixture data; disclose any environment limitation.

## Security and financial correctness

- No new input fields, endpoints, external fetches, or persistence in this iteration.
- No client-provided ownership identifiers are introduced.
- Existing server authorization remains the source of truth.
- No display-formatted value feeds calculations.
- No recommendation, trade execution, provider credential, or regulated aggregation behavior is added.

## Rollback

Revert the focused Iteration 062 commit. There is no schema migration or data rollback.

## Acceptance criteria

- The first viewport communicates portfolio state and the next action without a dominant provenance banner.
- Empty assets do not display green gains or positive prefixes.
- Users can complete the snapshot workflow in a clear top-to-bottom sequence.
- Source and timestamp remain visible beside the value they qualify.
- Existing save, update, delete, retry, calculator, and history behavior remains intact.
- Responsive and accessibility checks pass at the defined widths.
