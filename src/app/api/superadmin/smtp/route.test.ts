jest.mock('@/lib/auth', () => ({ requireSuperadmin: jest.fn() }));
jest.mock('@/services/smtp.service', () => ({ getGlobalSmtpStatus: jest.fn(), saveGlobalSmtpSettings: jest.fn() }));
import { NextRequest } from 'next/server';
import { requireSuperadmin } from '@/lib/auth';
import { getGlobalSmtpStatus, saveGlobalSmtpSettings } from '@/services/smtp.service';
import { GET, PUT } from './route';

describe('/api/superadmin/smtp', () => {
  beforeEach(() => jest.clearAllMocks());
  it.each([401, 403] as const)('returns %s when the authoritative guard denies access', async (status) => {
    jest.mocked(requireSuperadmin).mockResolvedValue({ status });
    expect((await GET()).status).toBe(status);
    expect(getGlobalSmtpStatus).not.toHaveBeenCalled();
  });
  it('returns only masked status to a superadmin', async () => {
    jest.mocked(requireSuperadmin).mockResolvedValue({ userId: BigInt(1) });
    jest.mocked(getGlobalSmtpStatus).mockResolvedValue({ configured: true, host: 'smtp.example.com', port: 465, username: 'p***@example.com', fromAddress: 'from@example.com' });
    const body = await (await GET()).json();
    expect(body.responseDetails).toEqual({ configured: true, host: 'smtp.example.com', port: 465, username: 'p***@example.com', fromAddress: 'from@example.com' });
    expect(JSON.stringify(body)).not.toContain('password');
  });
  it('maps the frontend contract into the global SMTP service', async () => {
    jest.mocked(requireSuperadmin).mockResolvedValue({ userId: BigInt(1) });
    jest.mocked(saveGlobalSmtpSettings).mockResolvedValue();
    jest.mocked(getGlobalSmtpStatus).mockResolvedValue({ configured: true, host: 'smtp.example.com', port: 465, username: 'p***@example.com', fromAddress: 'from@example.com' });
    const request = new NextRequest('http://localhost/api/superadmin/smtp', { method: 'PUT', headers: { origin: 'http://localhost', 'x-requested-with': 'XMLHttpRequest' }, body: JSON.stringify({ host: 'smtp.example.com', port: 465, username: 'person@example.com', fromAddress: 'from@example.com', password: 'secret' }) });
    expect((await PUT(request)).status).toBe(200);
    expect(saveGlobalSmtpSettings).toHaveBeenCalledWith({ host: 'smtp.example.com', port: 465, user: 'person@example.com', from: 'from@example.com', password: 'secret' });
  });
});
