import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { decrypt, encrypt } from '@/lib/encryption';

const GLOBAL_SMTP_ID = 1;

export interface SmtpSettings {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  from_email: string;
}

type Environment = Record<string, string | undefined>;

function first(env: Environment, primary: string, alias: string): string | undefined {
  return env[primary]?.trim() || env[alias]?.trim();
}

export function readSmtpEnvironment(env: Environment = process.env): SmtpSettings {
  const values = {
    host: first(env, 'SMTP_HOST', 'MAIL_HOST'),
    port: first(env, 'SMTP_PORT', 'MAIL_PORT'),
    user: first(env, 'SMTP_USER', 'MAIL_USERNAME'),
    pass: first(env, 'SMTP_PASS', 'MAIL_PASSWORD'),
    from: first(env, 'SMTP_FROM', 'MAIL_FROM_ADDRESS'),
  };
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => ({ host: 'SMTP_HOST', port: 'SMTP_PORT', user: 'SMTP_USER', pass: 'SMTP_PASS', from: 'SMTP_FROM' }[key]));
  if (missing.length) throw new Error(`Missing SMTP environment variables: ${missing.join(', ')}`);
  if (!/^\d+$/.test(values.port!)) throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  const port = Number(values.port);
  if (port < 1 || port > 65535) throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  const encryption = env.MAIL_ENCRYPTION?.trim().toLowerCase();
  const requestsImplicitTls = env.SMTP_SECURE === 'true' || encryption === 'ssl';
  if (requestsImplicitTls && port !== 465) throw new Error('Implicit TLS requires SMTP_PORT 465');
  const secure = port === 465;
  return { host: values.host!, port, user: values.user!, pass: values.pass!, from_email: values.from!, secure };
}

export async function importSmtpSettingsFromEnvironment(env: Environment = process.env): Promise<void> {
  const settings = readSmtpEnvironment(env);
  const data = {
    host: settings.host, port: settings.port, secure: Boolean(settings.secure),
    smtp_user: encrypt(settings.user), smtp_pass: encrypt(settings.pass), from_email: settings.from_email,
  };
  await prisma.applicationSmtpSettings.upsert({ where: { id: GLOBAL_SMTP_ID }, update: data, create: { id: GLOBAL_SMTP_ID, ...data } });
}

export async function getSmtpSettings(): Promise<SmtpSettings | null> {
  const row = await prisma.applicationSmtpSettings.findUnique({ where: { id: GLOBAL_SMTP_ID } });
  return row ? { host: row.host, port: row.port, secure: row.secure, user: decrypt(row.smtp_user), pass: decrypt(row.smtp_pass), from_email: row.from_email } : null;
}

export async function sendSmtpMail(content: { to: string; subject: string; html: string }): Promise<void> {
  const settings = await getSmtpSettings();
  if (!settings) throw new Error('Global SMTP configuration is not initialized');
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    requireTLS: settings.port !== 465,
    auth: { user: settings.user, pass: settings.pass },
  });
  await transporter.sendMail({ from: settings.from_email, ...content });
}
