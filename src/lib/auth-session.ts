import { prisma } from '@/lib/prisma';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  tokenVersion: number | undefined,
): Promise<boolean> {
  if (!userId || !UUID_PATTERN.test(userId) || !Number.isInteger(tokenVersion)) return false;

  const user = await prisma.user.findUnique({
    where: { public_id: userId },
    select: { id: true, public_id: true, session_version: true },
  });
  return user?.session_version === tokenVersion;
}
