const applicationSmtpSettings = { findUnique: jest.fn(), upsert: jest.fn() };
const sendMail = jest.fn();
const createTransport = jest.fn(() => ({ sendMail }));
jest.mock('@/lib/prisma', () => ({ prisma: { applicationSmtpSettings } }));
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport } }));
jest.mock('@/lib/encryption', () => ({
  encrypt: (value: string) => `encrypted:${value}`,
  decrypt: (value: string) => value.replace('encrypted:', ''),
}));

import { getSmtpSettings, importSmtpSettingsFromEnvironment, readSmtpEnvironment, sendSmtpMail } from './smtp.service';

describe('global SMTP settings', () => {
  beforeEach(() => jest.clearAllMocks());

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
});
