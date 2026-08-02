jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/services/goals.service', () => ({ createGoal: jest.fn(), getGoals: jest.fn(), getGoalsSummary: jest.fn() }));

import { getCurrentUserId } from '@/lib/auth';
import { createGoal, getGoals, getGoalsSummary } from '@/services/goals.service';
import { GET, POST } from './route';

const userId = jest.mocked(getCurrentUserId);
const goals = jest.mocked(getGoals);
const summary = jest.mocked(getGoalsSummary);
const create = jest.mocked(createGoal);
const privateFailure = () => Object.assign(new Error('goal amount 987654 private'), { code: 'P2034' });

beforeEach(() => { jest.clearAllMocks(); userId.mockResolvedValue(BigInt(7)); });

describe('goal collection error privacy', () => {
  it.each([
    ['GET', () => { goals.mockRejectedValueOnce(privateFailure()); return GET(new Request('http://localhost/api/goals') as never); }],
    ['summary GET', () => { summary.mockRejectedValueOnce(privateFailure()); return GET(new Request('http://localhost/api/goals?summary=true') as never); }],
    ['POST', () => { create.mockRejectedValueOnce(privateFailure()); return POST(new Request('http://localhost/api/goals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Emergency', target_amount: 100, category: 'Savings' }) }) as never); }],
  ])('sanitizes unexpected %s failures', async (_method, invoke) => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await invoke();
    expect(response.status).toBe(500);
    expect((await response.json()).responseDetails).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.any(String), { code: 'P2034' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('987654');
    log.mockRestore();
  });
});
