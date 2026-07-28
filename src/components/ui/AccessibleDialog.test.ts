import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccessibleDialog from './AccessibleDialog';

describe('AccessibleDialog', () => {
  it('renders nothing while closed', () => {
    const props: React.ComponentProps<typeof AccessibleDialog> = {
      open: false,
      labelledBy: 'history-title',
      onClose: () => undefined,
      children: React.createElement('p', null, 'Hidden history'),
    };
    const html = renderToStaticMarkup(React.createElement(AccessibleDialog, props));

    expect(html).toBe('');
  });

  it('renders a labelled native modal dialog while open', () => {
    const props: React.ComponentProps<typeof AccessibleDialog> = {
      open: true,
      labelledBy: 'history-title',
      onClose: () => undefined,
      children: React.createElement('h2', { id: 'history-title' }, 'All transactions'),
    };
    const html = renderToStaticMarkup(React.createElement(AccessibleDialog, props));

    expect(html).toContain('<dialog');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="history-title"');
    expect(html).toContain('All transactions');
  });

  it('owns the native modal and reversible focus/scroll lifecycle', () => {
    const source = fs.readFileSync(path.join(
      process.cwd(),
      'src/components/ui/AccessibleDialog.tsx',
    ), 'utf8');

    expect(source).toContain('showModal()');
    expect(source).toContain("'[data-dialog-initial-focus]')?.focus()");
    expect(source).toContain('event.preventDefault()');
    expect(source).toContain('if (event.target === event.currentTarget) onClose()');
    expect(source).toContain("document.body.style.overflow = 'hidden'");
    expect(source).toContain('previousOverflow');
    expect(source).toContain('if (dialog.open) dialog.close()');
    expect(source).toContain('previousFocus?.isConnected');
    expect(source).toContain('previousFocus.focus()');
  });

  it('is wired to the read-only Cashflow history surface', () => {
    const source = fs.readFileSync(path.join(
      process.cwd(),
      'src/app/cashflow/page.tsx',
    ), 'utf8');

    expect(source).toContain("import AccessibleDialog from '@/components/ui/AccessibleDialog'");
    expect(source).toContain('<AccessibleDialog');
    expect(source).toContain('labelledBy="all-transactions-title"');
    expect(source).toContain('id="all-transactions-title"');
    expect(source).toContain('data-dialog-initial-focus');
    expect(source).toContain('transactions.map((tx)');
    expect(source).toContain('{transactions.length} transactions');
    expect(source).toContain('Net: {fmt(net)}');
    expect(source).toContain('overflow-y-auto max-h-[60vh]');
  });
});
