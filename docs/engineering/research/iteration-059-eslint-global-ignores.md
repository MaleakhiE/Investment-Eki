# Iteration 059 ESLint Global Ignores Research

## Question

Why did `npm run lint` scan generated Next.js output inside a sibling worktree, and is the current flat-config ignore shape valid?

## Finding

The current root config in `eslint.config.mjs` uses `globalIgnores()` from `eslint/config` and keeps the documented `eslint-config-next` defaults while adding `.worktrees/**`. That is the right mechanism for this repository's failure mode because ESLint flat config evaluates `globalIgnores()` patterns relative to the config file, and only global ignore patterns can match directories. The local sibling worktree path is under the same config base: `.worktrees/iteration-053-loop-stop-control/.next`.

## Evidence

- ESLint flat config documents `globalIgnores()` as the helper for completely ignoring files and directories, with default patterns added before user patterns, and states that patterns in `eslint.config.js` are evaluated relative to that config file. It also states that only global ignore patterns can match directories. Source: [ESLint Ignore Files](https://eslint.org/docs/latest/use/configure/ignore).
- ESLint documents recursive directory ignores using a leading `**/` when the same directory name may appear below the config base, and distinguishes full directory pruning with `directory/**` from keeping the directory traversable with `directory/**/*` for later unignore rules. Source: [ESLint Ignore Files](https://eslint.org/docs/latest/use/configure/ignore).
- Next.js 16 documents ESLint CLI flat config with `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, and `globalIgnores()` for the default generated outputs: `.next/**`, `out/**`, `build/**`, and `next-env.d.ts`. Source: [Next.js ESLint Plugin docs](https://raw.githubusercontent.com/vercel/next.js/canary/docs/01-app/03-api-reference/05-config/03-eslint.mdx).

## Local Result

`npm run lint` now exits successfully with one pre-existing warning in `src/lib/loop-control/state.test.ts`. The generated output under `.worktrees/iteration-053-loop-stop-control/.next` is not linted by the current root `globalIgnores([".worktrees/**", ...])` entry.

## Caveat

`.worktrees/**` is intentionally scoped to a top-level `.worktrees` directory next to `eslint.config.mjs`. If this repo later stores nested worktrees elsewhere, use ESLint's recursive directory form for that directory name instead.
