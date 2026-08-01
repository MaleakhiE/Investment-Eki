const getCurrentUserId = jest.fn();
const getTransactions = jest.fn();
const createTransaction = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentUserId }));
jest.mock('@/services/transaction.service', () => ({
  createTransaction,
  getTransactions,
}));

import { GET, POST } from './route';

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUserId.mockResolvedValue(BigInt(7));
  getTransactions.mockResolvedValue([]);
});

describe('transactions list date validation', () => {
  it('rejects an impossible calendar start date before calling the service', async () => {
    const response = await GET(new Request(
      'https://fintrack.example/api/transactions?startDate=2026-02-30',
    ) as never);

    expect(response.status).toBe(400);
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it('rejects a reversed date range before calling the service', async () => {
    const response = await GET(new Request(
      'https://fintrack.example/api/transactions?startDate=2026-08-01&endDate=2026-07-01',
    ) as never);

    expect(response.status).toBe(400);
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it('passes validated canonical date filters to the service', async () => {
    const response = await GET(new Request(
      'https://fintrack.example/api/transactions?startDate=2026-07-01&endDate=2026-07-31',
    ) as never);

    expect(response.status).toBe(200);
    expect(getTransactions).toHaveBeenCalledWith(
      BigInt(7),
      '2026-07-01',
      '2026-07-31',
      undefined,
    );
  });
});

describe('transaction collection error privacy', () => {
  let errorLog: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => errorLog.mockRestore());

  it('keeps GET failures private while preserving an allowlisted code', async () => {
    const privateMessage = 'private SQL and encrypted financial details';
    getTransactions.mockRejectedValue({ code: 'P1001', message: privateMessage });

    const response = await GET(new Request('https://fintrack.example/api/transactions') as never);

    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith('Error getting transactions:', { code: 'P1001' });
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain(privateMessage);
  });

  it('keeps POST failures private and classifies unknown errors', async () => {
    const privateMessage = 'private SQL and transaction amount';
    createTransaction.mockRejectedValue(new Error(privateMessage));

    const response = await POST(new Request('https://fintrack.example/api/transactions', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    }) as never);

    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith('Error creating transaction:', { code: 'UNCLASSIFIED' });
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain(privateMessage);
  });
});
