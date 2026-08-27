# Iteration 123 — Skip link / Bypass Blocks (WCAG 2.4.1, Level A)

## Category

Accessibility / Bypass Blocks (WCAG 2.4.1, Level A).

## Executive summary

Every authenticated route renders the persistent `<Sidebar />` (primary nav,
"Plan and insights" section, sign-out, mobile header, bottom nav) **before** its
page `<main>`. There was no mechanism to move focus past that nav to the content,
so keyboard and screen-reader users had to tab through the entire navigation on
every single page load — a WCAG 2.4.1 (Level A) failure. This is more severe
than the AA contrast work in 116–122: Level A is the baseline conformance tier.

## Change

- `src/app/layout.tsx`: added a single skip link as the first focusable element
  in `<body>`:
  `<a href="#main-content" className="skip-link">Lewati ke konten utama</a>`
  (Indonesian copy, matching the app's existing `lang="id"` convention).
- `src/app/globals.css`: added `.skip-link` / `.skip-link:focus-visible` styles —
  positioned off-screen by default (`top: -56px`), revealed on focus
  (`top: 12px`) with a visible `:focus-visible` outline. Not `display:none`
  (which would also hide it from screen readers).
- `id="main-content"` added to every rendered `<main>` across 9 authenticated
  pages (`dashboard`, `goals`, `cashflow`, `settings`, `accounts`, `analytics`,
  `investments`, `budget`, `superadmin/smtp`) plus `AuthShell` (auth pages), so
  the skip link's target genuinely exists on each route. The dashboard page has
  two `<main>` instances (loading skeleton + content); both received the id.

## Scope notes

- `AppShell.tsx` is dead code (never imported by any page) — left untouched; its
  `<main>` still got the id only because it was in the grep sweep, harmlessly.
- No markup/structure/logic change to any page — only an `id` attribute and one
  new anchor in the shared layout.

## Verification

- New regression test `src/app/skip-link.test.tsx` (13 assertions):
  - layout renders a skip link with `href="#main-content"`;
  - the link carries `className="skip-link"`;
  - every `<main>` in all 10 target files exposes `id="main-content"`;
  - `.skip-link` is hidden by default (`top: -Npx`) and revealed on
    `:focus-visible` (`top: Npx`), and is NOT `display:none`.
- Full gate: `tsc` 0 errors; `lint` 0 errors (1 pre-existing `_branch` warning);
  `jest` 1212 passed (3 DB-dependent suites env-blocked, pre-existing);
  `git diff --check` clean.

## Follow-up candidate

The `<Sidebar />` is duplicated per-page rather than shared through `AppShell`;
consolidating into one layout wrapper would remove the 10 near-identical
`<main>` blocks. Out of scope here (structural refactor, not an a11y blocker).
