const getCurrentUserId = jest.fn();
const updateTransaction = jest.fn();
const deleteTransaction = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentUserId }));
jest.mock('@/services/transaction.service', () => ({
  updateTransaction,
  deleteTransaction,
}));

import { DELETE, PUT } from './route';

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const json = jest.fn();
const request = { json } as never;

beforeEach(() => {
  jest.clearAllMocks();
  getCurrentUserId.mockResolvedValue(BigInt(7));
});

describe('transaction item ID validation', () => {
  it.each(['invalid', '0', '-1', '01', '9223372036854775808'])(
    'rejects invalid ID %p before reading or mutating',
    async (id) => {
      const putResponse = await PUT(request, params(id));
      const deleteResponse = await DELETE(request, params(id));

      expect(putResponse.status).toBe(400);
      expect(deleteResponse.status).toBe(400);
      expect(json).not.toHaveBeenCalled();
      expect(updateTransaction).not.toHaveBeenCalled();
      expect(deleteTransaction).not.toHaveBeenCalled();
    },
  );
});
