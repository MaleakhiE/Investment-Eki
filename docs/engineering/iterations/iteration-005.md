# Iteration 005: explicit monthly notification opt-outs

Date: 2026-07-27
Branch: `feat/loop-engineering-5-notification-opt-outs`
Baseline: `98b4d71`

## Selection

The Settings UI and API persist explicit `monthly_reminder` and
`monthly_summary` booleans, but the scheduler currently ignores false values.
Honoring an explicit opt-out is a safe consent boundary and does not require
inventing reminder-day, end-of-month, low-balance, or custom-alert semantics.

## Contract

- The existing type selection is unchanged: missing current-month cashflow
  derives `REMINDER`; existing cashflow derives `SUMMARY`.
- Only the flag for the derived type applies. A disabled summary never falls
  back to a reminder, and a disabled reminder never becomes a summary.
- A missing notification-settings row defaults both types to enabled,
  preserving current behavior and schema/API defaults.
- A disabled derived type increments `skipped` once and exits before claim
  create/reclaim, email decryption, financial-summary reads, or SMTP.
- If both flags are false, the user is skipped before the cashflow lookup.
- Disabled delivery creates no `notification_logs` row and does not modify an
  existing claim.
- Re-enabling before a later same-month scheduler run can deliver because the
  disabled run created no claim. Existing SENT claims remain idempotently
  skipped; FAILED/stale PENDING claims remain retryable after re-enable.
- The user batch remains one query and selects only `id`, encrypted `email`,
  and the two monthly booleans.
- Loop 4 aggregate-only, no-store, fail-closed-auth, and safe-log contracts
  remain unchanged.

## UX and operator truth

The stored reminder-day value is not yet enforced. The Settings UI must not
present it as active scheduling: the control remains visible for compatibility
but disabled with explicit “not active yet” copy.

`skipped` now combines preference-disabled and already-claimed/processed
deliveries. No per-user or reason-level detail is added to the API. Current
settings explain a present opt-out; notification logs remain authoritative
only for attempted delivery, not historical consent auditing.

## TDD seams

1. Missing settings and explicit true preserve enabled reminder delivery.
2. Reminder false + no cashflow skips before claim/decrypt/SMTP.
3. Summary false + cashflow skips before claim/summary reads/decrypt/SMTP.
4. The irrelevant false flag does not suppress the derived enabled type.
5. Both false short-circuits before cashflow lookup.
6. Preference-query failure fails the run; it never silently sends.
7. Existing unique-claim, failed-claim, stale-claim, counters, response privacy,
   and safe logging remain regression-covered.
8. The exact nested Prisma select excludes low-balance/custom fields and IDs.

## Scope exclusions

- No reminder-day/end-of-month scheduling, low-balance/custom-alert delivery,
  alternate notification type, settings mutation, log schema/status, consent
  history, just-in-time pre-SMTP preference recheck, migration, dependency, or
  response-shape change.
- A setting changed after the batch read can affect the next run rather than
  canceling an in-flight delivery. Strong immediate cancellation needs an
  explicitly designed coordination boundary.

## Acceptance criteria

1. Explicit false opt-outs suppress only the matching derived type before all
   delivery side effects.
2. Missing settings preserve legacy delivery and existing retries/idempotency.
3. Settings UI and API/OpenAPI documentation are truthful about inactive day
   scheduling and combined skipped semantics.
4. Focused coverage and full Prisma, TypeScript, lint, Jest, build, audit,
   runtime, and diff gates are recorded.
5. Independent product, finance, security, QA, and release reviews have no
   unresolved high-severity finding.
