const user = { findMany: jest.fn() };
const monthlyCashflow = { findUnique: jest.fn() };
const investment = { findUnique: jest.fn() };
const notificationLog = {
  create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(),
};
const mockDecrypt = jest.fn((value: string) => value);
const mockDecryptNumber = jest.fn((value: string) => Number(value));

jest.mock('@/lib/prisma', () => ({
  prisma: { user, monthlyCashflow, investment, notificationLog },
}));
jest.mock('@/lib/encryption', () => ({
  decrypt: mockDecrypt,
  decryptNumber: mockDecryptNumber,
}));
jest.mock('./smtp.service', () => ({ sendSmtpMail: jest.fn() }));

import { sendSmtpMail } from './smtp.service';
import {
  getCurrentMonth,
  getSafeNotificationErrorCode,
  sendMonthlyNotifications,
} from './notification.service';

describe('notification error taxonomy', () => {
  it('keeps only allowlisted operational codes', () => {
    expect(getSafeNotificationErrorCode({ code: 'EAUTH', message: 'secret' })).toBe('EAUTH');
    expect(getSafeNotificationErrorCode({ responseCode: 550, message: 'recipient rejected' }))
      .toBe('PROVIDER_550');
    expect(getSafeNotificationErrorCode({ code: 'SECRET_TOKEN', message: 'secret' }))
      .toBe('UNCLASSIFIED');
    expect(getSafeNotificationErrorCode(null)).toBe('UNCLASSIFIED');
    expect(getSafeNotificationErrorCode(new TypeError('private detail'))).toBe('TYPE_ERROR');
    expect(getSafeNotificationErrorCode({ responseCode: 399 })).toBe('UNCLASSIFIED');
    expect(getSafeNotificationErrorCode({ responseCode: 600 })).toBe('UNCLASSIFIED');
  });
});

describe('notification calendar', () => {
  it('uses the Asia/Jakarta month at a UTC month boundary', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-31T17:30:00.000Z'));
    expect(getCurrentMonth()).toBe('2026-08');
    jest.useRealTimers();
  });
});

