import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { encryptDeterministic } from '../src/lib/encryption';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('='); if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    process.env[key] ??= line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

const prisma = new PrismaClient();
async function main() {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error('SUPERADMIN_EMAIL is required');
  const result = await prisma.user.updateMany({ where: { email: encryptDeterministic(email) }, data: { role: 'SUPERADMIN' } });
  if (result.count !== 1) throw new Error('No existing user matched SUPERADMIN_EMAIL');
  process.stdout.write('Existing user promoted to SUPERADMIN.\n');
}
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : 'Promotion failed'}\n`); process.exitCode = 1; }).finally(() => prisma.$disconnect());
