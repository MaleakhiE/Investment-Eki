import { PrismaClient } from '@prisma/client';

// Build DATABASE_URL from individual env vars if not provided directly
function getDatabaseUrl(): string {
  // If DATABASE_URL is already set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Otherwise, build from individual components
  const type = process.env.DATABASE_TYPE || 'mysql';
  const username = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = process.env.DATABASE_PORT || '3306';
  const name = process.env.DATABASE_NAME;

  if (!username || !password || !name) {
    throw new Error(
      'Database configuration missing. Provide either DATABASE_URL or DATABASE_USERNAME, DATABASE_PASSWORD, and DATABASE_NAME'
    );
  }

  return `${type}://${username}:${password}@${host}:${port}/${name}`;
}

// Set DATABASE_URL for Prisma if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = getDatabaseUrl();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
