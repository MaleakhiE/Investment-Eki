import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MetricCard, ProgressCard, TransactionRow } from './index';

describe('finance presentation components', () => {
  it('renders metric content', () => { const html = renderToStaticMarkup(React.createElement(MetricCard, { label: 'Income', value: 'Rp 8.8m', tone: 'mint' })); expect(html).toContain('Income'); expect(html).toContain('Rp 8.8m'); });
  it('exposes progress semantics', () => { const html = renderToStaticMarkup(React.createElement(ProgressCard, { label: 'Emergency fund', value: 64, detail: 'Rp 6.4m of Rp 10m' })); expect(html).toContain('aria-valuenow="64"'); });
  it('describes transaction direction in text', () => { const html = renderToStaticMarkup(React.createElement(TransactionRow, { title: 'Groceries', meta: 'Cash', amount: '-Rp 328k', direction: 'expense' })); expect(html).toContain('Expense'); });
});
