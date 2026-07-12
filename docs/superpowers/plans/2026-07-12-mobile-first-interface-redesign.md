# FinTrack Mobile-First Interface Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every FinTrack interface as a coherent English-language, mobile-first finance application using the approved FinTrack-evolved visual system.

**Architecture:** A shared `AppShell`, centralized navigation metadata, semantic CSS tokens, and focused UI primitives provide one presentation system across all pages. Existing page data loading, API calls, authentication, authorization, and persistence remain unchanged while page markup migrates incrementally.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, NextAuth 5, Jest 30, Prisma 6.

## Global Constraints

- All user-facing copy is English.
- Mobile is the primary layout; the application must not horizontally overflow at 320 px.
- Mobile navigation contains Home, Activity, Invest, and More.
- Icons use one custom rounded line-icon system; emoji are prohibited.
- Interactive targets are at least 44 px on touch layouts.
- Existing API, calculation, authentication, authorization, and database behavior remains unchanged.
- SMTP credentials remain encrypted and server authorization remains authoritative.
- Desktop expands the mobile hierarchy rather than introducing a separate interface.

---

### Task 1: Design Tokens, Icons, and Responsive Application Shell

**Files:**
- Create: `src/components/ui/AppIcon.tsx`
- Create: `src/components/layout/navigation.ts`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/ui/Surface.tsx`
- Create: `src/components/ui/PageHeader.tsx`
- Create: `src/components/ui/ActionButton.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/layout/Sidebar.tsx`
- Test: `src/components/layout/navigation.test.ts`

**Interfaces:**
- Produces: `AppIcon({ name, size?, className? })`, `AppShell({ children, title?, eyebrow?, action? })`, `Surface`, `PageHeader`, `ActionButton`, and `primaryNavigation`/`moreNavigation` arrays.

- [ ] **Step 1: Write a failing navigation contract test**

```ts
import { primaryNavigation } from './navigation';

