/**
 * SMTP Settings Service
 * 
 * Provides SMTP configuration management including:
 * - Get/save SMTP settings
 * - Test SMTP connection
 * - Encrypt sensitive data (password)
 */

import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import nodemailer from 'nodemailer';

export interface SmtpSettingsInput {
  host: string;
  port: string;
  user: string;
  pass: string;
  from_email: string;
}

export interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  pass: string;
  from_email: string;
}

/**
 * Validate SMTP settings input
 */
export function validateSmtpInput(input: SmtpSettingsInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.host || input.host.trim().length === 0) {
    errors.push('SMTP host is required');
  }

  if (!input.port || !/^\d+$/.test(input.port)) {
    errors.push('SMTP port must be a valid number');
  }

  if (!input.user || input.user.trim().length === 0) {
    errors.push('SMTP user is required');
  }

  if (!input.pass || input.pass.trim().length === 0) {
    errors.push('SMTP password is required');
  }

  if (!input.from_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.from_email)) {
    errors.push('Valid from email is required');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get SMTP settings for a user
 * Falls back to environment variables if no user settings exist
 */
export async function getSmtpSettings(userId: bigint): Promise<SmtpSettings | null> {
  // First check user-specific settings
  const userSettings = await prisma.smtpSettings.findUnique({
    where: { user_id: userId },
  });

  if (userSettings) {
    return {
      host: userSettings.host,
      port: userSettings.port,
      user: decrypt(userSettings.smtp_user),
      pass: decrypt(userSettings.smtp_pass),
      from_email: userSettings.from_email,
    };
  }

  // Fall back to environment variables
  const envHost = process.env.SMTP_HOST;
  const envPort = process.env.SMTP_PORT;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envFrom = process.env.SMTP_FROM || envUser;

  if (envHost && envPort && envUser && envPass) {
    return {
      host: envHost,
      port: envPort,
      user: envUser,
      pass: envPass,
      from_email: envFrom || '',
    };
  }

  return null;
}

/**
 * Get SMTP settings for display (password masked)
 */
export async function getSmtpSettingsForDisplay(userId: bigint): Promise<{
  host: string;
  port: string;
  user: string;
  pass_masked: string;
  from_email: string;
  source: 'user' | 'env' | 'none';
} | null> {
  // First check user-specific settings
  const userSettings = await prisma.smtpSettings.findUnique({
    where: { user_id: userId },
  });

  if (userSettings) {
    return {
      host: userSettings.host,
      port: userSettings.port,
      user: decrypt(userSettings.smtp_user),
      pass_masked: '••••••••',
      from_email: userSettings.from_email,
      source: 'user',
    };
  }

  // Fall back to environment variables
  const envHost = process.env.SMTP_HOST;
  const envPort = process.env.SMTP_PORT;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envFrom = process.env.SMTP_FROM || envUser;

  if (envHost && envPort && envUser && envPass) {
    return {
      host: envHost,
      port: envPort,
      user: envUser,
      pass_masked: '••••••••',
      from_email: envFrom || '',
      source: 'env',
    };
  }

  return null;
}

/**
 * Save SMTP settings for a user
 */
export async function saveSmtpSettings(
  userId: bigint,
  input: SmtpSettingsInput
): Promise<{ success: boolean; error?: string }> {
  const validation = validateSmtpInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  // Encrypt sensitive data
  const encryptedUser = encrypt(input.user.trim());
  const encryptedPass = encrypt(input.pass.trim());

  await prisma.smtpSettings.upsert({
    where: { user_id: userId },
    update: {
      host: input.host.trim(),
      port: input.port.trim(),
      smtp_user: encryptedUser,
      smtp_pass: encryptedPass,
      from_email: input.from_email.trim(),
    },
    create: {
      user_id: userId,
      host: input.host.trim(),
      port: input.port.trim(),
      smtp_user: encryptedUser,
      smtp_pass: encryptedPass,
      from_email: input.from_email.trim(),
    },
  });

  return { success: true };
}

/**
 * Delete user SMTP settings (revert to env)
 */
export async function deleteSmtpSettings(userId: bigint): Promise<{ success: boolean }> {
  await prisma.smtpSettings.deleteMany({
    where: { user_id: userId },
  });

  return { success: true };
}

/**
 * Test SMTP connection
 */
export async function testSmtpConnection(
  settings: SmtpSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: parseInt(settings.port),
      secure: parseInt(settings.port) === 465,
      auth: {
        user: settings.user,
        pass: settings.pass,
      },
    });

    await transporter.verify();
    return { success: true };
  } catch (error) {
    console.error('SMTP test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection failed' 
    };
  }
}
