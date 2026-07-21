import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic } from '@/lib/encryption';
import { validateEmail, validatePassword } from '@/lib/validation';
import { sendSmtpMail } from './smtp.service';

const RESET_TTL_MS = 30 * 60 * 1000;
export const PASSWORD_RESET_REQUESTED_MESSAGE = 'If an account exists for that email, a reset link has been sent.';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requestPasswordReset(email: string, applicationUrl: string): Promise<{ success: true; message: string }> {
  const generic = { success: true as const, message: PASSWORD_RESET_REQUESTED_MESSAGE };
  if (!validateEmail(email).valid) return generic;
  const normalizedEmail = email.toLowerCase().trim();
  const account = await prisma.user.findUnique({ where: { email: encryptDeterministic(normalizedEmail) } });
  if (!account) return generic;

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { user_id: account.id, used_at: null }, data: { used_at: new Date(), active_user_id: null } });
    await tx.passwordResetToken.create({ data: { user_id: account.id, active_user_id: account.id, token_hash: hashToken(rawToken), expires_at: expiresAt } });
  });

  const resetUrl = new URL('/reset-password', applicationUrl);
  resetUrl.searchParams.set('token', rawToken);
  try {
    await sendSmtpMail({
      to: normalizedEmail,
      subject: 'Reset your password',
      html: `<p>A password reset was requested for your account.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
    });
  } catch {
    // Keep the public response indistinguishable from an unknown account while
    // still leaving an operational signal that contains no address or token.
    console.error('Password reset email delivery failed');
  }
  return generic;
}

export async function resetPassword(token: string, password: string): Promise<{ success: boolean; error?: string }> {
  const validation = validatePassword(password);
  if (!validation.valid) return { success: false, error: validation.errors[0] };
  if (!token) return { success: false, error: 'Invalid or expired reset token' };

  return prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({ where: { token_hash: hashToken(token) } });
    if (!record || record.used_at || record.expires_at.getTime() <= Date.now()) {
      return { success: false, error: 'Invalid or expired reset token' };
    }
    const consumed = await tx.passwordResetToken.updateMany({ where: { id: record.id, used_at: null }, data: { used_at: new Date(), active_user_id: null } });
    if (consumed.count !== 1) return { success: false, error: 'Invalid or expired reset token' };
    await tx.user.update({
      where: { id: record.user_id },
      data: {
        password_hash: await bcrypt.hash(password, 10),
        session_version: { increment: 1 },
      },
    });
    return { success: true };
  });
}
