import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccountCard, AccountTransferLabel } from './AccountCard';

describe('account presentation', () => {
  it('keeps long account names bounded inside a mobile card', () => {
    const html = renderToStaticMarkup(React.createElement(AccountCard, { account: {
      id: '1', name: 'BCA Primary Operational Account With Long Name', type: 'BANK',
      balance: 1_250_000, opening_balance: 500_000, color: '#16332f',
    } }));

    expect(html).toContain('min-w-0');
    expect(html).toContain('truncate');
    expect(html).toContain('BCA Primary Operational Account With Long Name');
    expect(html).toContain('Rp\u00a01.250.000');
  });

  it('describes an internal transfer without income or expense semantics', () => {
    const html = renderToStaticMarkup(React.createElement(AccountTransferLabel, { source: 'BCA', destination: 'Mandiri' }));
    expect(html).toContain('BCA');
    expect(html).toContain('Mandiri');
    expect(html).toContain('Transfer');
  });
});
