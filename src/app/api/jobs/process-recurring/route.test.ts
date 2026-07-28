jest.mock('@/services/recurring.service', () => ({
  getSafeRecurringErrorCode: (error: { code?: string }) => (
    ['P1001', 'P2002', 'P2025', 'P2034'].includes(error?.code ?? '')
      ? error.code
      : 'UNCLASSIFIED'
  ),
  processAllDueRecurrings: jest.fn(),
}));

import { processAllDueRecurrings } from '@/services/recurring.service';
import { POST } from './route';

describe('POST /api/jobs/process-recurring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    jest.restoreAllMocks();
  });

  it.each([undefined, '', 'Basic cron-secret', 'Bearer', 'Bearer wrong-secret'])(
    'returns an exact private 401 without processing for credential %p',
    async (authorization) => {
      const response = await POST(new Request('https://fintrack.example/api/jobs/process-recurring', {
        method: 'POST',
        headers: authorization ? { authorization } : undefined,
      }));

      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
      await expect(response.json()).resolves.toEqual({
        responseCode: 401,
        responseStatus: 'ERROR',
        responseMessage: 'Invalid cron credentials',
        responseDetails: null,
      });
      expect(processAllDueRecurrings).not.toHaveBeenCalled();
    },
  );

  it('fails closed and private when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(new Request('https://fintrack.example/api/jobs/process-recurring', {
      method: 'POST',
      headers: { authorization: 'Bearer any-value' },
    }));

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(processAllDueRecurrings).not.toHaveBeenCalled();
  });

  it('returns only private aggregate counts for an authenticated scheduler', async () => {
    jest.mocked(processAllDueRecurrings).mockResolvedValue({
      created: 2,
      skipped: 1,
      failed: 1,
      userId: BigInt(7),
      results: [{ ruleId: BigInt(9), category: 'Housing' }],
    } as never);
    const response = await POST(new Request('https://fintrack.example/api/jobs/process-recurring', {
      method: 'POST', headers: { authorization: 'Bearer cron-secret' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(processAllDueRecurrings).toHaveBeenCalledWith(expect.any(Date));
    const body = await response.json();
    expect(body).toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Recurring transactions processed',
      responseDetails: { created: 2, skipped: 1, failed: 1 },
    });
    expect(JSON.stringify(body)).not.toMatch(/userId|user_id|ruleId|results|Housing/);
  });

  it('keeps an empty completed run aggregate and private', async () => {
    jest.mocked(processAllDueRecurrings).mockResolvedValue({ created: 0, skipped: 0, failed: 0 });

    const response = await POST(new Request('https://fintrack.example/api/jobs/process-recurring', {
      method: 'POST',
      headers: { authorization: 'Bearer cron-secret' },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      responseDetails: { created: 0, skipped: 0, failed: 0 },
    }));
  });

  it('returns a generic private 500 and logs only a safe code', async () => {
    const rawError = Object.assign(
      new Error('Database failed for user 7 at mysql://private-host'),
      { code: 'P1001', meta: { ruleId: BigInt(9) } },
    );
    jest.mocked(processAllDueRecurrings).mockRejectedValue(rawError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(new Request('https://fintrack.example/api/jobs/process-recurring', {
      method: 'POST',
      headers: { authorization: 'Bearer cron-secret' },
    }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(body).toEqual({
      responseCode: 500,
      responseStatus: 'ERROR',
      responseMessage: 'Internal server error',
      responseDetails: null,
    });
    expect(JSON.stringify(body)).not.toContain(rawError.message);
    expect(consoleError).toHaveBeenCalledWith('Recurring scheduler failed', { code: 'P1001' });
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/private-host|user 7|ruleId/);
  });
});
