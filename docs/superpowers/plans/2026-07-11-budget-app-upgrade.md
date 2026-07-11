# Budget App Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade FinTrack with review-first receipt OCR, account tagging, trend-based savings suggestions, upcoming recurring transactions, and a consistent light-teal mobile budget UI.

**Architecture:** Keep transaction persistence and analytics in focused services, expose authenticated App Router endpoints using the existing response envelope, and keep OCR parsing independent from Tesseract so heuristics are deterministic and property-testable. The client remains a thin review/edit layer: OCR never auto-saves a transaction.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 6/MySQL, Jest 30, fast-check, Tesseract.js, Tailwind CSS 4.

## Global Constraints

- OCR uses self-hosted Tesseract.js in a Node runtime route and only pre-fills an editable form.
- Receipt images are accepted only from authenticated users, validated by type and size, and persisted as a data URL in nullable MySQL `LONGTEXT`.
- Account is nullable, trimmed, and at most 100 characters; presets are Cash, BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, and Credit Card, plus custom text.
- Monetary values continue to use existing AES-256-GCM numeric encryption.
- APIs retain `{responseCode,responseStatus,responseMessage,responseDetails}`.
- Savings suggestions compare the current month to the preceding three calendar months by expense category and produce concrete Bahasa Indonesia savings text.
- Existing behavior remains intact and the final gate is tests, lint, Prisma validation/generation, and production build.

---

### Task 1: Transaction persistence and validation

**Files:** `prisma/schema.prisma`, generated migration, `src/services/transaction.service.ts`, transaction tests, transaction routes.

- [ ] Add failing tests for account boundary validation and create/update/read round-trips.
- [ ] Add nullable `account` and `receipt_image` fields and a forward-only migration.
- [ ] Extend transaction interfaces, validation, mappings, create/update paths, and serialized API responses.
- [ ] Run focused tests and Prisma validation/generation.

### Task 2: Receipt parsing and authenticated OCR

**Files:** `src/lib/receipt-parser.ts`, parser tests, `src/services/ocr.service.ts`, OCR route and tests, `package.json`, lockfile.

- [ ] Add failing table/property tests for Indonesian amount/date/merchant extraction.
- [ ] Implement deterministic parser functions and category guessing.
- [ ] Add Tesseract.js and a lazy singleton worker behind an injectable OCR service.
- [ ] Add authenticated multipart route with MIME/size validation, structured envelope, and data URL output.
- [ ] Run parser and route tests.

### Task 3: Savings suggestion engine and endpoint

**Files:** `src/services/savings-suggestion.service.ts`, tests, `src/app/api/analytics/savings-suggestions/route.ts`, route tests.

- [ ] Add failing tests for overspend, underspend, absent history, zero-history, and multi-category ordering.
- [ ] Implement a pure suggestion generator and a service adapter over `getMonthlySummary` for four months.
- [ ] Add authenticated GET endpoint using the standard envelope.
- [ ] Run focused tests.

### Task 4: Cashflow scan/review/account experience

**Files:** `src/app/cashflow/page.tsx` and focused client components if extraction improves testability.

- [ ] Extend transaction client types/state and save/update payloads.
- [ ] Add preset/custom account selector, account filter/search, and row badges.
- [ ] Add image/camera picker, scan progress/errors, OCR request, editable field prefill, and retained receipt image.
- [ ] Ensure reset/edit flows cannot leak a previous receipt into a new transaction.

### Task 5: Dashboard insights and upcoming transactions

**Files:** `src/app/dashboard/page.tsx`, optional focused widget components.

- [ ] Fetch recurring transactions and savings suggestions without breaking existing dashboard loading.
- [ ] Render active recurring items sorted by `next_run` and concrete savings insight cards.
- [ ] Add a left-to-spend hero and circular category badges using current summary data.

### Task 6: Light-teal visual system and page migration

**Files:** `src/app/globals.css`, `src/components/layout/Sidebar.tsx`, dashboard, cashflow, budget, goals, analytics, investments, settings, login, and register pages.

- [ ] Replace dark tokens/utilities with light canvas, white cards, accessible ink colors, and teal accents.
- [ ] Migrate navigation and all pages away from hardcoded dark surfaces/text/borders.
- [ ] Preserve responsive desktop rail, mobile bottom navigation, touch targets, and existing behavior.
- [ ] Search for remaining legacy dark-theme literals and resolve user-visible occurrences.

### Task 7: Documentation and final integration

**Files:** `openapi.json`, `docs/API.md`, `prisma/seed.ts` only if useful fixtures are added.

- [ ] Document new transaction fields, OCR endpoint, constraints, and savings endpoint.
- [ ] Run `npm test -- --runInBand`, `npm run lint`, `npx prisma validate`, `npx prisma generate`, and `npm run build`.
- [ ] Review the complete diff for correctness, security, accessibility, and accidental scope expansion; address Critical/Important findings.
