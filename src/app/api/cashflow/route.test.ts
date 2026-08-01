jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/cashflow.service', () => ({
  saveCashflow: jest.fn(),
  getCashflowHistory: jest.fn(),
}));

import { getCurrentUserId } from '@/lib/auth';
import { getCashflowHistory, saveCashflow } from '@/services/cashflow.service';
import { GET, POST } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedSave = jest.mocked(saveCashflow);
const mockedHistory = jest.mocked(getCashflowHistory);
const validBody = { month: '2026-07', income: 100, expense_rent: 10, expense_living: 20, expense_other: 5 };

beforeEach(() => {
  jest.clearAllMocks();
  mockedUserId.mockResolvedValue(BigInt(7));
});

describe('cashflow API error privacy', () => {
  it('keeps POST failures private while preserving an allowlisted code', async () => {
    mockedSave.mockRejectedValue({ code: 'P2034', message: 'private encrypted cashflow details' });
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(new Request('http://localhost/api/cashflow', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validBody),
    }) as never);

    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith('Error saving cashflow:', { code: 'P2034' });
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain('private encrypted cashflow details');
    errorLog.mockRestore();
  });

  it('keeps GET failures private and classifies unknown errors', async () => {
    mockedHistory.mockRejectedValue(new Error('private cashflow SQL details'));
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith('Error getting cashflow history:', { code: 'UNCLASSIFIED' });
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain('private cashflow SQL details');
    errorLog.mockRestore();
  });
});
