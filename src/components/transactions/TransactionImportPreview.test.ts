import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TransactionImportPreview, { requestTransactionPreview } from './TransactionImportPreview';

it('exposes an accessible, non-persisting CSV preview affordance', () => {
  const html = renderToStaticMarkup(React.createElement(TransactionImportPreview));
  expect(html).toContain('Review a CSV import');
  expect(html).toContain('Choose transaction CSV');
  expect(html).toContain('Preview manual statement rows and duplicates before anything is saved');
  expect(html).toContain('focus-within:ring-2');
});

it('requests a preview only and returns the server preview payload', async () => {
  const fetcher = jest.fn().mockResolvedValue(new Response(JSON.stringify({ responseDetails: { rows: [], validRows: 1, invalidRows: 0, duplicateRows: [] } }), { status: 200 })) as unknown as typeof fetch;
  await expect(requestTransactionPreview('date,type,category,description,amount\n2026-01-01,income,salary,Pay,100', fetcher)).resolves.toEqual({ rows: [], validRows: 1, invalidRows: 0, duplicateRows: [] });
  expect(fetcher).toHaveBeenCalledWith('/api/transactions/import/preview', expect.objectContaining({ method: 'POST' }));
  expect(fetcher).not.toHaveBeenCalledWith(expect.stringContaining('/api/transactions/import'), expect.objectContaining({ method: 'POST', body: expect.stringContaining('confirm') }));
});
