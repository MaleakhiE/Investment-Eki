jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/budget.service', () => ({ deleteBudget: jest.fn() }));

import { getCurrentUserId } from '@/lib/auth';
import { deleteBudget } from '@/services/budget.service';
import { DELETE } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedDeleteBudget = jest.mocked(deleteBudget);
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const request = new Request('http://localhost/api/budgets/1', { method: 'DELETE' }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUserId.mockResolvedValue(BigInt(7));
  mockedDeleteBudget.mockResolvedValue(undefined);
});

describe('DELETE /api/budgets/[id]', () => {
  it('authenticates before validating the identifier', async () => {
    mockedUserId.mockResolvedValueOnce(null);

    const response = await DELETE(request, params('invalid'));

    expect(response.status).toBe(401);
    expect(mockedDeleteBudget).not.toHaveBeenCalled();
  });

  it.each(['invalid', '0', '00', '01', '-1', '1.0', '1e3', '9223372036854775808'])(
    'rejects malformed budget ID %s before invoking the service',
    async (id) => {
      const response = await DELETE(request, params(id));

      expect(response.status).toBe(400);
      expect((await response.json()).responseDetails).toEqual({ errors: ['Invalid budget ID'] });
      expect(mockedDeleteBudget).not.toHaveBeenCalled();
    },
  );

  it.each(['1', '9223372036854775807'])('passes valid budget ID %s as bigint', async (id) => {
    const response = await DELETE(request, params(id));

    expect(response.status).toBe(200);
    expect(mockedDeleteBudget).toHaveBeenCalledWith(BigInt(7), BigInt(id));
  });

  it('keeps service failures private', async () => {
    mockedDeleteBudget.mockRejectedValueOnce(Object.assign(new Error('private database detail'), { code: 'P2025' }));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await DELETE(request, params('1'));

    expect(response.status).toBe(500);
    expect((await response.json()).responseDetails).toBeNull();
    expect(consoleError).toHaveBeenCalledWith('Delete budget error:', { code: 'P2025' });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('private database detail');
    consoleError.mockRestore();
  });
});
