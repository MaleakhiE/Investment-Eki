# Iteration 037 result: investment API error privacy

Date: 2026-08-01
Branch: `feat/loop-engineering-37-investment-error-privacy`
Baseline: `f555639`

## Outcome

Investment list, details, type-history, and snapshot-write routes now use the
shared safe database-code classifier. Raw portfolio values, SQL context,
identifiers, and encrypted snapshot details are excluded from logs while
allowlisted Prisma codes remain available. Atomic snapshot accounting,
authentication, ownership, and response behavior are unchanged.

## Verification

| Check | Result |
| --- | --- |
| Focused investment route tests | Pass: 5 suites, 17 tests |
| Full Jest | Pass: 75 suites, 854 tests |
| TypeScript | Pass |
| ESLint | Pass |
| Prisma validation | Pass |
| Prisma migration status | Pass: 9 migrations up to date |
| Production build with ephemeral valid auth env | Pass on Next 16.2.12, OCR trace verified |
| Dependency audit | Existing 2 High transitive sharp/libvips advisories; force fix would downgrade Next and was not applied |
| Diff check | Pass |

## Structured review

Architecture, security, reliability, and adversarial diff passes found no
introduced critical/high issue, secret, migration, ownership regression, or
financial mutation change. New tests assert both safe-code preservation and
raw-message exclusion on every changed route.

Dedicated specialist subagents were unavailable because the environment had no
free specialist slots; the orchestrator completed separate structured fallback
passes. These are not represented as independent multi-agent approval.

## Limits

Browser/staging log-aggregation validation was not available. Other raw-error
routes and the existing dependency advisories remain separate backlog items.
