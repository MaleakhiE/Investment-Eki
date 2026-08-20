# Iteration 109 — Financial status color-contrast sweep across remaining pages (WCAG 1.4.3)

## Category

Accessibility / Color contrast.

## Executive summary

Iterations 107 and 108 fixed the low-contrast `text-green-400` / `text-red-400` financial-status colors on the investments and analytics pages. The same defect remained on every other primary surface: dashboard, budget, cashflow, goals, settings, and the register form. Iteration 109 completes the sweep — replacing the plain-text financial-status and error uses of the light 400-weight shades (measured ≈1.66:1 green / ≈2.64:1 red against the light backgrounds, both below WCAG 2.2 AA 4.5:1) with the design system's accessible tokens `#087f6b` (≈4.71:1) and `#b84c49` (≈4.81:1), and upgrading the dashboard savings-rate mid-state from `text-amber-400` to `text-amber-700`. Non-color cues already present (the dashboard's Untung/Rugi label, `+` prefixes) are preserved.

## User or operational problem

Positive/negative money values and error text across the app's core screens were rendered in light green/red that low-vision users could not reliably read against near-white card backgrounds. Fixing only investments (107) and analytics (108) left the remaining screens inconsistent and still non-conformant.

## Repository evidence

Before this change, `text-green-400` / `text-red-400` appeared as plain-text status/value/error colors in:

- `src/app/dashboard/page.tsx` — negative net headline (line 199), portfolio delta (line 343), savings-rate label mid/neg states (line 223).
- `src/app/budget/page.tsx` — Total Spent (156), Remaining (161), over-budget chip (167), All-good label (169), per-budget percentage (247), per-budget remaining/over label (253).
- `src/app/cashflow/page.tsx` — form error (339), summary Net (480).
- `src/app/goals/page.tsx` — Current Total (277), deadline-urgency label (394), completed-goal "selesai" label (441).
- `src/app/settings/page.tsx` — AI-recommendation status (217), page error (211).
- `src/app/(auth)/register/page.tsx` — form error (80).

The accessible tokens `--accent-dark: #087f6b` and `--danger: #b84c49` are defined in `src/app/globals.css` (lines 154–156) and were adopted as the accepted remedy in iterations 107–108.

## Scope

- Replace plain-text financial-status and error uses of `text-green-400` → `text-[#087f6b]` and `text-red-400` → `text-[#b84c49]` on the six pages above.
- Upgrade the dashboard savings-rate mid-state `text-amber-400` → `text-amber-700`.
- Improve two adjacent low-contrast neutrals surfaced during the fix: budget percentage/label `text-zinc-300` → `text-zinc-600`.
- Preserve all non-color cues (Untung/Rugi label, `+`/`-` prefixes, `aria-label`s on budget remaining).
- Add a multi-page source-level regression test.

## Non-goals

- Interactive hover affordances (`hover:text-red-400` on Delete buttons) are deliberately left unchanged — they are transient hover states on controls, not persistent status text, and the resting color is an accessible zinc.
- Chip/badge colors layered on tinted backgrounds where the tint changes the effective contrast, and category-identity accents (`getRiskColor`, `getPriorityColor`, gold/mutual-fund amber/blue) are out of scope; a dedicated palette audit can address those against WCAG 1.4.11 (non-text contrast) separately.
- The dashboard portfolio-delta percentage chip (`bg-red-500/10 text-red-400`) sits on a tinted badge background and is left for that same non-text/badge audit.
- No calculation, data, storage, or API changes.

## Acceptance criteria

- No plain-text financial-status ternary (`? 'text-green-400'` / `? 'text-red-400'`) remains on the six pages.
- No `font-bold text-green-400` / `font-bold text-red-400` static value remains.
- Error text on register/settings/cashflow uses `text-[#b84c49]`.
- Dashboard savings-rate mid-state uses `text-amber-700`; Untung/Rugi label preserved.
- `npx tsc --noEmit` exits 0.
- `npm run lint` exits 0 (1 pre-existing unrelated warning).
- Full Jest run passes with only the 3 known DB-environment-blocked suites failing.
- New multi-page regression test passes.

## Implementation details

Applied the token substitution described above across the six page files. The dashboard `gradient-text` positive treatment for the net headline is retained (it is an accessible brand gradient); only its negative branch changed. Budget progress-bar `bg-*` fills and the amber/blue/red badge backgrounds were left intact (non-text graphics).

New test `src/app/financial-status-contrast.test.ts` reads each page source and asserts: (a) no `? 'text-green-400'`/`? 'text-red-400'` status ternaries, (b) no `font-bold text-*-400` static values, (c) no light-shade error/label patterns, (d) the accessible tokens are present, and (e) the dashboard Untung/Rugi non-color cue is preserved.

## Accessibility impact

WCAG 1.4.3 (Contrast Minimum) — all plain-text financial-status and error values across the app's primary screens now render at ≥4.5:1. WCAG 1.4.1 (Use of Color) — reinforced by preserved Untung/Rugi wording, `+`/`-` prefixes, and budget `aria-label`s. The app is now visually consistent across dashboard, budget, cashflow, goals, settings, investments, and analytics.

## Validation commands and results

- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0 (1 pre-existing unrelated warning in `src/lib/loop-control/state.test.ts`).
- `npx jest --ci`: 137 suites / 1122 tests passed; 3 suites blocked by environment (missing `DATABASE_URL`), pre-existing and unrelated.
- `git diff --check`: clean.

## Pull-request reference

Pending.