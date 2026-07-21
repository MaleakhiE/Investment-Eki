jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/lib/encryption', () => ({
  decrypt: jest.fn(),
  decryptNumber: jest.fn(),
}));

import { exportToCSV } from './export.service';

describe('exportToCSV', () => {
  it('quotes every field and safely preserves commas, quotes, and newlines', () => {
    const csv = exportToCSV([{
      date: '2026-07-21',
      type: 'EXPENSE',
      category: 'Food, Drink',
      description: 'Lunch at "Maju"\nwith dessert',
      amount: 125_000,
    }]);

    expect(csv).toBe([
      '"Date","Type","Category","Description","Amount"',
      '"2026-07-21","EXPENSE","Food, Drink","Lunch at ""Maju""\nwith dessert","125000"',
    ].join('\n'));
  });

  it.each([
    ['=SUM(1,1)', "'=SUM(1,1)"],
    ['+cmd', "'+cmd"],
    ['-2+3', "'-2+3"],
    ['@IMPORTXML', "'@IMPORTXML"],
    ['\t=1+1', "'\t=1+1"],
    ['\r=1+1', "'\r=1+1"],
    [' =1+1', "' =1+1"],
    ['\n=1+1', "'\n=1+1"],
    ['\uFEFF@SUM(1,1)', "'\uFEFF@SUM(1,1)"],
  ])('neutralizes spreadsheet formula cell %p', (description, neutralized) => {
    const csv = exportToCSV([{
      date: '2026-07-21',
      type: 'EXPENSE',
      category: 'Other',
      description,
      amount: 1,
    }]);

    expect(csv.split('\n').slice(1).join('\n')).toContain(`"${neutralized}"`);
  });
});