describe('monthly notification idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(sendSmtpMail).mockReset().mockResolvedValue(undefined);
    user.findMany.mockResolvedValue([{
      id: BigInt(7),
      email: 'person@example.com',
      notificationSettings: null,
    }]);
    monthlyCashflow.findUnique.mockResolvedValue(null);
    investment.findUnique.mockResolvedValue(null);
    notificationLog.updateMany.mockResolvedValue({ count: 0 });
  });

  it('skips an opted-out reminder before every delivery side effect', async () => {
    user.findMany.mockResolvedValue([{
      id: BigInt(7),
      email: 'person@example.com',
      notificationSettings: { monthly_reminder: false, monthly_summary: true },
    }]);

    await expect(sendMonthlyNotifications()).resolves.toEqual({
      sent: 0,
      failed: 0,
      skipped: 1,
    });
    expect(monthlyCashflow.findUnique).toHaveBeenCalledTimes(1);
    expect(notificationLog.updateMany).not.toHaveBeenCalled();
    expect(notificationLog.create).not.toHaveBeenCalled();
    expect(notificationLog.update).not.toHaveBeenCalled();
    expect(mockDecrypt).not.toHaveBeenCalled();
    expect(sendSmtpMail).not.toHaveBeenCalled();
  });

  it('skips an opted-out summary before claims and financial-summary reads', async () => {
    user.findMany.mockResolvedValue([{
      id: BigInt(7),
      email: 'person@example.com',
      notificationSettings: { monthly_reminder: true, monthly_summary: false },
    }]);
    monthlyCashflow.findUnique.mockResolvedValue({ income: '1' });

    await expect(sendMonthlyNotifications()).resolves.toEqual({
      sent: 0,
      failed: 0,
      skipped: 1,
    });
    expect(monthlyCashflow.findUnique).toHaveBeenCalledTimes(1);
    expect(investment.findUnique).not.toHaveBeenCalled();
    expect(notificationLog.updateMany).not.toHaveBeenCalled();
    expect(notificationLog.create).not.toHaveBeenCalled();
    expect(mockDecrypt).not.toHaveBeenCalled();
    expect(sendSmtpMail).not.toHaveBeenCalled();
  });

  it('short-circuits both opt-outs before checking cashflow', async () => {
    user.findMany.mockResolvedValue([{
      id: BigInt(7),
      email: 'person@example.com',
      notificationSettings: { monthly_reminder: false, monthly_summary: false },
    }]);

    await expect(sendMonthlyNotifications()).resolves.toEqual({
      sent: 0,
      failed: 0,
      skipped: 1,
    });
    expect(monthlyCashflow.findUnique).not.toHaveBeenCalled();
    expect(notificationLog.create).not.toHaveBeenCalled();
    expect(sendSmtpMail).not.toHaveBeenCalled();
  });

  it('applies only the derived type flag and defaults a missing settings row to enabled', async () => {
    user.findMany.mockResolvedValue([
      {
        id: BigInt(7),
        email: 'person@example.com',
        notificationSettings: { monthly_reminder: true, monthly_summary: false },
      },
      {
        id: BigInt(8),
        email: 'other@example.com',
        notificationSettings: null,
      },
    ]);
    notificationLog.create
      .mockResolvedValueOnce({
        id: BigInt(11), user_id: BigInt(7), month: '2026-07', type: 'REMINDER',
        sent_at: null, status: 'PENDING', claimed_at: new Date(), attempt_count: 1,
      })
      .mockResolvedValueOnce({
        id: BigInt(12), user_id: BigInt(8), month: '2026-07', type: 'REMINDER',
        sent_at: null, status: 'PENDING', claimed_at: new Date(), attempt_count: 1,
      });
    notificationLog.update.mockResolvedValue({});

    await expect(sendMonthlyNotifications()).resolves.toEqual({
      sent: 2,
      failed: 0,
      skipped: 0,
    });
    expect(sendSmtpMail).toHaveBeenCalledTimes(2);
    expect(user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        notificationSettings: {
          select: { monthly_reminder: true, monthly_summary: true },
        },
      },
    });
  });

  it('defaults a missing settings row to an enabled summary', async () => {
    user.findMany.mockResolvedValue([{
      id: BigInt(7),
      email: 'person@example.com',
      notificationSettings: null,
    }]);
    monthlyCashflow.findUnique.mockResolvedValue({
      income: '100',
      total_expense: '50',
      net_cashflow: '50',
    });
    notificationLog.create.mockResolvedValue({
      id: BigInt(11), user_id: BigInt(7), month: '2026-07', type: 'SUMMARY',
      sent_at: null, status: 'PENDING', claimed_at: new Date(), attempt_count: 1,
    });
    notificationLog.update.mockResolvedValue({});

    await expect(sendMonthlyNotifications()).resolves.toEqual({
      sent: 1,
      failed: 0,
      skipped: 0,
    });
    expect(notificationLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'SUMMARY' }),
    }));
    expect(investment.findUnique).toHaveBeenCalledTimes(2);
    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the preference projection cannot be loaded', async () => {
    user.findMany.mockRejectedValue(new Error('database unavailable'));

    await expect(sendMonthlyNotifications()).rejects.toThrow('database unavailable');
    expect(notificationLog.create).not.toHaveBeenCalled();
    expect(sendSmtpMail).not.toHaveBeenCalled();
  });

  it('skips delivery when another run already claimed the same user, month, and type', async () => {
    notificationLog.create.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

    await expect(sendMonthlyNotifications()).resolves.toEqual({
      sent: 0,
      failed: 0,
      skipped: 1,
    });
    expect(sendSmtpMail).not.toHaveBeenCalled();
    expect(user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        email: true,
        notificationSettings: {
          select: { monthly_reminder: true, monthly_summary: true },
        },
      },
    });
  });

  it('releases a failed claim so a later scheduler retry can deliver', async () => {
    notificationLog.create.mockResolvedValue({
      id: BigInt(11), user_id: BigInt(7), month: '2026-07', type: 'REMINDER', sent_at: null,
      status: 'PENDING', claimed_at: new Date(), attempt_count: 1,
    });
    jest.mocked(sendSmtpMail).mockRejectedValue(new Error('SMTP unavailable'));
    notificationLog.update.mockResolvedValue({});
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await sendMonthlyNotifications();

    expect(result).toEqual({ sent: 0, failed: 1, skipped: 0 });
    expect(notificationLog.update).toHaveBeenCalledWith({
      where: { id: BigInt(11) }, data: { status: 'FAILED' },
    });
    expect(consoleError).toHaveBeenCalledWith(
      'Notification email delivery failed',
      { code: 'UNCLASSIFIED' },
    );
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('person@example.com'));
    consoleError.mockRestore();
  });

  it('reclaims an abandoned pending delivery after its lease expires', async () => {
    notificationLog.updateMany.mockResolvedValue({ count: 1 });
    notificationLog.findUnique.mockResolvedValue({
      id: BigInt(12), user_id: BigInt(7), month: '2026-07', type: 'REMINDER', sent_at: null,
      status: 'PENDING', claimed_at: new Date(), attempt_count: 2,
    });
    notificationLog.update.mockResolvedValue({});

    const result = await sendMonthlyNotifications();

    expect(result).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
    expect(notificationLog.update).toHaveBeenCalledWith({
      where: { id: BigInt(12) },
      data: { status: 'SENT', sent_at: expect.any(Date) },
    });
  });
});
