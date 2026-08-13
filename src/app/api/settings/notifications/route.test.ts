jest.mock('@/lib/auth', () => ({ getCurrentUserId: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ prisma: { notificationSettings: { findUnique: jest.fn(), create: jest.fn(), upsert: jest.fn() } } }));
jest.mock('@/lib/encryption', () => ({ encryptNumber: jest.fn(() => 'encrypted'), decryptNumber: jest.fn(() => 0) }));
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GET, POST } from './route';
const findUnique = jest.mocked(prisma.notificationSettings.findUnique); const upsert = jest.mocked(prisma.notificationSettings.upsert);
beforeEach(() => { jest.clearAllMocks(); jest.mocked(getCurrentUserId).mockResolvedValue(BigInt(7)); });
describe('notification settings error privacy', () => {
  it('keeps GET failures private', async () => {
    findUnique.mockRejectedValue(new Error('private notification settings')); const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await GET();
    expect(response.status).toBe(500); expect(log).toHaveBeenCalledWith('Error getting notification settings:', { code: 'UNCLASSIFIED' });
    expect(log.mock.calls.flat().join(' ')).not.toContain('private notification settings'); log.mockRestore();
  });
  it('keeps POST failures private while preserving a safe code', async () => {
    upsert.mockRejectedValue({ code: 'P2034', message: 'private alert threshold details' }); const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await POST(new Request('http://localhost/api/settings/notifications', { method: 'POST', body: JSON.stringify({ monthly_summary: true }) }) as never);
    expect(response.status).toBe(500); expect(log).toHaveBeenCalledWith('Error updating notification settings:', { code: 'P2034' });
    expect(log.mock.calls.flat().join(' ')).not.toContain('private alert threshold details'); log.mockRestore();
  });
});

describe('notification settings input validation', () => {
  const post = (body: string) => POST(new Request('http://localhost/api/settings/notifications', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
  }) as never);

  it.each([
    ['malformed JSON', '{'],
    ['non-object JSON', '[]'],
    ['boolean with wrong type', JSON.stringify({ monthly_summary: 'yes' })],
    ['reminder day with wrong type', JSON.stringify({ monthly_reminder_day: '1' })],
    ['non-integer reminder day', JSON.stringify({ monthly_reminder_day: 1.5 })],
    ['out-of-range reminder day', JSON.stringify({ monthly_reminder_day: 29 })],
    ['non-finite threshold', JSON.stringify({ low_balance_threshold: null })],
    ['threshold with wrong type', JSON.stringify({ low_balance_threshold: '100' })],
    ['negative threshold', JSON.stringify({ low_balance_threshold: -1 })],
    ['malformed custom alert', JSON.stringify({ custom_alerts: [{ threshold: 10 }] })],
  ])('rejects %s before persistence', async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('accepts a valid finite threshold and custom alert', async () => {
    upsert.mockResolvedValue({
      monthly_reminder: true,
      monthly_reminder_day: 15,
      monthly_summary: true,
      low_balance_alert: true,
      low_balance_threshold: 'encrypted',
      custom_alerts: '[]',
    } as never);

    const response = await post(JSON.stringify({
      monthly_reminder_day: 15,
      low_balance_threshold: 1000.5,
      custom_alerts: [{ id: 'a', name: 'Rent', type: 'expense_limit', threshold: 1000, enabled: true }],
    }));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
