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

export interface GlobalSmtpInput {
  host: string; port: number; user: string; password?: string; from: string;
}

function validateInput(input: GlobalSmtpInput): void {
  if (!input.host?.trim() || !input.from?.trim()) throw new Error('Host and from address are required');
  const host = input.host.trim().toLowerCase();
  if (host.length > 255 || !/^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i.test(host)) throw new Error('Host must be a valid SMTP hostname');
  const allowedHosts = (process.env.SMTP_ALLOWED_HOSTS || 'smtp.hostinger.com').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!allowedHosts.includes(host)) throw new Error('SMTP host is not allowed');
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65535) throw new Error('Port must be an integer between 1 and 65535');
  if (input.user && input.user.trim().length > 320) throw new Error('Username is too long');
  if (input.password && input.password.length > 512) throw new Error('Password is too long');
  if (input.from.trim().length > 255) throw new Error('From address is too long');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.from)) throw new Error('From address must be a valid email');
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

export async function getGlobalSmtpStatus() {
  const row = await prisma.applicationSmtpSettings.findUnique({ where: { id: GLOBAL_SMTP_ID } });
  if (!row) return { configured: false, host: '', port: 465, username: '', fromAddress: '' };
  const username = decrypt(row.smtp_user);
  const [name, domain] = username.split('@');
  const masked = domain ? `${name.slice(0, 1)}***@${domain}` : '***';
  return { configured: true, host: row.host, port: row.port, username: masked, fromAddress: row.from_email };
}

export async function saveGlobalSmtpSettings(input: GlobalSmtpInput): Promise<void> {
  validateInput(input);
  const existing = await prisma.applicationSmtpSettings.findUnique({ where: { id: GLOBAL_SMTP_ID } });
  if (!existing && (!input.user?.trim() || !input.password)) throw new Error('Username and password are required for initial SMTP configuration');
  const common = { host: input.host.trim(), port: input.port, secure: input.port === 465, from_email: input.from.trim() };
  if (existing) {
    await prisma.applicationSmtpSettings.update({ where: { id: GLOBAL_SMTP_ID }, data: { ...common, ...(input.user?.trim() ? { smtp_user: encrypt(input.user.trim()) } : {}), ...(input.password ? { smtp_pass: encrypt(input.password) } : {}) } });
  } else {
    await prisma.applicationSmtpSettings.create({ data: { id: GLOBAL_SMTP_ID, ...common, smtp_user: encrypt(input.user.trim()), smtp_pass: encrypt(input.password!) } });
  }
}

function transporter(settings: SmtpSettings) {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465,
    requireTLS: settings.port !== 465,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user: settings.user, pass: settings.pass },
  });
}

export async function verifyGlobalSmtp(): Promise<void> {
  const settings = await getSmtpSettings();
  if (!settings) throw new Error('SMTP is not configured');
  await transporter(settings).verify();
}

export async function sendSmtpMail(content: { to: string; subject: string; html: string }): Promise<void> {
  const settings = await getSmtpSettings();
  if (!settings) throw new Error('Global SMTP configuration is not initialized');
  await transporter(settings).sendMail({
    from: settings.from_email,
    ...content,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}
