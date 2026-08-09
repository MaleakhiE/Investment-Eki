import { prisma } from '@/lib/prisma';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeSessionVersion(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const version = Number(value);
  return Number.isSafeInteger(version) && version > 0 ? version : null;
}

export async function resolveInternalUserId(publicUserId: string | undefined): Promise<bigint | null> {
  if (!publicUserId || !UUID_PATTERN.test(publicUserId)) return null;
  const user = await prisma.user.findUnique({
    where: { public_id: publicUserId },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function isSessionVersionCurrent(
  userId: string | undefined,
  tokenVersion: unknown,
): Promise<boolean> {
  const normalizedVersion = normalizeSessionVersion(tokenVersion);
  if (!userId || !UUID_PATTERN.test(userId) || normalizedVersion === null) return false;

  const user = await prisma.user.findUnique({
    where: { public_id: userId },
    select: { id: true, public_id: true, session_version: true },
  });
  return user?.session_version === normalizedVersion;
}
