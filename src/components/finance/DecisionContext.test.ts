import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DecisionContext } from './DecisionContext';
import { parseCashflowTrend, summarizeCashflowTrend } from './chart-summary';

describe('DecisionContext', () => {
  it('renders source, state, and observed context for assistive technology', () => {
    const html = renderToStaticMarkup(React.createElement(DecisionContext, {
      title: 'Cashflow trend',
      state: 'verified',
      source: 'FinTrack ledger',
      observedAt: '10 Aug 2026, 09:00',
      description: 'Calculated from saved transactions; no live provider feed is used.',
    }));

    expect(html).toContain('Decision context');
    expect(html).toContain('Verified context');
    expect(html).toContain('FinTrack ledger');
    expect(html).toContain('10 Aug 2026, 09:00');
  });
});

describe('summarizeCashflowTrend', () => {
  const formatCurrency = (value: number) => `Rp ${value}`;

  it('returns an explicit unavailable state for empty data', () => {
    expect(summarizeCashflowTrend([], formatCurrency)).toBe('No cashflow data is available for this period.');
  });

  it('rejects malformed or non-finite API points instead of coercing them to zero', () => {
    expect(parseCashflowTrend([{ month: '2026-01', income: '100', expense: 40, net_cashflow: 60 }])).toBeNull();
    expect(parseCashflowTrend([{ month: '2026-01', income: 100, expense: Number.NaN, net_cashflow: 60 }])).toBeNull();
  });

  it('summarizes latest and peak values without using display values as inputs', () => {
    expect(summarizeCashflowTrend([
      { month: '2026-01', income: 100, expense: 40, net_cashflow: 60 },
      { month: '2026-02', income: 120, expense: 90, net_cashflow: 30 },
    ], formatCurrency)).toContain('Latest net cashflow is Rp 30');
    expect(summarizeCashflowTrend([
      { month: '2026-01', income: 100, expense: 40, net_cashflow: 60 },
      { month: '2026-02', income: 120, expense: 90, net_cashflow: 30 },
    ], formatCurrency)).toContain('Highest income was Rp 120 in 2026-02');
  });
});
