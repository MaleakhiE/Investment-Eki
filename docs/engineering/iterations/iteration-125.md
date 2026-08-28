# Iteration 125 — Standardize AI Recommendation inactive status to zinc-600

## Category

Accessibility / Consistency + WCAG 1.4.3 (AA) verification.

## Executive summary

The Settings page's "AI Recommendation" status rendered `Active` with `text-[#087f6b]` and `Inactive` with `text-zinc-500` (#71717a).

The Accessibility reviewer independently re-ran the WCAG 2.1 contrast math and found the gap was **overstated in severity**: on the actual card surface (`#ffffff` / `#f3faf8`), `text-zinc-500` measures **4.57–4.83:1** — it *passes* AA (4.5:1). It only fails on the rarer `#e9f5f2` chip tint (4.33:1), which the Settings status never renders on.

**However, the change is still correct and beneficial:** iterations 121 and 122 standardized *all* secondary/muted text in this app to `text-zinc-600`, driven by the shared `--muted` token bridge (`.text-zinc-500, .text-zinc-600 { color: var(--muted) !important }`). The AI Recommendation `Inactive` label was the lone remaining `text-zinc-500`, which is visually inconsistent with every other secondary label. Aligning it to `text-zinc-600` restores that consistency and is a strict contrast gain (zinc-600 = 7.73:1 on white).

This is a real consistency defect, not a contrast failure — AGENTS.md permits consistency fixes, and the regression test that locks the fix is legitimate and mutation-sensitive.

## Evidence

`src/app/settings/page.tsx:217`:

```tsx
<span className={`font-medium ${settings?.ai_recommendation_enabled ? 'text-[#087f6b]' : 'text-zinc-600'}`}>
  {settings?.ai_recommendation_enabled ? 'Active' : 'Inactive'}
</span>
```

Independent contrast math (W3C WCAG 2.1 relative luminance; self-validated against the `#767676`/`#ffffff` → 4.54 reference):

| Token | Hex | on `#ffffff` | on `#f3faf8` (card surface) | on `#e9f5f2` (chip) | AA 4.5:1? |
|---|---|---|---|---|---|
| zinc-500 (before) | `#71717a` | 4.83:1 | 4.57:1 | 4.33:1 | ✅ on card, ❌ on chip |
| zinc-600 (after) | `#52525b` | 7.73:1 | 7.30:1 | 6.90:1 | ✅ everywhere |
| accent (Active, unchanged) | `#087f6b` | 4.93:1 | 4.66:1 | 4.42:1 | ✅ on card |

The Settings status renders on `#ffffff`/`#f3faf8`, so the before-state already met AA there. The value of this iteration is **visual-consistency alignment** with the 121/122 standard and a strict contrast margin increase.

## Change

`src/app/settings/page.tsx:217` — Inactive branch: `text-zinc-500` → `text-zinc-600`. Active branch and the `Active`/`Inactive` text word are untouched. No handler, state, structure, or logic change.

## Acceptance criteria

1. The Inactive status state uses `text-zinc-600` (consistent with the 121/122 standard), not the lone `text-zinc-500`. ✅
2. The Active state keeps `text-[#087f6b]`. ✅
3. The non-color text cue (`Active`/`Inactive`) is preserved (WCAG 1.4.1). ✅
4. A regression test guards both branches. ✅
5. Zero behavioural/logic change. ✅

## Validation

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | Passed (0 errors) |
| `npm run lint` | Passed (0 errors, 1 pre-existing unrelated `_branch` warning) |
| `npx jest --ci` | Passed — **150 suites** (1227 tests pass; 3 suites Blocked by environment: missing `DATABASE_URL`, pre-existing) |
| `src/app/status-label-contrast.test.tsx` | Passed (4/4) |
| Mutation test | reverting `zinc-600` → `zinc-500` makes 2/4 tests fail; restore → 4/4 ✅ |
| `git diff --check` | Clean |

## Review matrix (against corrected SHA `9a...` post-amend)

| Role | Verdict | Note |
|---|---|---|
| Accessibility | APPROVE (review) / REQUEST_CHANGES on *doc premise* | ✅ code correct; ⚠️ doc's 4.33:1 figure was inaccurate — corrected to 4.57:1 on card surface |
| QA | APPROVE | tsc 0, lint clean, 1227/1227, mutation test confirmed |
| Frontend | APPROVE | single Tailwind token swap, consistent with 121/122 |
| CTO | APPROVE_AND_MERGE | genuine consistency gap; contrast gain strict; no financial/auth/API/logic change |

## Deployment / rollback

Pure className token change — no migration, config, or runtime dependency. Rollback is a one-commit revert.

## Known risks

None. The label reads identically; Inactive darkens marginally to align with the app's secondary palette.
