jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/account.service', () => ({
  updateAccount: jest.fn(),
  archiveAccount: jest.fn(),
}));

import { getCurrentUserId } from '@/lib/auth';
import { archiveAccount, updateAccount } from '@/services/account.service';
import { DELETE, PUT } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedUpdateAccount = jest.mocked(updateAccount);
const mockedArchiveAccount = jest.mocked(archiveAccount);
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const putRequest = (body: unknown) => new Request('http://localhost/api/accounts/30', {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
}) as never;
const deleteRequest = () => new Request('http://localhost/api/accounts/30', { method: 'DELETE' }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUserId.mockResolvedValue(BigInt(7));
  mockedUpdateAccount.mockResolvedValue({ success: true, account: { id: BigInt(30) } } as never);
  mockedArchiveAccount.mockResolvedValue({ success: true } as never);
});

describe('/api/accounts/[id] identifier boundary', () => {
  it.each(['invalid', '0', '00', '01', '-1', '1.0', '1e3', '9223372036854775808'])(
    'rejects malformed PUT ID %s before parsing JSON or invoking the service',
    async (id) => {
      const response = await PUT(putRequest({}), params(id));

      expect(response.status).toBe(400);
      expect((await response.json()).responseDetails).toEqual({ errors: ['Invalid account ID'] });
      expect(mockedUpdateAccount).not.toHaveBeenCalled();
    },
  );

  it.each(['invalid', '0', '00', '01', '-1', '1.0', '1e3', '9223372036854775808'])(
    'rejects malformed DELETE ID %s before invoking the service',
    async (id) => {
      const response = await DELETE(deleteRequest(), params(id));

      expect(response.status).toBe(400);
      expect((await response.json()).responseDetails).toEqual({ errors: ['Invalid account ID'] });
      expect(mockedArchiveAccount).not.toHaveBeenCalled();
    },
  );

  it.each(['1', '9223372036854775807'])('passes valid PUT ID %s as bigint', async (id) => {
    const response = await PUT(putRequest({ name: 'BCA', type: 'BANK', opening_balance: 0 }), params(id));

    expect(response.status).toBe(200);
    expect(mockedUpdateAccount).toHaveBeenCalledWith(BigInt(7), BigInt(id), expect.any(Object));
  });

  it.each(['1', '9223372036854775807'])('passes valid DELETE ID %s as bigint', async (id) => {
    const response = await DELETE(deleteRequest(), params(id));

    expect(response.status).toBe(200);
    expect(mockedArchiveAccount).toHaveBeenCalledWith(BigInt(7), BigInt(id));
  });

  it('authenticates before validating PUT identifiers', async () => {
    mockedUserId.mockResolvedValueOnce(null);

    const response = await PUT(putRequest({}), params('invalid'));

    expect(response.status).toBe(401);
    expect(mockedUpdateAccount).not.toHaveBeenCalled();
  });

  it('authenticates before validating DELETE identifiers', async () => {
    mockedUserId.mockResolvedValueOnce(null);

    const response = await DELETE(deleteRequest(), params('invalid'));

    expect(response.status).toBe(401);
    expect(mockedArchiveAccount).not.toHaveBeenCalled();
  });
});
