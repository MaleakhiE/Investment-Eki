jest.mock('@/services/notification.service', () => ({
  getSafeNotificationErrorCode: (error: { code?: string }) => error.code || 'UNCLASSIFIED',
  sendMonthlyNotifications: jest.fn(),
}));

import { sendMonthlyNotifications } from '@/services/notification.service';
import { POST } from './route';

const send = jest.mocked(sendMonthlyNotifications);
const request = (authorization?: string) => new Request(
  'https://fintrack.example/api/notifications/send-monthly',
  {
    method: 'POST',
    headers: authorization ? { authorization } : undefined,
  },
) as never;

describe('POST /api/notifications/send-monthly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it.each([undefined, '', 'Basic cron-secret', 'Bearer', 'Bearer wrong-secret'])(
    'returns an exact private 401 without sending for credential %p',
    async (authorization) => {
      const response = await POST(request(authorization));

      expect(response.status).toBe(401);
      expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
      await expect(response.json()).resolves.toEqual({
        responseCode: 401,
        responseStatus: 'ERROR',
        responseMessage: 'Invalid cron credentials',
        responseDetails: null,
      });
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('fails closed and private when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;

    const response = await POST(request('Bearer any-value'));

    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(send).not.toHaveBeenCalled();
  });

  it('returns only aggregate counts for a mixed delivery run', async () => {
    send.mockResolvedValue({
      sent: 1,
      failed: 1,
      skipped: 2,
      results: [
        { userId: BigInt(7), type: 'SUMMARY', success: true },
        { userId: BigInt(8), type: 'REMINDER', success: false },
      ],
    } as never);

    const response = await POST(request('Bearer cron-secret'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body).toEqual({
      responseCode: 200,
      responseStatus: 'SUCCESS',
      responseMessage: 'Monthly notifications processed: 1 sent, 1 failed, 2 skipped',
      responseDetails: { sent: 1, failed: 1, skipped: 2, total: 4 },
    });
    expect(JSON.stringify(body)).not.toMatch(/results|details|userId|user_id|REMINDER|SUMMARY|success/);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('keeps an empty run aggregate and private', async () => {
    send.mockResolvedValue({ sent: 0, failed: 0, skipped: 0, results: [] } as never);

    const response = await POST(request('Bearer cron-secret'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      responseDetails: { sent: 0, failed: 0, skipped: 0, total: 0 },
    }));
  });

  it('returns a generic private 500 and does not log raw failure details', async () => {
    const rawError = Object.assign(
      new Error('SMTP failed for person@example.com, user 7'),
      { code: 'EAUTH' },
    );
    send.mockRejectedValue(rawError);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await POST(request('Bearer cron-secret'));
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
    expect(consoleError).toHaveBeenCalledWith(
      'Monthly notification scheduler failed',
      { code: 'EAUTH' },
    );
    consoleError.mockRestore();
  });
});
