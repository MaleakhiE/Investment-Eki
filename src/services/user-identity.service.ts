import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';

interface PublicIdentityUser {
  id: bigint;
  public_id: string | null;
}

interface UserIdentityRepository {
  updateMany(args: {
    where: { id: bigint; public_id: null };
    data: { public_id: string };
  }): Promise<{ count: number }>;
  findUnique(args: {
    where: { id: bigint };
    select: { public_id: true };
  }): Promise<{ public_id: string | null } | null>;
}

/** Ensures rollout-era users created without the new column receive a UUID v4. */
export async function ensureUserPublicId(
  user: PublicIdentityUser,
  repository: UserIdentityRepository = prisma.user,
): Promise<string> {
  if (user.public_id) return user.public_id;

  const candidate = randomUUID();
  const claimed = await repository.updateMany({
    where: { id: user.id, public_id: null },
    data: { public_id: candidate },
  });
  if (claimed.count === 1) return candidate;

  const current = await repository.findUnique({
    where: { id: user.id },
    select: { public_id: true },
  });
  if (!current?.public_id) throw new Error('Unable to assign public user identity');
  return current.public_id;
}
