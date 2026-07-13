# Settings Toggle and Gold Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unclear switches with one accessible shared control and restyle the gold calculator with a readable warm-gold palette.

**Architecture:** A stateless `ToggleSwitch` owns switch semantics, state labels, focus treatment, and visual states. Settings and investments pages consume it without changing API calls, calculations, persistence, or error handling.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Jest 30, React DOM server rendering.

## Global Constraints

- Existing settings APIs, notification behavior, gold-price sources, and calculation formulas remain unchanged.
- Enabled switches use mint; disabled switches use visible blue-gray.
- Every switch exposes `role="switch"`, `aria-checked`, a descriptive accessible label, and visible `On` or `Off` text.
- Interactive switch targets are at least 44 pixels.
- The gold calculator uses cream, muted gold, dark brown, and semantic source-status colors.
- Layouts must wrap without horizontal overflow on narrow screens.

---

### Task 1: Shared Accessible Toggle

**Files:**
- Create: `src/components/ui/ToggleSwitch.tsx`
- Create: `src/components/ui/ToggleSwitch.test.ts`
- Modify: `src/app/settings/page.tsx`

**Interfaces:**
- Produces: `ToggleSwitch({ checked, onChange, label, disabled?, compact? })`.
- Consumes: a boolean state and a callback receiving the next boolean state.

- [ ] **Step 1: Write the failing component contract tests**

```ts
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ToggleSwitch from './ToggleSwitch';

it('renders an enabled accessible switch with a visible state', () => {
  const html = renderToStaticMarkup(React.createElement(ToggleSwitch, {
    checked: true,
    onChange: () => undefined,
    label: 'Enable monthly reminder',
  }));
  expect(html).toContain('role="switch"');
  expect(html).toContain('aria-checked="true"');
  expect(html).toContain('On');
});

it('renders a disabled-state label and minimum touch target', () => {
  const html = renderToStaticMarkup(React.createElement(ToggleSwitch, {
    checked: false,
    onChange: () => undefined,
    label: 'Enable low balance alert',
  }));
  expect(html).toContain('aria-checked="false"');
  expect(html).toContain('Off');
  expect(html).toContain('min-h-11');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand src/components/ui/ToggleSwitch.test.ts`

Expected: FAIL because `ToggleSwitch.tsx` does not exist.

- [ ] **Step 3: Implement the minimal shared component**

```tsx
'use client';

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  compact?: boolean;
};

export default function ToggleSwitch({ checked, onChange, label, disabled = false, compact = false }: ToggleSwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label}
      disabled={disabled} onClick={() => onChange(!checked)}
      className="group inline-flex min-h-11 items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a88a] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
      {!compact && <span className={`text-xs font-semibold ${checked ? 'text-[#087f6b]' : 'text-[#667c78]'}`}>{checked ? 'On' : 'Off'}</span>}
      <span aria-hidden="true" className={`relative h-6 w-11 rounded-full border transition-colors ${checked ? 'border-[#00b894] bg-[#00cfa5]' : 'border-[#b8c9c5] bg-[#cbd8d5]'}`}>
        <span className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- --runInBand src/components/ui/ToggleSwitch.test.ts`

Expected: 2 tests pass.

- [ ] **Step 5: Replace duplicated settings switch markup**

Import `ToggleSwitch` into `src/app/settings/page.tsx`. Replace AI recommendation, monthly reminder, monthly summary, low-balance alert, and custom-alert toggle buttons. Preserve every existing callback, disabled condition, and accessible label. Use `compact` only for custom-alert rows where the alert action already provides adjacent context.

- [ ] **Step 6: Verify settings integration**

Run: `npm test -- --runInBand src/components/ui/ToggleSwitch.test.ts && npx tsc --noEmit`

Expected: tests and type checking pass.

### Task 2: Gold Calculator Palette and Control Integration

**Files:**
- Modify: `src/app/investments/page.tsx`
- Test: `src/components/ui/ToggleSwitch.test.ts`

**Interfaces:**
- Consumes: `ToggleSwitch` from Task 1.
- Preserves: `useGoldCalc`, `setUseGoldCalc`, `fetchGoldPrice`, `goldPriceData`, `goldPrice`, and `goldGrams` behavior.

- [ ] **Step 1: Add a failing gold variant contract test**

Add a `tone?: 'mint' | 'gold'` property and test:

```ts
const html = renderToStaticMarkup(React.createElement(ToggleSwitch, {
  checked: true,
  onChange: () => undefined,
  label: 'Use gold calculator',
  tone: 'gold',
}));
expect(html).toContain('border-[#c69218]');
expect(html).toContain('bg-[#d6a82b]');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --runInBand src/components/ui/ToggleSwitch.test.ts`

Expected: FAIL because `tone` is not defined and gold classes are absent.

- [ ] **Step 3: Implement the gold switch variant**

Extend `ToggleSwitchProps` with `tone?: 'mint' | 'gold'`. Select enabled label, border, track, and focus classes from immutable tone mappings while leaving the off state identical.

- [ ] **Step 4: Restyle the calculator and replace its checkbox**

In `src/app/investments/page.tsx`:

- Change the calculator surface to `border-[#e3cc8c] bg-[#fffaf0]`.
- Use `text-[#5e4712]` for the heading and field labels.
- Use `border-[#ead9a8] bg-[#fff2c8]` for the live-price strip.
- Use `text-[#9a6d08]` for the prominent price and refresh action.
- Keep the source badge green for live and red for offline.
- Use white inputs with `border-[#dfcf9f]`.
- Replace the native checkbox with `<ToggleSwitch tone="gold" checked={useGoldCalc} onChange={setUseGoldCalc} label="Use gold calculator" />`.
- Use `flex-col` at narrow widths and `sm:flex-row` for the heading/control row; change calculator fields to `grid-cols-1 sm:grid-cols-2`.

- [ ] **Step 5: Verify the complete implementation**

Run: `NODE_OPTIONS='-r dotenv/config' npm test -- --runInBand && npm run lint && npm run build && git diff --check`

Expected: all tests pass, ESLint reports zero errors, the production build exits zero, and the diff has no whitespace errors.

- [ ] **Step 6: Perform responsive visual QA**

Run the app locally, inspect `/settings` and `/investments` at approximately 390 by 844 and 1280 by 800, and verify switch contrast, visible state labels, focus treatment, calculator hierarchy, wrapping, and absence of horizontal overflow.

- [ ] **Step 7: Commit implementation**

```bash
git add src/components/ui/ToggleSwitch.tsx src/components/ui/ToggleSwitch.test.ts src/app/settings/page.tsx src/app/investments/page.tsx
git commit -m "fix: polish settings toggles and gold calculator"
```
