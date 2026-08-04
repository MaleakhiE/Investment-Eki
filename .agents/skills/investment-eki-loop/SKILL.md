---
name: investment-eki-loop
description: Run bounded, evidence-driven engineering improvement iterations for the Investment-Eki Next.js and Prisma personal-finance repository. Use when asked to audit, prioritize, plan, implement, verify, or report one safe vertical slice involving product value, financial correctness, security, UX, accessibility, performance, testing, maintainability, or operations.
---

# Investment Eki Loop

Deliver one coherent, reviewable improvement without broad rewrites or fabricated evidence.

## 1. Establish safety and context

1. Read repository `AGENTS.md`, package scripts, Prisma schema, auth/session code, API envelope, financial services, tests, runbooks, environment example, and recent history.
2. Inspect Git status. Preserve user changes and never work directly on `main`.
3. Create a branch that follows the requested naming policy.
4. Inventory only tools that are actually callable. Use external systems read-only unless the task explicitly authorizes the required write.
5. Never use destructive Prisma commands, edit applied migrations, expose secrets, or connect to production as a test database.

## 2. Establish the baseline

Detect the package manager from its lockfile. Run install, Prisma generation and validation, type checking, lint, tests, and build. Run migration replay only against an isolated disposable database. Run dependency audit when configured.

Record every command and classify failures as pre-existing, environment-related, introduced, or unknown. Stop if the baseline is irreproducible or only production data access exists.

When runtime prerequisites are available, inspect login, registration, dashboard, accounts, cashflow, investments, budget, and goals at mobile, tablet, and desktop widths. Record console, network, overflow, state, keyboard, focus, semantics, and language findings. Never imply a runtime check was performed when it was not.

## 3. Collect and score evidence

Delegate independent, read-only repository, product, UX, finance, security, and QA reviews. Limit each to five findings with exact files, symbols, or reproducible runtime evidence.

Merge duplicates and score candidates from 1 to 5 using `scripts/score-opportunity.mjs`. Reject broad rewrites, untestable behavior, cosmetic-only changes without measurable value, regulated individualized advice, weakened security, and unsafe migrations.

Write `docs/engineering/current-state.md` and `docs/engineering/opportunity-backlog.md`. Include problem, evidence, users, outcome, score, effort, risks, dependencies, validation, and recommended iteration.

## 4. Plan one vertical slice

Select the highest-value candidate that fits safely in one iteration and does not duplicate existing behavior. Before implementation, write `docs/engineering/iterations/iteration-NNN.md` with:

- problem, evidence, user story, scope and exclusions;
- technical, data, API, UI, security, and accessibility design;
- failure modes, public test seams, migration/recovery plan, and acceptance criteria.

For financial behavior, read `references/financial-integrity.md`. Confirm ambiguous financial semantics with the user instead of guessing.

## 5. Implement test-first

Assign explicit, non-overlapping file ownership. Work vertically: one failing public-seam test, the minimum implementation, then the next case. Preserve:

- encrypted monetary storage and explicit rounding;
- public UUID authentication with internal user-scoped relational keys;
- `session_version` revocation;
- atomic, balanced, retry-safe multi-record financial writes;
- standard API envelopes and private serialization;
- IDR formatting and existing language conventions;
- OCR review-first behavior.

Add no production dependency without a documented security, maintenance, performance, and bundle-cost justification.

## 6. Verify independently

Run focused tests, then the full baseline commands. Exercise the primary happy path, invalid input, unauthorized access, empty state, API failure, slow-loading behavior, responsive widths, refresh/direct navigation, and keyboard-only operation when feasible.

Run independent final-diff security and finance reviews. Resolve every confirmed high-severity issue. Then run a release review against `main`.

Score the result using `references/quality-score.md`. A result below 85 requires the smallest repair addressing the largest remaining gap. Limit repair loops to three; otherwise stop and document blockers.

## 7. Report and stop safely

Use the loop-control CLI as the phase boundary: record `preflight` before edits, `record-validation` and (only when eligible) `request-repair` while repairing, `authorize-publication` before external publication, and `accept-iteration` before continuing. An `unsafe` decision stops commit, push, and pull-request work. Keep this as the execution gate; the controller owns its detailed policy.

Write `docs/engineering/iterations/iteration-NNN-result.md` with selected opportunity, changes, files, tests, exact validation, reviews, accessibility, performance, remaining risks, score, and next recommendation.

Create logical conventional commits and a draft pull request only when authorized by the task. Never merge or force-push.

Stop with preserved analysis and a minimal human action when secrets are unavailable, the repository is unsafe or unintelligible, production is the only database, a migration cannot be safe, a critical issue needs owner input, requirements conflict materially, or three repair loops remain below 85.
