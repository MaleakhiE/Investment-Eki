# Iteration 124 — Form-submission errors announced to assistive technology (WCAG 4.1.3, AA)

## Category

Accessibility / Status Messages (WCAG 4.1.3, Level AA).

## Executive summary

Two form-submission error banners rendered as plain `<div>`s with no ARIA role, so a screen-reader user who submitted an invalid form received **no announcement at all** — the error appeared visually and silently. This iteration gives both banners `role="alert" aria-live="assertive"`, matching the pattern the auth pages already established.

## Evidence of the gap

Audit of every inline `{error && ...}` banner in `src/app`:

| Page | Before | Announced? |
|---|---|---|
| `settings/page.tsx:211` | `<div className="mb-3 p-2 bg-red-500/20 …">` | ❌ **no role** |
| `cashflow/page.tsx:339` | `<div className="mb-2 p-2 bg-red-500/20 …">` | ❌ **no role** |
| `goals/page.tsx:250` | `<div role="alert" …>` | ✅ |
| `budget/page.tsx:134` | `<div role="alert" …>` | ✅ |
| `analytics/page.tsx:146` | `<div role="alert" …>` | ✅ |
| `accounts/page.tsx:150` | `<div role="alert" …>` | ✅ |
| `(auth)/register/page.tsx:79` | `<div role="alert" aria-live="assertive" …>` | ✅ |
| `(auth)/reset-password/page.tsx:83` | `<div role="alert" aria-live="assertive" …>` | ✅ |

The two failing banners sit on the highest-traffic write paths in the app: **saving settings** and **adding a cash-flow transaction**. Both are exactly the case WCAG 4.1.3 exists for — a status message that appears without a change of context or focus.

The login and forgot-password pages route their errors through the `showFeedback` toast (`tone: 'error'`), which is already an announced region, so they were correctly out of scope.

## Change

- `src/app/settings/page.tsx:211` — added `role="alert" aria-live="assertive"`.
- `src/app/cashflow/page.tsx:339` — added `role="alert" aria-live="assertive"`.

`aria-live="assertive"` is stated explicitly rather than relying on the implicit value of `role="alert"`, matching the existing auth-page convention so the codebase has one shape for this pattern.

Nothing else changed: no class names, no handlers, no validation logic, no submission behaviour.

## Acceptance criteria

1. Both previously silent error banners carry `role="alert"` and `aria-live="assertive"`. ✅
2. No `{error && <div className=` (role-less) banner remains in either file. ✅
3. All six already-compliant pages still expose an announced error region — no regression. ✅
4. A regression test guards both the fix and the pre-existing guarantees. ✅
5. Zero behavioural/logic change; error copy and styling identical. ✅

## Validation

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Passed (0 errors) |
| `npm run lint` | Passed (0 errors, 1 pre-existing unrelated `_branch` warning) |
| `npx jest --ci` | Passed — **149 suites / 1223 tests**; 3 suites Blocked by environment (missing `DATABASE_URL`, pre-existing) |
| `src/app/form-error-alert.test.tsx` | Passed (11/11) |
| `git diff --check` | Clean |

## Regression guard

`src/app/form-error-alert.test.tsx` (11 assertions):
- asserts the exact announced-banner shape in both fixed files;
- asserts no role-less `{error && <div className=` shape survives in them;
- asserts all six already-compliant pages keep `role="alert"`, so the app-wide guarantee holds.

## Deployment / rollback

Pure JSX attribute addition — no migration, no config, no runtime dependency. Rollback is a one-commit revert.

## Known risks

None material. `role="alert"` on an already-visible banner cannot alter layout or behaviour; the only observable change is that assistive technology now announces the error.
