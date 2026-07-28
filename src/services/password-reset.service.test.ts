const user = { findUnique: jest.fn(), update: jest.fn() };
const passwordResetToken = { updateMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() };
const transaction = jest.fn(async (callback: (tx: unknown) => unknown) => callback({ user, passwordResetToken }));
jest.mock('@/lib/prisma', () => ({ prisma: { user, passwordResetToken, $transaction: transaction } }));
jest.mock('@/lib/encryption', () => ({ encryptDeterministic: (value: string) => `email:${value}`, decrypt: (value: string) => value }));
jest.mock('./smtp.service', () => ({ sendSmtpMail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('bcrypt', () => ({ __esModule: true, default: { hash: jest.fn().mockResolvedValue('hashed-password') } }));

import crypto from 'crypto';
import { requestPasswordReset, resetPassword } from './password-reset.service';
import { sendSmtpMail } from './smtp.service';

describe('password reset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the same response for existing and unknown accounts', async () => {
    user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: BigInt(7), email: 'person@example.com' });
    passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    passwordResetToken.create.mockResolvedValue({});
    const unknown = await requestPasswordReset('unknown@example.com', 'https://app.example.com');
    const existing = await requestPasswordReset('person@example.com', 'https://app.example.com');
    expect(unknown).toEqual(existing);
    expect(sendSmtpMail).toHaveBeenCalledTimes(1);
  });

  it('stores only a SHA-256 hash of a 32-byte random token and invalidates older tokens', async () => {
    user.findUnique.mockResolvedValue({ id: BigInt(7), email: 'person@example.com' });
    passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    passwordResetToken.create.mockResolvedValue({});
    await requestPasswordReset('person@example.com', 'https://app.example.com');
    const created = passwordResetToken.create.mock.calls[0][0].data;
    expect(created.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.active_user_id).toBe(BigInt(7));
    expect(created.expires_at.getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);
    expect(passwordResetToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ user_id: BigInt(7), used_at: null }) }));
    const sentHtml = jest.mocked(sendSmtpMail).mock.calls[0][0].html;
    const resetUrl = sentHtml.match(/href="([^"]+)"/)![1].replaceAll('&amp;', '&');
    const raw = new URL(resetUrl).searchParams.get('token')!;
    expect(Buffer.from(raw, 'base64url')).toHaveLength(32);
    expect(created.token_hash).toBe(crypto.createHash('sha256').update(raw).digest('hex'));
    expect(sentHtml).not.toContain(created.token_hash);
  });

  it('keeps the generic response when SMTP delivery fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    user.findUnique.mockResolvedValue({ id: BigInt(7), email: 'person@example.com' });
    passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    passwordResetToken.create.mockResolvedValue({});
    jest.mocked(sendSmtpMail).mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(requestPasswordReset('person@example.com', 'https://app.example.com')).resolves.toEqual({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent.',
    });
    expect(consoleError).toHaveBeenCalledWith('Password reset email delivery failed');
    consoleError.mockRestore();
  });

  it('rejects weak passwords without consuming a token', async () => {
    await expect(resetPassword('token', 'short')).resolves.toEqual(expect.objectContaining({ success: false }));
    expect(passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an over-limit password before consuming a reset token or hashing', async () => {
    await expect(resetPassword('token', 'a'.repeat(73))).resolves.toEqual({
      success: false,
      error: 'Password must be 72 UTF-8 bytes or fewer',
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(passwordResetToken.findUnique).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
    expect(jest.requireMock('bcrypt').default.hash).not.toHaveBeenCalled();
  });

  it('consumes a valid token once and updates the password atomically', async () => {
    passwordResetToken.findUnique.mockResolvedValue({ id: BigInt(9), user_id: BigInt(7), used_at: null, expires_at: new Date(Date.now() + 60_000) });
    user.update.mockResolvedValue({});
    passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    await expect(resetPassword('raw-token', 'new-password')).resolves.toEqual({ success: true });
    expect(user.update).toHaveBeenCalledWith({
      where: { id: BigInt(7) },
      data: { password_hash: 'hashed-password', session_version: { increment: 1 } },
    });
    expect(passwordResetToken.updateMany).toHaveBeenCalledWith({ where: { id: BigInt(9), used_at: null }, data: { used_at: expect.any(Date), active_user_id: null } });
  });

  it('rejects expired or already-used tokens', async () => {
    passwordResetToken.findUnique.mockResolvedValueOnce({ used_at: null, expires_at: new Date(Date.now() - 1) }).mockResolvedValueOnce({ used_at: new Date(), expires_at: new Date(Date.now() + 60_000) });
    await expect(resetPassword('expired', 'new-password')).resolves.toEqual({ success: false, error: 'Invalid or expired reset token' });
    await expect(resetPassword('used', 'new-password')).resolves.toEqual({ success: false, error: 'Invalid or expired reset token' });
  });
});
