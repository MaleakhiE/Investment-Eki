import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TransactionImportPreview from './TransactionImportPreview';

it('exposes an accessible, non-persisting CSV preview affordance', () => {
  const html = renderToStaticMarkup(React.createElement(TransactionImportPreview));
  expect(html).toContain('Review a CSV import');
  expect(html).toContain('Choose transaction CSV');
  expect(html).toContain('Preview manual statement rows and duplicates before anything is saved');
});
