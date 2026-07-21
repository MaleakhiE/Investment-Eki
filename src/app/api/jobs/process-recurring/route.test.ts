jest.mock('@/services/recurring.service', () => ({ processAllDueRecurrings: jest.fn() }));

import { processAllDueRecurrings } from '@/services/recurring.service';
import { POST } from './route';

describe('POST /api/jobs/process-recurring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
  });

  afterEach(() => delete process.env.CRON_SECRET);

  it('rejects an unauthenticated scheduler without processing users', async () => {
    const response = await POST(new Request('https://fintrack.example/api/jobs/process-recurring', { method: 'POST' }));
    expect(response.status).toBe(401);
    expect(processAllDueRecurrings).not.toHaveBeenCalled();
  });

  it('processes all due rules once for an authenticated scheduler', async () => {
    jest.mocked(processAllDueRecurrings).mockResolvedValue({ created: 2, skipped: 1, failed: 0 });
    const response = await POST(new Request('https://fintrack.example/api/jobs/process-recurring', {
      method: 'POST', headers: { authorization: 'Bearer cron-secret' },
    }));

    expect(response.status).toBe(200);
    expect(processAllDueRecurrings).toHaveBeenCalledWith(expect.any(Date));
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      responseDetails: { created: 2, skipped: 1, failed: 0 },
    }));
  });
});
