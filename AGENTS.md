# Investment-Eki Engineering Guide

## Architecture

- Next.js 16 App Router pages and route handlers live in `src/app`.
- Shared UI lives in `src/components`; domain services live in `src/services`.
- Authentication, encryption, validation, Prisma, and API helpers live in `src/lib`.
- Prisma/MySQL schema and forward-only migrations live in `prisma`.
- Jest tests are colocated with the behavior they exercise.
- Operational scripts live in `scripts`; engineering evidence lives in `docs`.

Keep route handlers thin: authenticate, validate, call a domain service, and serialize through the established API envelope. Put financial invariants and multi-record writes in services. Access data only after the authenticated public UUID has been resolved to the internal user key.

## Setup

Use the lockfile-backed npm workflow:

```bash
npm ci
npm run db:generate
npx prisma validate
npm run dev
```

Required environment variable names are documented in `.env.example`. Never commit values. Core groups are database connectivity, `ENCRYPTION_KEY`, NextAuth secrets and URL, Google OAuth credentials, cron authentication, SMTP configuration/allowlist, and initial superadmin credentials.

## Coding conventions

- Keep TypeScript strict and validate every external input at route, job, OAuth, upload, and script boundaries.
- Prefer small, focused modules. Extract shared logic only for two real consumers or safety-critical behavior.
- Do not mutate caller-owned data. Return new objects and use immutable state updates.
- Preserve the existing language convention within each flow; do not standardize copy incidentally.
- Format IDR through the project formatter or `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`.
- Log useful operational context without secrets, decrypted money, tokens, credentials, receipt images, or private financial data.

## API contract

Changed endpoints must preserve the shared `APIResponse` envelope:

```ts
{
  responseCode: number;
  responseStatus: 'SUCCESS' | 'ERROR';
  responseMessage: string;
  responseDetails: unknown | null;
}
```

Define and test authentication, user scope, validation, statuses, cache behavior, serialization, cross-user isolation, and retry/idempotency behavior. Never expose internal numeric `users.id`, `user_id`, password hashes, OAuth identifiers, or reset tokens.

## Financial integrity and security

- Keep `users.id` and relational BIGINT keys internal. JWT/session/API identity uses `users.public_id`; resolve it centrally with `resolveInternalUserId`.
- Preserve `session_version` validation and password-reset session revocation.
- UUIDs are identifiers, not authorization. Every query and write remains scoped to authenticated `user_id`.
- Encrypted database strings remain the persisted source of truth for money. Decrypt only inside trusted server-side services.
- Avoid persisted binary floating point. State source of truth and rounding rules for every changed calculation.
- Use a Prisma transaction for balanced transfers and financial writes spanning records. Design retries so they cannot duplicate movement.
- Cover zero, negative, maximum expected, duplicate, concurrent, and partial-failure cases when applicable.
- Preserve OCR review-first behavior: scanning may prefill an editable form but must never auto-save.

## Prisma migration rules

- Never edit an applied migration.
- Add a forward migration for every schema change.
- Never run `prisma migrate reset`, destructive `DROP` statements, or production `migrate dev`.
- Use `npm run db:deploy` for deployment and `npm run db:verify` only against an isolated disposable database.
- Treat `.env`, Prisma schema/migrations, encryption, authentication, password reset, OCR, exports, jobs, and financial services as high-caution surfaces.

## UI and accessibility

Changed interfaces must be mobile-first and include loading, empty, error, success, and validation states. Use semantic HTML, accessible names, visible focus, keyboard operation, adequate touch targets, reduced-motion support, and non-color-only status cues. Verify no horizontal overflow at representative mobile, tablet, and desktop widths.

## Testing and validation

Use vertical-slice TDD at agreed public seams. New or materially changed behavior needs unit/service coverage, route or integration coverage, and a browser/E2E check for critical flows when feasible. Target at least 80% coverage for the changed slice; never weaken assertions merely to raise coverage.

Run focused tests first, then:

```bash
npm run db:generate
npx prisma validate
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
npm run db:verify
npm audit --omit=dev
git diff --check
```

Classify failures as pre-existing, environment-related, introduced, or unknown. Never claim browser, accessibility, migration, or production validation that was not performed.

## Multi-agent iteration rules

- Use `.agents/skills/investment-eki-loop` for improvement loops.
- Delegate independent read-only discovery to repository, product, UX, finance, security, and QA agents.
- The orchestrator merges evidence, scores opportunities, selects one coherent slice, and records its plan before implementation.
- Assign writing agents explicit, non-overlapping ownership.
- Run security and finance review against the final diff, followed by a release review against `main`.
- Stop for ambiguous financial semantics, production-only database access, unsafe migrations, critical issues needing owner input, or irreproducible baselines.

## Pull requests

Never commit directly to `main`, force-push, merge automatically, or include unrelated churn. Use logical conventional commits. Draft PRs must explain the problem, design, security/privacy impact, exact validation, evidence, risks, migration/deployment notes, and follow-ups.
