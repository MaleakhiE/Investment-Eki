# Iteration 006 result: accessible cashflow history dialog

Date: 2026-07-27
Branch: `feat/loop-engineering-6-cashflow-dialog`
Baseline: `fc0bf00`

## Change

- Added one dependency-free `AccessibleDialog` wrapper around the native
  `<dialog>` top layer.
- Migrated only Cashflow’s read-only “All transactions” overlay.
- Added a visible-title accessible name, Tutup initial focus, native modal
  containment, Escape/cancel and target-only backdrop dismissal, body-scroll
  restoration, and connected-trigger focus restoration.
- Preserved transaction order, type/sign rendering, values, count, net,
  internal scrolling, and every API/data path.
- Left FeedbackModal, Budget, Goals, and the mobile More sheet unchanged.

## TDD evidence

The RED run failed before implementation because `AccessibleDialog` did not
exist. The final focused run passes 2 suites and 8 tests for closed/open
semantics, labelled native markup, lifecycle wiring, Cashflow financial-content
preservation, and unchanged FeedbackModal behavior.

The repository’s Node-only Jest harness cannot execute browser top-layer and
focus behavior. Source contracts cover the wiring without adding a one-off DOM
dependency; the real-browser limitation is recorded below.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Prisma validation | `npx prisma validate` | Pass |
| Type checking | `npx tsc --noEmit` | Pass |
| Lint | `npm run lint` | Pass |
| Focused tests | AccessibleDialog + FeedbackModal Jest | Pass: 2 suites, 8 tests |
| Full tests | `npm test -- --runInBand` | Pass: 45 suites, 294 tests |
| Production build | `npm run build` | Pass, including OCR trace verification |
| Prisma migration status | `npm run db:status` | Environment-blocked: configured MySQL host returned `P1001` |
| Migration replay | `npm run db:verify` | Environment-blocked: Docker daemon unavailable |
| Production audit | `npm audit --omit=dev` | Fail: 2 high Next.js/transitive sharp advisories; registry now reports a fix path requiring review |
| Diff whitespace | `git diff --check` | Pass |

An isolated bundle of the actual component was prepared without application
data, but the browser runtime reported no available browser backend. No
authenticated production-data smoke was attempted. Before release, stage more
than five transactions and verify: accessible name, initial Tutup focus,
Tab/Shift+Tab containment, Escape/Tutup/direct-backdrop dismissal, inside-click
non-dismissal, focus return, background non-interactivity, body and internal
scroll behavior, responsive overflow, reduced motion, and unchanged financial
values/signs/count/net.

## Independent review

- Product approved the read-only scope and no-copy-drift contract after Tutup
  was restored.
- Finance approved unchanged ordering, signs, transfer neutrality, count, net,
  formatting, and zero-mutation interaction.
- Security approved native modality, label/focus/cancel/backdrop wiring, stable
  callback, and reversible cleanup after the TypeScript test issue was fixed.
- QA approved after required-child typing, 44px Tutup target, and stronger
  lifecycle/financial-content source regressions were added.
- Release approved the dependency-free, schema-neutral, independently
  revertible slice; browser staging smoke remains a pre-release gate.

No unresolved Critical, High, or Medium code finding remains.

## Remaining risks

- Browser top-layer, focus, mobile layout, and reduced-motion behavior are not
  runtime-verified in this environment.
- Source-inspection lifecycle tests are intentionally narrow and should move
  to an established DOM/browser harness when one exists.
- Budget/Goal form overlays and the mobile More sheet still lack the complete
  lifecycle; their write/navigation semantics require separate migrations.
- FeedbackModal destructive confirmations still initially focus the primary
  action; changing that policy is a separate reviewed behavior slice.
- Database replay is unavailable, and the two production dependency
  advisories remain unresolved.

## Release and rollback

Run the staging browser gate before deployment. Rollback is the previous
application artifact or this single commit’s revert; no database, config, or
secret restoration is required.

## Quality score

Score: 91/100. Code, financial preservation, tests, build, and independent
review pass. Missing browser runtime evidence and inherited database/audit
limitations cap the score.

## Next recommendation

Review the newly available Next.js/sharp audit fix path in a dedicated
dependency-compatibility loop before expanding dialog migrations.
