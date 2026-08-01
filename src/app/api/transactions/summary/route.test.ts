jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/transaction.service', () => ({ getMonthlySummary: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { getMonthlySummary } from '@/services/transaction.service';
import { GET } from './route';
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); });
it('keeps monthly summary failures private', async () => {
  jest.mocked(getMonthlySummary).mockRejectedValue(new Error('private monthly financial data')); const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const response = await GET(new Request('http://localhost/api/transactions/summary?month=2026-07') as never);
  expect(response.status).toBe(500); expect(log).toHaveBeenCalledWith('Error getting monthly summary:', { code: 'UNCLASSIFIED' });
  expect(log.mock.calls.flat().join(' ')).not.toContain('private monthly financial data'); log.mockRestore();
});
