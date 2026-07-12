const applicationSmtpSettings = { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), create: jest.fn() };
const sendMail = jest.fn();
const verify = jest.fn();
const createTransport = jest.fn(() => ({ sendMail, verify }));
jest.mock('@/lib/prisma', () => ({ prisma: { applicationSmtpSettings } }));
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport } }));
jest.mock('@/lib/encryption', () => ({
  encrypt: (value: string) => `encrypted:${value}`,
  decrypt: (value: string) => value.replace('encrypted:', ''),
}));

import { getGlobalSmtpStatus, getSmtpSettings, importSmtpSettingsFromEnvironment, readSmtpEnvironment, saveGlobalSmtpSettings, sendSmtpMail, verifyGlobalSmtp } from './smtp.service';

describe('global SMTP settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SMTP_ALLOWED_HOSTS = 'smtp.example.com,smtp.hostinger.com';
  });

  it('stores one encrypted singleton from environment variables', async () => {
    applicationSmtpSettings.upsert.mockResolvedValue({});
    await importSmtpSettingsFromEnvironment({
      SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465', SMTP_USER: 'mailer@example.com',
      SMTP_PASS: 'secret', SMTP_FROM: 'mailer@example.com',
    });
    expect(applicationSmtpSettings.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      update: expect.objectContaining({ smtp_user: 'encrypted:mailer@example.com', smtp_pass: 'encrypted:secret' }),
      create: expect.objectContaining({ id: 1, smtp_user: 'encrypted:mailer@example.com', smtp_pass: 'encrypted:secret' }),
    });
  });

  it('rejects incomplete environment configuration', async () => {
    await expect(importSmtpSettingsFromEnvironment({ SMTP_HOST: 'smtp.example.com' })).rejects.toThrow('SMTP_PORT');
    expect(applicationSmtpSettings.upsert).not.toHaveBeenCalled();
  });

  it('accepts Laravel MAIL aliases and maps ssl to implicit TLS', () => {
    expect(readSmtpEnvironment({
      MAIL_HOST: 'smtp.example.com', MAIL_PORT: '465', MAIL_USERNAME: 'mailer@example.com',
      MAIL_PASSWORD: 'secret', MAIL_FROM_ADDRESS: 'mailer@example.com', MAIL_ENCRYPTION: 'ssl',
    })).toEqual(expect.objectContaining({ port: 465, secure: true }));
  });

  it('reads and decrypts only the global singleton', async () => {
    applicationSmtpSettings.findUnique.mockResolvedValue({
      host: 'smtp.example.com', port: 465, secure: true, smtp_user: 'encrypted:user', smtp_pass: 'encrypted:pass', from_email: 'from@example.com',
    });
    await expect(getSmtpSettings()).resolves.toEqual({
      host: 'smtp.example.com', port: 465, secure: true, user: 'user', pass: 'pass', from_email: 'from@example.com',
    });
    expect(applicationSmtpSettings.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('requires STARTTLS on every non-465 SMTP connection', async () => {
    applicationSmtpSettings.findUnique.mockResolvedValue({
      host: 'smtp.example.com', port: 587, secure: false, smtp_user: 'encrypted:user', smtp_pass: 'encrypted:pass', from_email: 'from@example.com',
    });
    sendMail.mockResolvedValue({});
    await sendSmtpMail({ to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 587, secure: false, requireTLS: true }));
  });

  it('returns a masked username and never returns encrypted credentials', async () => {
    applicationSmtpSettings.findUnique.mockResolvedValue({ host: 'smtp.example.com', port: 465, smtp_user: 'encrypted:person@example.com', smtp_pass: 'encrypted:secret', from_email: 'from@example.com' });
    await expect(getGlobalSmtpStatus()).resolves.toEqual({ configured: true, host: 'smtp.example.com', port: 465, username: 'p***@example.com', fromAddress: 'from@example.com' });
  });

  it('encrypts credentials and preserves the password when an update omits it', async () => {
    applicationSmtpSettings.findUnique.mockResolvedValue({ id: 1, smtp_user: 'encrypted:existing@example.com' });
    applicationSmtpSettings.update.mockResolvedValue({});
    await saveGlobalSmtpSettings({ host: 'smtp.example.com', port: 587, user: 'person@example.com', from: 'from@example.com' });
    expect(applicationSmtpSettings.update).toHaveBeenCalledWith({ where: { id: 1 }, data: expect.not.objectContaining({ smtp_pass: expect.anything() }) });
  });

  it('preserves the username when an update omits it', async () => {
    applicationSmtpSettings.findUnique.mockResolvedValue({ id: 1, smtp_user: 'encrypted:existing@example.com' });
    applicationSmtpSettings.update.mockResolvedValue({});
    await saveGlobalSmtpSettings({ host: 'smtp.example.com', port: 465, user: '', from: 'from@example.com' });
    expect(applicationSmtpSettings.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.not.objectContaining({ smtp_user: expect.anything() }),
    });
  });

  it('verifies the stored transport with implicit TLS on port 465', async () => {
    applicationSmtpSettings.findUnique.mockResolvedValue({ host: 'smtp.example.com', port: 465, secure: true, smtp_user: 'encrypted:user', smtp_pass: 'encrypted:pass', from_email: 'from@example.com' });
    verify.mockResolvedValue(undefined);
    await verifyGlobalSmtp();
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ port: 465, secure: true, requireTLS: false }));
    expect(verify).toHaveBeenCalled();
  });
});
