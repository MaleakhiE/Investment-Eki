const getCurrentUserId = jest.fn();
const getTransactions = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentUserId }));
jest.mock('@/services/transaction.service', () => ({
  createTransaction: jest.fn(),
  getTransactions,
}));

import { GET } from './route';

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
