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

describe('transaction item error privacy', () => {
  let errorLog: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => errorLog.mockRestore());

  it.each([
    ['PUT', PUT, updateTransaction],
    ['DELETE', DELETE, deleteTransaction],
  ] as const)('keeps %s failures private while preserving a safe code', async (_method, handler, service) => {
    const privateMessage = 'private SQL transaction amount and account id';
    service.mockRejectedValue(new Error(privateMessage));

    const response = await handler(request, params('7'));

    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith(expect.any(String), { code: 'UNCLASSIFIED' });
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain(privateMessage);
  });
});
