# Iteration 119 — Secondary accent `#00a88a` text contrast to WCAG 2.x AA (token `#00a88a` → `#087f6b`)

## Category

Accessibility / Contrast Minimum (WCAG 1.4.3, AA).

## Executive summary

The secondary-accent color `#00a88a` was used for text roles (`<p>`, `<span>`, `<Link>`, `<a href>`, `<label>`) across cashflow, dashboard, and auth pages. Relative-luminance calculations show it lands at 2.85–3.01:1 against light background surfaces (`#ffffff`, `#f5fbf9`, `#f3faf8`), failing the 4.5:1 AA threshold for normal text.

All 10 text-role usages were swapped to the accessible `#087f6b` token (4.42–4.93:1). SVG stroke icons (`<svg className="... text-[#00a88a]">`) remain intact as decorative non-text elements.

## Scope of changes

- `src/app/cashflow/page.tsx`: Swapped 2 text-role instances of `text-[#00a88a]` to `text-[#087f6b]`.
- `src/app/dashboard/page.tsx`: Swapped 2 text-role instances of `text-[#00a88a]` to `text-[#087f6b]`.
- `src/app/(auth)/login/page.tsx`: Swapped 2 text-role instances to `text-[#087f6b]`.
- `src/app/(auth)/forgot-password/page.tsx`: Swapped 2 text-role instances to `text-[#087f6b]`.
- `src/app/(auth)/reset-password/page.tsx`: Swapped 2 text-role instances to `text-[#087f6b]`.
- `src/app/accent-a88a-contrast.test.tsx`: Added automated regression test suite verifying no HTML text elements contain `text-[#00a88a]`.

## Acceptance criteria & verification

- [x] All HTML text elements with `#00a88a` converted to accessible `#087f6b`.
- [x] Relative luminance contrast against `#ffffff` / `#f5fbf9` / `#f3faf8` exceeds 4.5:1 AA requirement.
- [x] Non-text decorative SVG icons preserved.
- [x] 145 jest test suites pass (3 DB-blocked pre-existing).
- [x] TypeScript clean (0 errors), ESLint clean (0 errors, 1 pre-existing warning).
