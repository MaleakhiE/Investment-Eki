jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/budget.service', () => ({
  createOrUpdateBudget: jest.fn(),
  getBudgets: jest.fn(),
  getBudgetAlerts: jest.fn(),
}));

import { getCurrentUserId } from '@/lib/auth';
import { createOrUpdateBudget, getBudgets } from '@/services/budget.service';
import { GET, POST } from './route';

const userId = jest.mocked(getCurrentUserId);
const budgets = jest.mocked(getBudgets);
const createBudget = jest.mocked(createOrUpdateBudget);
const privateFailure = () => Object.assign(new Error('budget amount 987654 private'), { code: 'P1001' });

beforeEach(() => {
  jest.clearAllMocks();
  userId.mockResolvedValue(BigInt(7));
});

describe('budget collection error privacy', () => {
  it.each([
    ['GET', () => { budgets.mockRejectedValueOnce(privateFailure()); return GET(new Request('http://localhost/api/budgets') as never); }],
    ['POST', () => { createBudget.mockRejectedValueOnce(privateFailure()); return POST(new Request('http://localhost/api/budgets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category: 'Food', amount: 100 }) }) as never); }],
  ])('sanitizes unexpected %s failures', async (_method, invoke) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await invoke();
    expect(response.status).toBe(500);
    expect((await response.json()).responseDetails).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.any(String), { code: 'P1001' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('987654');
    log.mockRestore();
  });
});
