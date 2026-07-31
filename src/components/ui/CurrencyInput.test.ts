import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CurrencyInput from './CurrencyInput';

describe('CurrencyInput accessibility contract', () => {
  it('passes form and validation attributes to the underlying input', () => {
    const props: React.ComponentProps<typeof CurrencyInput> = {
      id: 'amount',
      name: 'transaction_amount',
      value: '1000',
      onChange: () => undefined,
      'aria-describedby': 'amount-help',
      'aria-invalid': true,
    };

    const html = renderToStaticMarkup(React.createElement(CurrencyInput, props));

    expect(html).toContain('id="amount"');
    expect(html).toContain('name="transaction_amount"');
    expect(html).toContain('aria-describedby="amount-help"');
    expect(html).toContain('aria-invalid="true"');
  });
});
