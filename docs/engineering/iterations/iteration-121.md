# Iteration 121 — Muted secondary text contrast to WCAG 2.x AA (token `zinc-400` → `zinc-600`)

## Category

Accessibility / Contrast Minimum (WCAG 1.4.3, AA).

## Executive summary

The app used Tailwind `text-zinc-400` (`#a1a1aa`) for all secondary labels,
captions, form-field hints, and legends across dashboard, goals, budget,
cashflow, analytics, and the auth forms. Relative-luminance calculations show
it lands at:

| Surface | zinc-400 contrast | zinc-600 contrast (new) |
|---------|-------------------|--------------------------|
| `#ffffff` (card) | 2.56:1 | 7.73:1 |
| `#f1f8f5` (`--background`) | 2.38:1 | 7.17:1 |
| `#f5fbf9` (inner card) | 2.45:1 | 7.38:1 |
| `#e9f5f2` (pill chip) | 2.30:1 | 6.92:1 |

Every one of these fails the 4.5:1 AA threshold for normal text. All 37
light-surface usages were swapped to `text-zinc-600` (`#52525b`), which exceeds
AA on every surface. The change is pure token substitution — no logic, layout,
or behavior affected.

## Scope of changes

- 10 source files: `goals`, `cashflow`, `dashboard`, `analytics`, `budget`,
  `(auth)/login`, `(auth)/register`, `(auth)/forgot-password`,
  `(auth)/reset-password`, `components/ui/CurrencyInput`.
- `globals.css`: extended the existing `.card-elevated` dark-hero override to
  also remap `.text-zinc-600` → `#b9cdc8` (keeps the dark hero's 7.96:1
  contrast; the four zinc tokens used there are purely cosmetic captions, not
  body text).
- `src/app/muted-text-contrast.test.tsx`: automated regression test (12
  assertions) forbidding `text-zinc-400` in any touched file and confirming the
  dark-hero override is preserved.

## Non-text caveats

- The dashboard's dark `card-elevated` hero still uses zinc tokens for small
  captions; they are remapped by CSS to `#b9cdc8` on `--ink` (7.96:1) and are
  exempt from the light-surface AA rule.
- The "Compatibility bridge" in `globals.css` remaps zinc-300/400 → `#48645f`
  on formerly-dark backgrounds; left intact (out of scope).

## Acceptance criteria & verification

- [x] No `text-zinc-400` remains in any `.tsx` file.
- [x] Contrast against all light surfaces exceeds 4.5:1 AA (measured 6.92–7.73).
- [x] Dark-surface remap preserved.
- [x] 146 jest suites pass (3 DB-blocked pre-existing).
- [x] TypeScript clean, ESLint clean (1 pre-existing warning).