it('exposes the approved four mobile destinations', () => {
  expect(primaryNavigation.map((item) => item.label)).toEqual(['Home', 'Activity', 'Invest', 'More']);
  expect(primaryNavigation.every((item) => item.icon)).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- --runInBand src/components/layout/navigation.test.ts`
Expected: FAIL because `navigation.ts` does not exist.

- [ ] **Step 3: Implement navigation and reusable contracts**

```ts
export type NavigationItem = {
  label: string;
  href: string;
  icon: IconName;
  match: (pathname: string) => boolean;
};

export const primaryNavigation: NavigationItem[] = [
  { label: 'Home', href: '/dashboard', icon: 'home', match: (path) => path === '/dashboard' },
  { label: 'Activity', href: '/cashflow', icon: 'activity', match: (path) => path.startsWith('/cashflow') },
  { label: 'Invest', href: '/investments', icon: 'trend', match: (path) => path.startsWith('/investments') },
  { label: 'More', href: '#more', icon: 'grid', match: () => false },
];
```

Define semantic tokens for evergreen, mint, yellow, lavender, ink, muted text, borders, surfaces, radii, shadows, focus, safe areas, and content widths. Implement one SVG icon component with named path data, `aria-hidden` by default, `currentColor`, rounded caps, and a consistent 1.8 stroke.

- [ ] **Step 4: Replace Sidebar internals with AppShell-compatible responsive navigation**

Mobile renders a safe-area bottom bar and a More sheet. Desktop renders persistent compact navigation. `Sidebar` becomes a compatibility wrapper returning the shared navigation until every page directly uses `AppShell`.

- [ ] **Step 5: Verify GREEN and build stability**

Run: `npm test -- --runInBand src/components/layout/navigation.test.ts && npx tsc --noEmit && npm run build`
Expected: navigation test and build pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/layout src/components/ui
git commit -m "feat: add mobile-first design system and app shell"
```

### Task 2: Authentication Experience

**Files:**
- Create: `src/components/auth/AuthShell.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(auth)/forgot-password/page.tsx`
- Modify: `src/app/(auth)/reset-password/page.tsx`
- Test: `src/components/auth/AuthShell.test.tsx`

**Interfaces:**
- Consumes: `AppIcon`, `Surface`, and `ActionButton` from Task 1.
- Produces: `AuthShell({ title, description, children, footer })`.

- [ ] **Step 1: Add a failing render contract test**

```tsx
const html = renderToStaticMarkup(<AuthShell title="Welcome back" description="Sign in securely">Form</AuthShell>);
expect(html).toContain('Welcome back');
expect(html).toContain('Sign in securely');
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm test -- --runInBand src/components/auth/AuthShell.test.tsx`
Expected: FAIL because `AuthShell` does not exist.

- [ ] **Step 3: Implement the shared authentication shell**

Use a narrow mobile card, persistent labels, visible validation, password guidance, one full-width primary action, and restrained brand context on desktop. Do not change submit handlers, endpoint paths, or response handling.

- [ ] **Step 4: Migrate all authentication pages and standardize English copy**

Preserve field names, autocomplete attributes, loading state, error mapping, and navigation links. Ensure controls remain usable at 320 px.

- [ ] **Step 5: Verify**

Run: `npm test -- --runInBand src/components/auth/AuthShell.test.tsx && npx tsc --noEmit && npm run build`
Expected: focused test, type check, and build pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/auth src/app/'(auth)'
git commit -m "feat: redesign authentication for mobile"
```

### Task 3: Home and Activity

**Files:**
- Create: `src/components/finance/MetricCard.tsx`
- Create: `src/components/finance/TransactionRow.tsx`
- Create: `src/components/finance/ProgressCard.tsx`
- Create: `src/components/ui/FilterChips.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/cashflow/page.tsx`
- Test: `src/components/finance/finance-components.test.tsx`

**Interfaces:**
- Consumes: Task 1 shell and primitives.
- Produces: `MetricCard`, `TransactionRow`, `ProgressCard`, and `FilterChips` typed presentation components.

- [ ] **Step 1: Add failing component tests**

```tsx
const html = renderToStaticMarkup(<MetricCard label="Income" value="Rp 8.8m" tone="mint" />);
expect(html).toContain('Income');
expect(html).toContain('Rp 8.8m');
```

Test that transaction rows expose category, account, amount, and semantic positive/negative text without relying only on color.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- --runInBand src/components/finance/finance-components.test.tsx`
Expected: FAIL because finance components do not exist.

- [ ] **Step 3: Implement finance presentation components**

Keep components stateless and typed. Amounts use tabular numerals. Progress includes text and `aria-valuenow`. Row actions are 44 px minimum.

- [ ] **Step 4: Recompose Dashboard in the approved order**

Render net worth, monthly movement, income/spending metrics, quick actions, recent activity, budgets, and goals. Preserve all current data queries and handlers.

- [ ] **Step 5: Recompose Cash Flow**

Use filter chips, monthly summary, grouped transaction rows, and a clear add-transaction action. Preserve OCR and transaction API behavior. Use a bottom sheet on mobile and dialog/side panel on desktop.

- [ ] **Step 6: Verify**

Run: `npm test -- --runInBand src/components/finance/finance-components.test.tsx src/services/transaction.service.test.ts && npx tsc --noEmit && npm run build`
Expected: focused tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/finance src/components/ui/FilterChips.tsx src/app/dashboard src/app/cashflow
git commit -m "feat: redesign home and activity experiences"
```

### Task 4: Investments and Analytics

**Files:**
- Create: `src/components/finance/ChartCard.tsx`
- Create: `src/components/finance/HoldingRow.tsx`
- Modify: `src/app/investments/page.tsx`
- Modify: `src/app/analytics/page.tsx`
- Test: `src/components/finance/investment-components.test.tsx`

**Interfaces:**
- Consumes: shared shell, surfaces, metrics, progress, and icons.
- Produces: `ChartCard({ title, summary, children })` and `HoldingRow`.

- [ ] **Step 1: Add failing accessible chart and holding tests**

```tsx
const html = renderToStaticMarkup(<ChartCard title="Portfolio growth" summary="Portfolio increased 8.4 percent">Chart</ChartCard>);
expect(html).toContain('Portfolio increased 8.4 percent');
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- --runInBand src/components/finance/investment-components.test.tsx`
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement responsive finance visualization wrappers**

Set minimum chart heights, compact mobile legends, accessible summaries, and responsive overflow containment.

- [ ] **Step 4: Migrate Investments and Analytics**

Preserve calculations and API calls. Use portfolio value, movement, allocation, holdings, and performance order for Investments. Render one primary insight per Analytics section.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --runInBand src/components/finance/investment-components.test.tsx src/services/savings-suggestion.service.test.ts && npx tsc --noEmit && npm run build`
Expected: tests and build pass.

```bash
git add src/components/finance src/app/investments src/app/analytics
git commit -m "feat: redesign investments and analytics"
```

### Task 5: Budgets and Goals

**Files:**
- Modify: `src/app/budget/page.tsx`
- Modify: `src/app/goals/page.tsx`
- Reuse: `src/components/finance/ProgressCard.tsx`
- Test: `src/components/finance/ProgressCard.test.tsx`

**Interfaces:**
- Consumes: `ProgressCard` and shared form/action components.

- [ ] **Step 1: Add failing progress-state tests**

Test normal, near-limit, exceeded, completed, and overdue states with visible status text and accessible progress values.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- --runInBand src/components/finance/ProgressCard.test.tsx`
Expected: FAIL until all states are supported.

- [ ] **Step 3: Extend ProgressCard and migrate both pages**

Use mobile single-column cards, desktop responsive grids, concise remaining values, bottom-sheet forms on mobile, and unchanged CRUD handlers.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- --runInBand src/components/finance/ProgressCard.test.tsx && npx tsc --noEmit && npm run build`
Expected: focused tests and build pass.

```bash
git add src/components/finance/ProgressCard.tsx src/app/budget src/app/goals
git commit -m "feat: redesign budgets and goals"
```

### Task 6: Settings and Superadmin

**Files:**
- Create: `src/components/settings/SettingsGroup.tsx`
- Modify: `src/app/settings/page.tsx`
- Modify: `src/app/superadmin/smtp/page.tsx`
- Test: `src/components/settings/SettingsGroup.test.tsx`
- Reuse: existing superadmin SMTP API tests.

**Interfaces:**
- Produces: `SettingsGroup({ title, children })` and `SettingsRow({ label, description?, value?, action? })`.

- [ ] **Step 1: Add failing grouped-settings tests**

```tsx
const html = renderToStaticMarkup(<SettingsGroup title="Preferences"><SettingsRow label="AI recommendations" value="On" /></SettingsGroup>);
expect(html).toContain('Preferences');
expect(html).toContain('AI recommendations');
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npm test -- --runInBand src/components/settings/SettingsGroup.test.tsx`
Expected: FAIL because grouped settings components do not exist.

- [ ] **Step 3: Implement grouped rows and migrate Settings**

Present account identity, preferences, notifications, and sign-out in English. Preserve existing endpoint calls and toggle semantics.

- [ ] **Step 4: Migrate Superadmin SMTP**

Use the same shell and form primitives. Preserve role checks, masked username behavior, blank credential preservation, origin header, allowlist validation, verify, and send-test flows.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- --runInBand src/components/settings/SettingsGroup.test.tsx src/app/api/superadmin/smtp/route.test.ts src/services/smtp.service.test.ts && npx tsc --noEmit && npm run build`
Expected: all focused tests and build pass.

```bash
git add src/components/settings src/app/settings src/app/superadmin
git commit -m "feat: redesign settings and administration"
```

### Task 7: Global Cleanup, Accessibility, and Responsive Verification

**Files:**
- Modify: `src/app/globals.css`
- Modify: all migrated pages where browser verification finds defects.
- Delete: obsolete compatibility styles only after no migrated markup references them.
- Test: existing Jest suites plus browser viewport checks.

**Interfaces:**
- Consumes: every component and page from Tasks 1-6.

- [ ] **Step 1: Scan visible copy and icon usage**

Run: `rg -n "Pengaturan|Transaksi|Investasi|Analisis|Lainnya|Keluar|[😀-🙏]" src/app src/components`
Expected: no user-facing Indonesian copy and no emoji in redesigned UI.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test -- --runInBand && npx tsc --noEmit && npm run lint && npm run build && git diff --check`
Expected: all tests and build pass, lint has no new errors, and diff check is clean.

- [ ] **Step 3: Browser-verify representative widths**

At 320, 390, 768, 1024, and 1440 px, verify authentication, Home, Activity, Invest, Analytics, Budget, Goals, Settings, and Superadmin. Confirm no horizontal page overflow, bottom navigation safe-area clearance, 44 px touch targets, readable charts, usable forms, visible focus, English copy, and purposeful icons.

- [ ] **Step 4: Verify critical flows**

Run login, transaction create/edit/OCR review, investment viewing, budget create/edit, goal create/edit, settings toggles, forgot/reset password, SMTP save/verify/send-test authorization, empty states, loading states, and API failure states.

- [ ] **Step 5: Commit final polish**

```bash
git add src
git commit -m "fix: complete responsive accessibility polish"
```
