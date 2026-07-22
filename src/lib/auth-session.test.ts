const user = { findUnique: jest.fn() };
jest.mock('@/lib/prisma', () => ({ prisma: { user } }));

import { isSessionVersionCurrent, resolveInternalUserId } from './auth-session';

const publicUserId = '3d594650-3436-4aa2-bb39-9fc9f5bc521d';

describe('session version validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a token only while its version matches the user record', async () => {
    user.findUnique.mockResolvedValue({ id: BigInt(7), public_id: publicUserId, session_version: 3 });
    await expect(isSessionVersionCurrent(publicUserId, 3)).resolves.toBe(true);
    await expect(isSessionVersionCurrent(publicUserId, 2)).resolves.toBe(false);
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { public_id: publicUserId },
      select: { id: true, public_id: true, session_version: true },
    });
  });

  it.each([
    ['', 1],
    ['not-an-id', 1],
    ['7', 1],
    [publicUserId, undefined],
  ])('rejects malformed token identity/version %s %s', async (id, version) => {
    await expect(isSessionVersionCurrent(id, version)).resolves.toBe(false);
  });

  it('rejects a token for a deleted user', async () => {
    user.findUnique.mockResolvedValue(null);
    await expect(isSessionVersionCurrent(publicUserId, 1)).resolves.toBe(false);
  });

  it('resolves a public UUID to the internal database ID', async () => {
    user.findUnique.mockResolvedValue({ id: BigInt(7) });
    await expect(resolveInternalUserId(publicUserId)).resolves.toBe(BigInt(7));
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { public_id: publicUserId },
      select: { id: true },
    });
  });
});
