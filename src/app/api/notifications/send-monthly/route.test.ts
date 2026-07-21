jest.mock('@/services/notification.service', () => ({
  sendMonthlyNotifications: jest.fn(),
}));

import { sendMonthlyNotifications } from '@/services/notification.service';
import { POST } from './route';

const send = jest.mocked(sendMonthlyNotifications);

describe('POST /api/notifications/send-monthly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret';
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it.each([undefined, 'Bearer wrong-secret'])(
    'returns 401 without sending for credential %s',
    async (authorization) => {
      const response = await POST(new Request('https://fintrack.example/api/notifications/send-monthly', {
        method: 'POST',
        headers: authorization ? { authorization } : undefined,
      }) as never);

      expect(response.status).toBe(401);
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('fails closed when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(new Request('https://fintrack.example/api/notifications/send-monthly', {
      method: 'POST',
      headers: { authorization: 'Bearer any-value' },
    }) as never);

    expect(response.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it('executes one notification run for a valid credential', async () => {
    send.mockResolvedValue({ sent: 1, failed: 0, skipped: 2, results: [] });
    const response = await POST(new Request('https://fintrack.example/api/notifications/send-monthly', {
      method: 'POST',
      headers: { authorization: 'Bearer cron-secret' },
    }) as never);

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      responseDetails: expect.objectContaining({ sent: 1, failed: 0, skipped: 2 }),
    }));
  });
});
