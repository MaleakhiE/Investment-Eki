import { prisma } from '@/lib/prisma';

export async function isSessionVersionCurrent(
  userId: string | undefined,
  tokenVersion: number | undefined,
): Promise<boolean> {
  if (!userId || !/^\d+$/.test(userId) || !Number.isInteger(tokenVersion)) return false;

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: { session_version: true },
  });
  return user?.session_version === tokenVersion;
}
