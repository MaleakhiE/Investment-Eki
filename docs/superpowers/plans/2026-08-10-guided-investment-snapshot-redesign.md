# Guided Investment Snapshot Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Investments page into a beginner-friendly guided snapshot workflow while preserving every existing API, calculation, authorization boundary, and history operation.

**Architecture:** Keep `InvestmentsPage` as the existing client orchestration boundary and restructure only its semantic JSX and page-scoped CSS. Add one pure presentation helper for neutral/positive/negative return labels so zero-state behavior is testable without a browser. Persist no new data and add no dependency.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4 plus existing global CSS, Jest 30 static-render/source-contract tests.

## Global Constraints

- Preserve `/api/investments/*`, `/api/gold-price`, authentication, snapshot calculations, history loading, save, update, and delete behavior.
- Do not add schema changes, migrations, dependencies, trade execution, provider credentials, or recommendation behavior.
- Zero invested value must render a neutral unavailable return, never a positive gain.
- Source and update time must stay visible beside the value they qualify.
- Support 320, 375, 414, 768, and desktop widths with no horizontal overflow.
- Delete no production files and do not weaken loop-control publication gates.

---

### Task 1: Testable investment return presentation

**Files:**
- Create: `src/app/investments/investment-presentation.ts`
- Create: `src/app/investments/investment-presentation.test.ts`

**Interfaces:**
- Produces: `getInvestmentReturnPresentation(invested: number, gainLoss: number): { tone: 'neutral' | 'positive' | 'negative'; amountPrefix: '' | '+' | '-'; percentage: string | null }`
- Consumed by: `src/app/investments/page.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
import { getInvestmentReturnPresentation } from './investment-presentation';

test('keeps an empty investment neutral', () => {
  expect(getInvestmentReturnPresentation(0, 0)).toEqual({
    tone: 'neutral', amountPrefix: '', percentage: null,
  });
});

test.each([
  [1_000_000, 100_000, 'positive', '+', '10.0'],
  [1_000_000, -100_000, 'negative', '-', '-10.0'],
])('classifies non-zero returns', (invested, gainLoss, tone, amountPrefix, percentage) => {
  expect(getInvestmentReturnPresentation(invested, gainLoss)).toEqual({ tone, amountPrefix, percentage });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx jest --runTestsByPath src/app/investments/investment-presentation.test.ts --runInBand`

Expected: FAIL because `investment-presentation.ts` does not exist.

- [ ] **Step 3: Implement the pure helper**

```ts
export type InvestmentReturnPresentation = Readonly<{
  tone: 'neutral' | 'positive' | 'negative';
  amountPrefix: '' | '+' | '-';
  percentage: string | null;
}>;

export const getInvestmentReturnPresentation = (
  invested: number,
  gainLoss: number,
): InvestmentReturnPresentation => {
  if (!Number.isFinite(invested) || !Number.isFinite(gainLoss) || invested <= 0) {
    return { tone: 'neutral', amountPrefix: '', percentage: null };
  }
  const tone = gainLoss > 0 ? 'positive' : gainLoss < 0 ? 'negative' : 'neutral';
  return {
    tone,
    amountPrefix: gainLoss > 0 ? '+' : gainLoss < 0 ? '-' : '',
    percentage: ((gainLoss / invested) * 100).toFixed(1),
  };
};
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx jest --runTestsByPath src/app/investments/investment-presentation.test.ts --runInBand`

Expected: PASS.

---

### Task 2: Guided Investments page hierarchy

**Files:**
- Modify: `src/app/investments/page.tsx`
- Modify: `src/app/investments/investments-availability.test.ts`
- Test: `src/app/investments/investment-presentation.test.ts`

**Interfaces:**
- Consumes: `getInvestmentReturnPresentation` from Task 1.
- Produces: unchanged page route and unchanged network contracts.

- [ ] **Step 1: Extend the source-contract test with required semantics**

Add assertions that the page source contains:

```ts
expect(source).toContain('Catat posisi investasi');
expect(source).toContain('Belum ada data');
expect(source).toContain('aria-label="Pilih jenis investasi"');
expect(source).toContain('Sumber nilai');
expect(source).not.toContain('className="investment-provenance"');
```

- [ ] **Step 2: Run the focused page tests and verify RED**

Run: `npx jest --runTestsByPath src/app/investments/investments-availability.test.ts src/app/investments/investment-presentation.test.ts --runInBand`

Expected: FAIL on the new structure/copy assertions.

- [ ] **Step 3: Restructure the page without changing handlers**

Implement this DOM order inside the existing ready state:

```tsx
<header className="investment-page-header">...</header>
<section className="investment-overview" aria-labelledby="investment-overview-title">...</section>
<section className="investment-workspace" aria-labelledby="investment-snapshot-form-title">
  <nav className="investment-asset-switcher" aria-label="Pilih jenis investasi">...</nav>
  <form id="investment-snapshot-form" onSubmit={handleSubmit}>...</form>
</section>
<section className="investment-history" aria-labelledby="investment-history-title">...</section>
```

Specific behavior:

