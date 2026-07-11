import { PrismaClient } from '@prisma/client';
import { encrypt } from '../src/lib/encryption';
import fs from 'fs';
import path from 'path';

function loadLocalEnvironment(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
    process.env[key] ??= value;
  }
}

loadLocalEnvironment();

const prisma = new PrismaClient();
const value = (primary: string, alias: string) => process.env[primary]?.trim() || process.env[alias]?.trim();

async function main() {
  const host = value('SMTP_HOST', 'MAIL_HOST');
  const portText = value('SMTP_PORT', 'MAIL_PORT');
  const user = value('SMTP_USER', 'MAIL_USERNAME');
  const password = value('SMTP_PASS', 'MAIL_PASSWORD');
  const fromEmail = value('SMTP_FROM', 'MAIL_FROM_ADDRESS');
  const required = { SMTP_HOST: host, SMTP_PORT: portText, SMTP_USER: user, SMTP_PASS: password, SMTP_FROM: fromEmail };
  const missing = Object.entries(required).filter(([, candidate]) => !candidate).map(([name]) => name);
  if (missing.length) throw new Error(`Missing SMTP environment variables: ${missing.join(', ')}`);
  if (!/^\d+$/.test(portText!)) throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  const port = Number(portText);
  if (port < 1 || port > 65535) throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  const requestsImplicitTls = process.env.SMTP_SECURE === 'true' || process.env.MAIL_ENCRYPTION?.toLowerCase() === 'ssl';
  if (requestsImplicitTls && port !== 465) throw new Error('Implicit TLS requires SMTP_PORT 465');
  const secure = port === 465;
  const data = { host: host!, port, secure, smtp_user: encrypt(user!), smtp_pass: encrypt(password!), from_email: fromEmail! };
  await prisma.applicationSmtpSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  process.stdout.write('Global SMTP configuration imported successfully.\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'SMTP import failed'}\n`);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
