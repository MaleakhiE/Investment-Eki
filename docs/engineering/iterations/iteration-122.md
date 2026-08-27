# Iteration 122 — Shared `--muted` token raised to WCAG 2.x AA (`#6a817c` → `#52655f`)

## Category

Accessibility / Contrast Minimum (WCAG 1.4.3, AA).

## Executive summary

`--muted` is the app-wide secondary/caption text color. It reaches the screen
two ways:

1. **Directly** — ~24 `globals.css` rules set `color: var(--muted)`: app shell
   status, brand subtitle, nav links, sheet subtitle, feedback modal, page
   headers, auth heading/footer, finance metrics, decision-context, settings
   group headers, and the investment header/total/return/workspace captions.
2. **Indirectly** — the compatibility bridge
   `.text-zinc-500, .text-zinc-600 { color: var(--muted) !important; }`
   remaps every Tailwind `text-zinc-500` (63 usages across 10 files) onto the
   same token.

The previous value `#6a817c` measured **3.73–4.16:1** against the light
surfaces it renders on — below the 4.5:1 AA floor for normal text. This was the
single highest-impact remaining contrast gap because one token governs the
majority of secondary text in the product.

## Change

| | Old `#6a817c` | New `#52655f` |
|---|---|---|
| white `#ffffff` | 4.16:1 ❌ | 6.20:1 ✅ |
| page `#f1f8f5` | 3.86:1 ❌ | 5.76:1 ✅ |
| card `#f5fbf9` | 3.97:1 ❌ | 5.92:1 ✅ |
| chip `#e9f5f2` | 3.73:1 ❌ | 5.56:1 ✅ |
| input `#f3faf8` | 3.93:1 ❌ | 5.86:1 ✅ |

Single-line change to the `--muted` custom property in `src/app/globals.css`.
Same hue family (desaturated teal-grey), just darkened to clear AA on every
surface it touches. No markup, class, or logic changes.

## Non-text / dark-surface safety

- The dark dashboard hero (`.dashboard-page .card-elevated`) has its own
  higher-specificity `!important` remap of `text-zinc-400/500/600` → `#b9cdc8`
  (7.96:1 on `--ink`). `--muted` is never applied on that surface, so the token
  change does not affect it — verified by grep and preserved by the regression
  test.
- The compatibility bridge itself is left intact (still points zinc-500/600 at
  `--muted`); only the token's value moved.

## Acceptance criteria & verification

- [x] `--muted` ≥ 4.5:1 against all five light surfaces (measured 5.56–6.20).
- [x] No occurrence of the old failing value `#6a817c` remains in `src/` (except
      the regression test's documentation/guard).
- [x] Dark-hero override and zinc→muted bridge both preserved.
- [x] 147 jest suites pass (3 DB-blocked pre-existing); regression test
      `muted-token-contrast.test.tsx` 5/5.
- [x] TypeScript clean, ESLint clean (1 pre-existing warning), `git diff --check` clean.

## Follow-up candidate

`text-zinc-500` used directly (not via the bridge) resolves through Tailwind to
`#71717a` (~4.33–4.83:1) — passes AA but with thin margin on the chip/pill
surface (`#e9f5f2` = 4.33:1). A future iteration could migrate those direct
usages onto the now-safe `--muted` token for consistency.
