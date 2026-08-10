jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';

beforeEach(() => jest.clearAllMocks());

it('requires authentication before previewing imported data', async () => {
  jest.mocked(getCurrentUserId).mockResolvedValue(null);
  const response = await POST(new Request('http://localhost/api/transactions/import/preview', { method: 'POST', body: JSON.stringify({ csv: 'date,type\n' }) }) as never);
  expect(response.status).toBe(401);
});

it('returns a duplicate-aware preview without persisting rows', async () => {
  jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7));
  const csv = 'date,type,category,description,amount\n2026-08-01,EXPENSE,Food,Lunch,25000\n2026-08-01,EXPENSE,Food,Lunch,25000';
  const response = await POST(new Request('http://localhost/api/transactions/import/preview', { method: 'POST', body: JSON.stringify({ csv }) }) as never);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(expect.objectContaining({ responseStatus: 'SUCCESS', responseDetails: expect.objectContaining({ duplicateRows: [3] }) }));
});
