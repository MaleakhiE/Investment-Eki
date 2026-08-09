# Iteration 060 — Investment history empty-state onboarding

## Category

Product UX and accessibility.

## Executive summary

Make empty Gold and Mutual Fund history panels actionable by linking each empty state to the existing snapshot form with the correct investment type selected.

## User or operational problem

New investors see `No records yet` in both history panels, but the page does not explain what to do next or provide a direct path to record the first snapshot.

## Repository evidence

`src/app/investments/page.tsx` renders plain paragraphs when `goldSnapshots` or `mfSnapshots` is empty, while the same page already owns the snapshot form and `selectedType` state.

## Root cause

The history empty branches were display-only and were not connected to the existing snapshot-entry workflow.

## Scope

- Add semantic, actionable empty states for Gold and Mutual Fund histories.
- Reuse the existing form and type selection; scroll the user to that form.
- Add focused source regression assertions.

## Non-goals

- No API, database, calculation, authentication, or dependency changes.
- No changes to populated history, loading, error, or retry behavior.

## Acceptance criteria

- Each empty history panel announces its state with `role="status"`.
- Each panel explains the next action and has a named keyboard-operable CTA.
- Gold CTA selects Gold; Mutual Fund CTA selects Mutual Fund.
- CTA navigation targets the existing snapshot form without creating a second form.

## Implementation details

Add one stable form anchor and small inline CTA handlers using the existing `selectedType` state and native `scrollIntoView`.

## Product and UX impact

Turns an otherwise dead-end first-use state into a direct onboarding path for both supported investment types.

## Accessibility impact

Uses semantic status containers, headings, descriptive text, visible focus styles, and real buttons. The CTA does not rely on color alone.

## Graph Engineering impact

### Product capability graph

Investment tracking → empty history → actionable onboarding → investment page CTA → existing snapshot form → focused source regression test → first-snapshot activation.

### Domain relationship graph

No entity, ownership, or financial-invariant changes; snapshot persistence remains server-authorized and unchanged.

### Module dependency graph

Investment page presentation → existing form state and `selectedType`; no API, Prisma, auth, or shared utility dependency changes.

### Data-flow graph

Authenticated history fetch → validated empty array → CTA selects type and anchors form → existing form validation → existing snapshot API.

### User-journey graph

User with no Gold or Mutual Fund records → understands the missing history → chooses the relevant CTA → reaches the correct form context → records a snapshot.

### Engineering task graph

Reconcile merged 059 → plan and RED test → minimal empty-state implementation → required validation → review and PR publication. Later candidates remain analytics/data-quality and investment calculation hardening.

## Security impact

No new trust boundary or data access. CTAs only change local UI state and invoke native scrolling.

## Financial correctness impact

None. No amounts, rates, totals, or stored records change.

## Database impact

None.

## Compatibility impact

Backward compatible; populated histories and existing snapshot submission remain unchanged.

## Validation commands and results

- `npx prisma format` — Passed; formatting produced no intentional schema change.
- `npx prisma validate` — Passed.
- `npx tsc --noEmit` — Passed.
- `npm run lint` — Passed with one pre-existing warning.
- `npm test -- --runInBand` — Passed: 102 suites, 1,005 tests.
- `npm run build` — Passed; Next.js production build and OCR trace verification completed.
- `npm run db:status` — Passed; nine migrations are applied.
- `npm run db:verify` — Blocked by environment: disposable MySQL 8.4 replay hits the pre-existing `only_full_group_by` failure in migration `20260717000000_add_financial_accounts_and_transfers`.
- `git diff --check` — Passed.
- `npm audit --omit=dev --audit-level=critical` — Passed at the critical threshold; npm reports one moderate and three high dependency advisories for existing dependencies.

## Subagent or fallback review results

The independent reviewer identified a keyboard-focus gap; the implementation now focuses the form heading after either CTA. A fresh independent review was unavailable within the bounded window, so the orchestrator completed separate architecture, security, reliability, product/UX, accessibility, and adversarial passes. This fallback is not independent approval.

## Visual validation

Browser rendering is not assumed; the final report will state whether visual tooling was available.

## Deployment notes

No migration or environment change. Deploy with the normal web application release.

## Rollback procedure

Revert the iteration commit; no data rollback is required.

## Known limitations

The page continues to use mixed-language copy inherited from the existing application.

## Follow-up work

Consider a shared empty-state primitive only if multiple future pages need the same interaction and copy contract.

## Pull-request reference

None. Loop-control blocked authorization because `npm run db:verify` failed on the pre-existing migration replay incompatibility and independent review was unavailable.