- Replace the standalone provenance section with `investment-source-note` beside the live gold price/current-value review.
- Render `Belum ada data` when `invested <= 0`; do not render a green prefix or `0%`.
- Keep the native select available to form submission logic, but expose the prominent Gold/Mutual Fund switcher as buttons with `aria-pressed`.
- Add stable `htmlFor`/`id` pairs for month, invested amount, gold grams/price, mutual-fund platform/product/units/NAV, and current value.
- Preserve `handleSubmit`, `handleDelete`, `loadSnapshot`, API payloads, and calculator effects.
- Keep loading/error/empty/populated history states and existing retry behavior.
- Disable save during `isSaving` and keep visible progress text.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx jest --runTestsByPath src/app/investments/investments-availability.test.ts src/app/investments/investment-history.test.ts src/app/investments/investment-presentation.test.ts --runInBand`

Expected: PASS.

---

### Task 3: Hallmark page-scoped visual system

**Files:**
- Modify: `src/app/globals.css`
- Modify: `.hallmark/log.json`
- Create: `.hallmark/preflight.json`

**Interfaces:**
- Consumes the class names introduced by Task 2.
- Produces no JavaScript API.

- [ ] **Step 1: Add the Hallmark stamps and cached pre-flight evidence**

Record:

```json
{
  "framework": "Next.js 16 App Router with Tailwind CSS 4",
  "fontStack": "system UI",
  "palette": "existing FinTrack mint tokens",
  "motion": "motion-cut",
  "spacing": "existing CSS plus 4px page-scoped scale",
  "scannedAt": "2026-08-10"
}
```

Prepend a `.hallmark/log.json` entry for `Split Studio`, existing mint theme, no enrichment, and this redesign brief.

- [ ] **Step 2: Add page-scoped CSS using named tokens**

Add only named tokens to `:root` and use them from `.investments-page` selectors. Required layout behavior:

- Desktop: compact header, two-card overview, split workspace with asset context and form/review hierarchy.
- Below 960px: one-column workspace and history.
- Below 640px: full-width controls, 44px targets, overview cards stack, long values wrap safely.
- `html, body { overflow-x: clip; }` remains in force.
- Neutral/positive/negative return styles communicate state with text and colour.
- No gradients, decorative imagery, or new animation; existing reduced-motion behavior remains.

- [ ] **Step 3: Run focused tests and static validation**

Run:

```bash
npx jest --runTestsByPath src/app/investments/investments-availability.test.ts src/app/investments/investment-history.test.ts src/app/investments/investment-presentation.test.ts --runInBand
npx tsc --noEmit
npm run lint
git diff --check
```

Expected: all commands exit 0; the known unrelated lint warning may remain but no error is allowed.

---

### Task 4: Research and durable iteration evidence

**Files:**
- Create: `docs/engineering/research/2026-08-10-bounded-market-feature-opportunities.md`
- Create: `docs/engineering/iterations/iteration-062.md`
- Modify: `docs/engineering/autonomous-state.md`
- Modify through CLI only: `docs/engineering/loop-state.json`

**Interfaces:**
- Research output informs future iteration selection; it does not alter runtime behavior.
- Loop state must identify the exact reviewed/authorized HEAD before publication.

- [ ] **Step 1: Add the completed primary-source market report**

Copy the completed report from the configured checkout without altering its content. It must retain official OJK, BI, KSEI, and official competitor citations and the ranked feature sequence.

- [ ] **Step 2: Document Iteration 062**

Record the approved problem, scope/non-goals, graph impact, accessibility, security, financial correctness, exact validation outcomes, visual validation, rollback, market follow-up, and PR reference state.

- [ ] **Step 3: Reconcile loop control before publication**

Archive the accepted Iteration 061 state, initialize Iteration 062 through `npm run loop:control`, record preflight, each validation, and independent review. Do not manually fabricate review or authorization evidence.

- [ ] **Step 4: Run full validation**

Run:

```bash
npx prisma format
npx prisma validate
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npm run build
npm run db:status
npm run db:verify
npm audit --omit=dev --audit-level=critical
git diff --check
```

Classify every result exactly as Passed, Failed, Blocked by environment, or Not applicable.

- [ ] **Step 5: Perform visual and independent review**

Render the page when authenticated fixture data is available and inspect 320, 375, 414, 768, and desktop widths. Request a fresh independent diff review for architecture, security, financial correctness, reliability, UX, accessibility, and tests. Resolve confirmed High/Critical findings.

- [ ] **Step 6: Authorize and publish**

Only after the exact HEAD passes validation/review: run `authorize-publication`, create the focused conventional commit(s) allowed by repository governance, push the branch, create/update one PR against `main`, record publication, and accept the iteration. Never merge automatically.

---

## Plan self-review

- Spec coverage: page hierarchy, data-flow preservation, neutral zero states, provenance relocation, responsive behavior, accessibility, market follow-up, testing, and rollback are each mapped to a task.
- Placeholder scan: every requirement and code step is concrete.
- Type consistency: Task 2 consumes the exact helper exported by Task 1; Task 3 consumes Task 2 class names; no runtime contract changes across tasks.
