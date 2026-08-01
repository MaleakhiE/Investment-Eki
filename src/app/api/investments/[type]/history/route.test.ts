jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/investment.service', () => ({ getSnapshotsByUserAndType: jest.fn() }));

import { getCurrentUserId } from '@/lib/auth';
import { getSnapshotsByUserAndType } from '@/services/investment.service';
import { GET } from './route';

const mockedUserId = jest.mocked(getCurrentUserId);
const mockedGet = jest.mocked(getSnapshotsByUserAndType);
const params = (type: string) => ({ params: Promise.resolve({ type }) });

beforeEach(() => { jest.clearAllMocks(); mockedUserId.mockResolvedValue(BigInt(7)); });

it('keeps investment history failures private while preserving a safe code', async () => {
  mockedGet.mockRejectedValue({ code: 'P2034', message: 'private investment history details' });
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  const response = await GET(new Request('http://localhost/api/investments/GOLD/history') as never, params('GOLD'));

  expect(response.status).toBe(500);
  expect(errorLog).toHaveBeenCalledWith('Error getting investment history:', { code: 'P2034' });
  expect(errorLog.mock.calls.flat().join(' ')).not.toContain('private investment history details');
  errorLog.mockRestore();
});
