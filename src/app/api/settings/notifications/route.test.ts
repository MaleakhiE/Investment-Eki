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
