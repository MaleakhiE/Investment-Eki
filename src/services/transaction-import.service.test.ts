import { previewTransactionCsv } from './transaction-import.service';

describe('previewTransactionCsv', () => {
  it('parses quoted fields and identifies duplicate rows without writing data', () => {
    const preview = previewTransactionCsv([
      'date,type,category,description,amount,account',
      '2026-08-01,EXPENSE,Food,"QRIS, lunch",25000,BCA',
      '2026-08-01,EXPENSE,Food,"QRIS, lunch",25000,BCA',
    ].join('\n'));
    expect(preview).toEqual(expect.objectContaining({ validRows: 2, invalidRows: 0, duplicateRows: [3] }));
    if ('rows' in preview) expect(preview.rows[0].input).toEqual(expect.objectContaining({ description: 'QRIS, lunch', amount: 25000 }));
  });

  it('reports row-level validation errors and rejects malformed input', () => {
    const preview = previewTransactionCsv([
      'date,type,category,description,amount',
      '2026-02-30,TRANSFER,,Dinner,not-money',
      '2026-08-01,INCOME,Salary,Pay,1000000',
    ].join('\n'));
    expect(preview).toEqual(expect.objectContaining({ validRows: 1, invalidRows: 1, duplicateRows: [] }));
    if ('rows' in preview) expect(preview.rows[0].errors).toEqual(expect.arrayContaining(['date must use a valid YYYY-MM-DD value', 'type must be INCOME or EXPENSE']));
    expect(previewTransactionCsv('date,type\n')).toEqual({ errors: ['CSV must include a header and at least one transaction row'] });
  });
});
