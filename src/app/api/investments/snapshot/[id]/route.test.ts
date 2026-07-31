jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/investment.service', () => ({ deleteSnapshot: jest.fn() }));

import { getCurrentUserId } from '@/lib/auth';
import { deleteSnapshot } from '@/services/investment.service';
import { DELETE } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedDeleteSnapshot = jest.mocked(deleteSnapshot);
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const request = new Request('http://localhost/api/investments/snapshot/1', { method: 'DELETE' }) as never;

beforeEach(() => {
  jest.clearAllMocks();
  mockedUserId.mockResolvedValue(BigInt(7));
  mockedDeleteSnapshot.mockResolvedValue({ success: true });
});

describe('DELETE /api/investments/snapshot/[id]', () => {
  it('authenticates before validating the identifier', async () => {
    mockedUserId.mockResolvedValueOnce(null);

    const response = await DELETE(request, params('invalid'));

    expect(response.status).toBe(401);
    expect(mockedDeleteSnapshot).not.toHaveBeenCalled();
  });

  it.each(['invalid', '0', '00', '01', '-1', '1.0', '1e3', '9223372036854775808'])(
    'rejects malformed snapshot ID %s before invoking the service',
    async (id) => {
      const response = await DELETE(request, params(id));

      expect(response.status).toBe(400);
      expect((await response.json()).responseDetails).toEqual({ errors: ['Invalid snapshot ID'] });
      expect(mockedDeleteSnapshot).not.toHaveBeenCalled();
    },
  );

  it.each(['1', '9223372036854775807'])('passes valid snapshot ID %s as bigint', async (id) => {
    const response = await DELETE(request, params(id));

    expect(response.status).toBe(200);
    expect(mockedDeleteSnapshot).toHaveBeenCalledWith(BigInt(7), BigInt(id));
  });

  it('maps a missing snapshot to the existing private 404', async () => {
    mockedDeleteSnapshot.mockResolvedValueOnce({ success: false, error: 'NOT_FOUND' });

    const response = await DELETE(request, params('1'));

    expect(response.status).toBe(404);
    expect((await response.json()).responseMessage).toBe('Snapshot not found');
  });

  it('sanitizes unexpected service failures', async () => {
    mockedDeleteSnapshot.mockRejectedValueOnce(Object.assign(new Error('private database detail'), { code: 'P2025' }));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await DELETE(request, params('1'));

    expect(response.status).toBe(500);
    expect(consoleError).toHaveBeenCalledWith('Error deleting snapshot:', { code: 'P2025' });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('private database detail');
    consoleError.mockRestore();
  });
});
